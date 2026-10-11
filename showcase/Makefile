# One entry point for every showcase check. CI runs `make ci`.

SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help
MAKEFLAGS += --no-print-directory

IMAGE   ?= ghcr.io/hesbon-osoro/orders-api
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
K8S_VER ?= 1.30.0

.PHONY: help
help: ## List targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

.PHONY: ci
ci: go-test rust-test ts-test py-test k8s-validate tf-validate shell-lint ## Run every check

.PHONY: go-test
go-test: ## gofmt, vet and race-test the Go service
	cd services/orders-api && test -z "$$(gofmt -l .)" && go vet ./... && go test -race -count=1 -cover ./...

.PHONY: rust-test
rust-test: ## rustfmt, clippy (pedantic) and test the Rust crate
	cd services/edge-ratelimit && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test

.PHONY: ts-test
ts-test: ## Type-check and test the TypeScript module
	cd services/resilience-ts && npm ci --no-audit --no-fund && npm run typecheck && npm test

.PHONY: py-test
py-test: ## Unit-test the Python SLO tool
	cd ops && python3 -m unittest discover -s tests

.PHONY: k8s-validate
k8s-validate: ## Render every overlay and validate against Kubernetes schemas
	@for overlay in deploy/k8s/overlays/*/; do \
	  echo "→ $$overlay"; \
	  kustomize build "$$overlay" | kubeconform -strict -summary -kubernetes-version $(K8S_VER) -; \
	done

.PHONY: tf-validate
tf-validate: ## terraform fmt + validate (no backend, no credentials needed)
	terraform fmt -check -recursive infra/terraform
	cd infra/terraform/envs/production && terraform init -backend=false -input=false && terraform validate

.PHONY: shell-lint
shell-lint: ## shellcheck every script
	shellcheck --severity=style ops/*.sh

.PHONY: image
image: ## Build a multi-arch orders-api image
	docker buildx build --platform linux/amd64,linux/arm64 \
	  --build-arg VERSION=$(VERSION) -t $(IMAGE):$(VERSION) services/orders-api

.PHONY: run
run: ## Run orders-api locally on :8080
	docker build -t orders-api:dev services/orders-api
	docker run --rm -p 8080:8080 orders-api:dev
