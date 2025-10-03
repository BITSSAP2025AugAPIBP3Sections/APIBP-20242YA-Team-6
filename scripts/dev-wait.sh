#!/usr/bin/env bash
set -euo pipefail

# Simple wait-for-Postgres (or any TCP host:port) utility.
# Usage: ./scripts/dev-wait.sh host:port [timeoutSeconds]
# Exits non‑zero if timeout reached.

TARGET=${1:-}
TIMEOUT=${2:-25}

if [[ -z "$TARGET" ]]; then
  echo "Usage: $0 host:port [timeoutSeconds]" >&2
  exit 1
fi

HOST=${TARGET%:*}
PORT=${TARGET##*:}

echo "[dev-wait] Waiting for $HOST:$PORT (timeout ${TIMEOUT}s)..." >&2
START=$(date +%s)
while true; do
  if (echo >/dev/tcp/$HOST/$PORT) &>/dev/null; then
    echo "[dev-wait] $HOST:$PORT is up" >&2
    exit 0
  fi
  NOW=$(date +%s)
  if (( NOW-START > TIMEOUT )); then
    echo "[dev-wait] Timeout waiting for $HOST:$PORT" >&2
    exit 2
  fi
  sleep 1
done
