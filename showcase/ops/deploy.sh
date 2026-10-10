#!/usr/bin/env bash
# Progressive, self-healing deploy of orders-api to Kubernetes.
#
#   ./deploy.sh <staging|production> <image-ref>
#
# Renders the kustomize overlay with the immutable image digest, runs a
# server-side dry run, applies, waits for the rollout and smoke-tests it.
# Any failure after apply triggers an automatic `kubectl rollout undo`.

set -Eeuo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
readonly K8S_DIR="${SCRIPT_DIR}/../deploy/k8s"
readonly APP="orders-api"
readonly ROLLOUT_TIMEOUT="${ROLLOUT_TIMEOUT:-300s}"

log() { printf '%s [%s] %s\n' "$(date -u +%FT%TZ)" "$1" "${*:2}" >&2; }
die() { log ERROR "$*"; exit 1; }

usage() {
  sed -n '2,8p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit 64
}

require() {
  local cmd
  for cmd in "$@"; do
    command -v "$cmd" >/dev/null 2>&1 || die "missing required tool: $cmd"
  done
}

namespace_for() {
  case "$1" in
    staging) echo "orders-staging" ;;
    production) echo "orders" ;;
    *) die "unknown environment '$1' (expected staging or production)" ;;
  esac
}

render() {
  local env="$1" image="$2" workdir
  workdir="$(mktemp -d)"
  # Copy so pinning the image never dirties the working tree.
  cp -R "${K8S_DIR}/." "$workdir"
  (cd "${workdir}/overlays/${env}" && kustomize edit set image "${APP}=${image}")
  kustomize build "${workdir}/overlays/${env}"
  rm -rf "$workdir"
}

smoke_test() {
  local ns="$1" port=18080 pf_pid status="" healthy=false
  kubectl -n "$ns" port-forward "svc/${APP}" "${port}:80" >/dev/null 2>&1 &
  pf_pid=$!

  for _ in {1..20}; do
    status="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${port}/readyz" || true)"
    if [[ "$status" == "200" ]]; then
      healthy=true
      break
    fi
    sleep 1
  done

  kill "$pf_pid" 2>/dev/null || true
  wait "$pf_pid" 2>/dev/null || true

  [[ "$healthy" == true ]] && return 0
  log ERROR "smoke test failed: /readyz returned '${status:-no response}'"
  return 1
}

main() {
  [[ $# -eq 2 ]] || usage
  local env="$1" image="$2" ns manifest
  [[ "$image" == *@sha256:* ]] || die "image must be pinned by digest (got '$image')"

  require kubectl kustomize curl
  ns="$(namespace_for "$env")"
  manifest="$(mktemp)"
  trap 'rm -f "$manifest"' EXIT

  log INFO "rendering ${env} overlay for ${image}"
  render "$env" "$image" >"$manifest"

  log INFO "server-side dry run"
  kubectl apply --server-side --dry-run=server -f "$manifest" >/dev/null

  log INFO "applying to namespace ${ns}"
  kubectl apply --server-side --field-manager=deploy-sh -f "$manifest"

  if kubectl -n "$ns" rollout status "deployment/${APP}" --timeout="$ROLLOUT_TIMEOUT" && smoke_test "$ns"; then
    log INFO "deploy succeeded"
    return 0
  fi

  log WARN "rollout unhealthy; rolling back"
  kubectl -n "$ns" rollout undo "deployment/${APP}"
  kubectl -n "$ns" rollout status "deployment/${APP}" --timeout="$ROLLOUT_TIMEOUT" ||
    die "rollback did not become healthy, page the on-call"
  die "deploy failed and was rolled back"
}

main "$@"
