import argparse
import io
import json
import sys
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import slo_budget  # noqa: E402
from slo_budget import BudgetReport, Verdict, parse_duration  # noqa: E402

DAY = 86400


class BudgetReportTest(unittest.TestCase):
    def report(self, total, errors, elapsed_days=30, objective=0.999):
        return BudgetReport(objective, total, errors, 30 * DAY, elapsed_days * DAY)

    def test_untouched_budget_is_healthy(self):
        r = self.report(total=1_000_000, errors=0)
        self.assertEqual(r.budget_remaining, 1.0)
        self.assertEqual(r.burn_rate, 0.0)
        self.assertIs(r.verdict, Verdict.HEALTHY)

    def test_half_budget_spent_at_end_of_window(self):
        r = self.report(total=1_000_000, errors=500)
        self.assertAlmostEqual(r.budget_remaining, 0.5)
        self.assertAlmostEqual(r.burn_rate, 0.5)
        self.assertAlmostEqual(r.availability, 0.9995)
        self.assertIs(r.verdict, Verdict.HEALTHY)

    def test_spending_faster_than_linear_is_at_risk(self):
        # 60% of the budget gone after a third of the window: 1.8x burn.
        r = self.report(total=1_000_000, errors=600, elapsed_days=10)
        self.assertAlmostEqual(r.burn_rate, 1.8)
        self.assertIs(r.verdict, Verdict.AT_RISK)

    def test_overspent_budget_is_exhausted(self):
        r = self.report(total=1_000_000, errors=1_200)
        self.assertLess(r.budget_remaining, 0)
        self.assertIs(r.verdict, Verdict.EXHAUSTED)

    def test_no_traffic_is_fully_available(self):
        r = self.report(total=0, errors=0)
        self.assertEqual(r.availability, 1.0)
        self.assertEqual(r.budget_remaining, 1.0)


class ParseDurationTest(unittest.TestCase):
    def test_valid_units(self):
        self.assertEqual(parse_duration("30d"), 30 * DAY)
        self.assertEqual(parse_duration("6h"), 6 * 3600)
        self.assertEqual(parse_duration("4w"), 28 * DAY)

    def test_invalid_values(self):
        for bad in ("", "30", "d", "1y", "0h", "-1d"):
            with self.subTest(bad=bad), self.assertRaises(argparse.ArgumentTypeError):
                parse_duration(bad)


class CliTest(unittest.TestCase):
    def run_cli(self, total, errors, *extra):
        def fake_query(_base, promql, timeout=10.0):
            return errors if 'status=~"5.."' in promql else total

        out = io.StringIO()
        with mock.patch.object(slo_budget, "prom_query", side_effect=fake_query), redirect_stdout(out):
            code = slo_budget.main(["--prometheus", "http://prom", "--service", "orders-api", *extra])
        return code, out.getvalue()

    def test_exhausted_budget_fails_the_gate(self):
        code, out = self.run_cli(1_000_000, 5_000)
        self.assertEqual(code, 1)
        self.assertIn("exhausted", out)

    def test_json_output(self):
        code, out = self.run_cli(1_000_000, 100, "--json", "--elapsed", "15d")
        self.assertEqual(code, 0)
        payload = json.loads(out)
        self.assertEqual(payload["verdict"], "healthy")
        self.assertAlmostEqual(payload["burn_rate"], 0.2)


if __name__ == "__main__":
    unittest.main()
