# Platform Engineering Showcase

Small, production-style reference implementations: one deployable service and the platform around it. Every piece is linted, tested, or schema-validated in [CI](../.github/workflows/ci.yml).

```text
showcase/
├── services/
│   ├── orders-api/        Go HTTP service + distroless Dockerfile
│   ├── edge-ratelimit/    Rust keyed token-bucket rate limiter
│   └── resilience-ts/     TypeScript retry/backoff + circuit breaker
├── deploy/
│   ├── k8s/               Kustomize base, staging & production overlays
│   └── observability/     Prometheus SLO burn-rate alerts
├── infra/terraform/       AWS VPC, EKS, ECR, GitHub OIDC, IRSA
├── ops/                   deploy.sh (auto-rollback), slo_budget.py
└── Makefile               `make ci` runs every check
```

## How the pieces fit

1. **Build.** `orders-api` compiles into an ~8 MB `distroless/static:nonroot` image for amd64 and arm64. The binary doubles as its own healthcheck because the image has no shell.
2. **Provision.** Terraform creates a three-AZ VPC and an EKS cluster with KMS-encrypted Secrets, IMDSv2-only nodes, and access entries instead of `aws-auth`. It also creates immutable ECR repositories and a GitHub OIDC role, so CI never holds long-lived AWS keys.
3. **Deploy.** `ops/deploy.sh` renders the Kustomize overlay with a digest-pinned image, runs a server-side dry run, applies, waits for the rollout, smoke-tests `/readyz`, and runs `kubectl rollout undo` on any failure.
4. **Run safely.** The pods run non-root with a read-only root filesystem, all capabilities dropped, a seccomp profile, and the `restricted` Pod Security level. A default-deny NetworkPolicy, a PDB, zone and host topology spread, and `maxUnavailable: 0` rollouts complete the picture.
5. **Drain gracefully.** On SIGTERM the service fails readiness first, waits for endpoints to update, then drains in-flight requests, so rolling deploys drop no traffic.
6. **Observe.** RED metrics feed multi-window burn-rate alerts for a 99.9% SLO. `slo_budget.py` turns the remaining error budget into a deploy gate: exit code 1 means freeze releases.

## Run the checks

```bash
cd showcase
make help          # list targets
make ci            # everything CI runs
make run           # build and run orders-api on :8080
```

```bash
curl -s -XPOST localhost:8080/v1/orders \
  -H 'Idempotency-Key: demo-1' \
  -d '{"customer_id":"c-1","items":[{"sku":"KB-01","quantity":2,"price_cents":4999}]}'
curl -s localhost:8080/metrics | grep http_requests_total
```

## Runbooks

| Alert                          | First steps                                                                                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OrdersApiErrorBudgetFastBurn` | Check the latest rollout (`kubectl -n orders rollout history deploy/orders-api`). If it lines up with a deploy, run `kubectl rollout undo` first and investigate afterwards. |
| `OrdersApiErrorBudgetSlowBurn` | Compare the 5xx ratio per route in Prometheus, check dependency latency, and open a ticket. No page.                                                                         |
| `OrdersApiHighLatency`         | Check HPA saturation (`kubectl -n orders get hpa`) and CPU throttling, then scale out or roll back.                                                                          |

> The AWS account IDs, bucket names and role ARNs are placeholders. Nothing here is applied to a real account.
