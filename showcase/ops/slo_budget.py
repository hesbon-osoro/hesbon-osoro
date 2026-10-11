#!/usr/bin/env python3
"""Error-budget report for a request-based availability SLO.

Queries Prometheus for good/total request counts over the SLO window and
prints how much error budget is left, the current burn rate, and a
release-gating verdict that CI can act on (exit code 1 = freeze deploys).

    python3 slo_budget.py --prometheus http://prometheus:9090 \\
        --service orders-api --objective 0.999 --window 30d
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.parse
import urllib.request
from dataclasses import dataclass
from enum import Enum

_DURATION = re.compile(r"^(\d+)([mhdw])$")
_SECONDS = {"m": 60, "h": 3600, "d": 86400, "w": 604800}


class Verdict(str, Enum):
    HEALTHY = "healthy"
    AT_RISK = "at-risk"
    EXHAUSTED = "exhausted"


@dataclass(frozen=True)
class BudgetReport:
    objective: float
    total: float
    errors: float
    window_seconds: int
    elapsed_seconds: int

    @property
    def allowed_errors(self) -> float:
        return self.total * (1 - self.objective)

    @property
    def availability(self) -> float:
        return 1.0 if self.total == 0 else 1 - self.errors / self.total

    @property
    def budget_remaining(self) -> float:
        """Fraction of the error budget left; negative once overspent."""
        if self.allowed_errors == 0:
            return 1.0 if self.errors == 0 else float("-inf")
        return 1 - self.errors / self.allowed_errors

    @property
    def burn_rate(self) -> float:
        """How fast the budget is being spent relative to an even spend.

        1.0 spends exactly the whole budget over the window; above 1.0 runs
        out early.
        """
        if self.elapsed_seconds == 0:
            return 0.0
        spent = 1 - self.budget_remaining
        expected = self.elapsed_seconds / self.window_seconds
        return spent / expected

    @property
    def verdict(self) -> Verdict:
        if self.budget_remaining <= 0:
            return Verdict.EXHAUSTED
        if self.burn_rate > 1:
            return Verdict.AT_RISK
        return Verdict.HEALTHY


def parse_duration(value: str) -> int:
    match = _DURATION.match(value.strip())
    if not match:
        raise argparse.ArgumentTypeError(f"invalid duration {value!r}, expected e.g. 30d, 6h, 4w")
    amount, unit = match.groups()
    seconds = int(amount) * _SECONDS[unit]
    if seconds == 0:
        raise argparse.ArgumentTypeError("duration must be positive")
    return seconds


def prom_query(base_url: str, promql: str, timeout: float = 10.0) -> float:
    url = f"{base_url.rstrip('/')}/api/v1/query?{urllib.parse.urlencode({'query': promql})}"
    with urllib.request.urlopen(url, timeout=timeout) as resp:  # noqa: S310 (URL is operator-supplied)
        payload = json.load(resp)
    if payload.get("status") != "success":
        raise RuntimeError(f"Prometheus error: {payload.get('error', 'unknown')}")
    result = payload["data"]["result"]
    return float(result[0]["value"][1]) if result else 0.0


def build_report(args: argparse.Namespace) -> BudgetReport:
    rng = f"{args.elapsed_seconds}s"
    selector = f'route=~"/v1/.*",service="{args.service}"'
    total = prom_query(args.prometheus, f"sum(increase(http_requests_total{{{selector}}}[{rng}]))")
    errors = prom_query(
        args.prometheus, f'sum(increase(http_requests_total{{{selector},status=~"5.."}}[{rng}]))'
    )
    return BudgetReport(
        objective=args.objective,
        total=total,
        errors=errors,
        window_seconds=args.window,
        elapsed_seconds=args.elapsed_seconds,
    )


def render(report: BudgetReport, service: str) -> str:
    return "\n".join(
        [
            f"SLO report for {service}",
            f"  objective         {report.objective:.3%}",
            f"  availability      {report.availability:.4%}",
            f"  requests          {report.total:,.0f} ({report.errors:,.0f} errors)",
            f"  budget remaining  {report.budget_remaining:.1%}",
            f"  burn rate         {report.burn_rate:.2f}x",
            f"  verdict           {report.verdict.value}",
        ]
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--prometheus", required=True, help="Prometheus base URL")
    parser.add_argument("--service", required=True)
    parser.add_argument("--objective", type=float, default=0.999)
    parser.add_argument("--window", type=parse_duration, default="30d", help="SLO window (default 30d)")
    parser.add_argument(
        "--elapsed",
        dest="elapsed_seconds",
        type=parse_duration,
        help="How much of the window has elapsed (defaults to the full window)",
    )
    parser.add_argument("--json", action="store_true", help="Emit machine-readable output")
    args = parser.parse_args(argv)

    if not 0 < args.objective < 1:
        parser.error("--objective must be between 0 and 1, e.g. 0.999")
    args.elapsed_seconds = min(args.elapsed_seconds or args.window, args.window)

    report = build_report(args)
    if args.json:
        print(
            json.dumps(
                {
                    "service": args.service,
                    "availability": report.availability,
                    "budget_remaining": report.budget_remaining,
                    "burn_rate": report.burn_rate,
                    "verdict": report.verdict.value,
                }
            )
        )
    else:
        print(render(report, args.service))
    return 1 if report.verdict is Verdict.EXHAUSTED else 0


if __name__ == "__main__":
    sys.exit(main())
