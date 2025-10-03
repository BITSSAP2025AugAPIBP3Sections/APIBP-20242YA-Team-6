#!/usr/bin/env bash
set -euo pipefail

# Full developer environment launcher:
# 1. Starts infra containers (databases, messaging)
# 2. Launches all services in hot-reload / dev mode on the host
# 3. Waits until health endpoints are up
# 4. Writes PIDs to .dev-pids for later teardown (make stop-dev)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# All known service ports (keep in sync with health script if changed)
ALL_PORTS=(8080 8001 8002 8003 8004 8005 8006)

# Collect service status lines: name|port|status
SUMMARY=()

# Basic ANSI colors (enabled if stderr is a TTY or FORCE_COLOR=1, unless NO_COLOR set)
if { [ -t 2 ] || [ "${FORCE_COLOR:-0}" = "1" ]; } && [ -z "${NO_COLOR:-}" ]; then
  C_RESET=$'\033[0m'
  C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m'
  C_RED=$'\033[31m'
  C_BLUE=$'\033[34m'
  C_DIM=$'\033[2m'
else
  C_RESET=''
  C_GREEN=''
  C_YELLOW=''
  C_RED=''
  C_BLUE=''
  C_DIM=''
fi

# Allow limiting services: env SERVICES="gateway,auth" (case-insensitive names matching below keys)
RAW_SERVICES=${SERVICES:-}
if [ -n "$RAW_SERVICES" ]; then
  # normalize: lowercase, remove spaces, collapse multiple commas
  RAW_SERVICES=$(echo "$RAW_SERVICES" | tr 'A-Z' 'a-z' | tr -d ' ' | sed -e 's/,,*/,/g' -e 's/^,//' -e 's/,$//')
  SERVICES_SET=,$RAW_SERVICES,
else
  SERVICES_SET= # empty means all
fi

want() { # want <name>
  local n=$1
  if [ -z "$SERVICES_SET" ]; then return 0; fi
  case $SERVICES_SET in
    *,$n,*) return 0 ;;
  esac
  return 1
}

# Optionally kill existing listeners on a port before starting (KILL_PORTS=1)
maybe_free_port() {
  local port=$1
  if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    if [ "${KILL_PORTS:-0}" = "1" ]; then
      echo "[dev-all] KILL_PORTS=1 -> terminating existing process on :$port" >&2
      # capture pid(s) and kill
      lsof -tiTCP:"$port" -sTCP:LISTEN | xargs -r kill 2>/dev/null || true
      # small wait for release
      for _ in 1 2 3; do
        if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then sleep 0.3; else break; fi
      done
    fi
  fi
}
PID_FILE=".dev-pids"
rm -f "$PID_FILE"

echo '[dev-all] Starting infrastructure containers...' >&2
docker compose up -d nats kafka auth-db events-db vendors-db tasks-db attendees-db

if [ "${CLEAN_PORTS:-0}" = "1" ]; then
  echo '[dev-all] CLEAN_PORTS=1 -> killing any existing processes on service ports' >&2
  for p in "${ALL_PORTS[@]}"; do
    lsof -tiTCP:"$p" -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null || true
  done
fi

echo '[dev-all] Launching Node services in dev mode...' >&2

start_node() {
  local ws_path=$1
  local name=$2
  if [ -d "$ws_path" ]; then
    # Port mapping by name
    local port=""
    case $name in
      gateway) port=8080 ;;
      auth) port=8001 ;;
      events) port=8002 ;;
      vendors) port=8003 ;;
      tasks) port=8004 ;;
      attendees) port=8005 ;;
      notifications) port=8006 ;;
    esac
    if [ -n "$port" ]; then
      maybe_free_port "$port"
      if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
        echo "[dev-all] Skipping $name: port $port still in use (recording occupant)." >&2
        # record occupant pid(s) so stop-dev can terminate if desired
        lsof -tiTCP:"$port" -sTCP:LISTEN | while read -r opid; do echo "$opid:existing-$name" >> "$PID_FILE"; done
        SUMMARY+=("$name|$port|skipped-port-in-use")
        return 0
      fi
    fi
    ( npm run dev -w "$ws_path" 2>&1 | sed -e "s/^/[${name}] /" ) &
    local pid=$!
    echo "$pid:$name" >> "$PID_FILE"
    SUMMARY+=("$name|$port|started")
  else
    echo "[dev-all] Skip $name (missing path)" >&2
    SUMMARY+=("$name|?|missing-path")
  fi
}

if want gateway; then start_node gateway gateway; else SUMMARY+=("gateway|8080|unselected"); fi
if want auth; then start_node services/auth auth; else SUMMARY+=("auth|8001|unselected"); fi
if want notifications; then start_node services/notifications notifications; else SUMMARY+=("notifications|8006|unselected"); fi
if want tasks; then start_node services/tasks tasks; else SUMMARY+=("tasks|8004|unselected"); fi
if want attendees; then start_node services/attendees attendees; else SUMMARY+=("attendees|8005|unselected"); fi

echo '[dev-all] Launching Python (FastAPI) services with auto-reload...' >&2

start_py() {
  local svc=$1
  local port=$2
  local dir="services/$svc"
  if [ -d "$dir" ]; then
    maybe_free_port "$port"
    if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "[dev-all] Skipping $svc: port $port still in use (recording occupant)." >&2
      lsof -tiTCP:"$port" -sTCP:LISTEN | while read -r opid; do echo "$opid:existing-$svc" >> "$PID_FILE"; done
      SUMMARY+=("$svc|$port|skipped-port-in-use")
      return 0
    fi
    (
      cd "$dir"
      if [ ! -d .venv ]; then
        python3 -m venv .venv
      fi
      # shellcheck disable=SC1091
      source .venv/bin/activate
      if [ -f requirements.txt ]; then pip install -q -r requirements.txt; fi
      echo "[dev-all:$svc] starting uvicorn on :$port" >&2
      uvicorn src.main:app --host 0.0.0.0 --port "$port" --reload 2>&1 | sed -e "s/^/[${svc}] /"
    ) &
    local pid=$!
    echo "$pid:$svc" >> "$PID_FILE"
    SUMMARY+=("$svc|$port|started")
  else
    echo "[dev-all] Skip $svc (missing directory)" >&2
    SUMMARY+=("$svc|$port|missing-path")
  fi
}

if want events; then start_py events 8002; else SUMMARY+=("events|8002|unselected"); fi
if want vendors; then start_py vendors 8003; else SUMMARY+=("vendors|8003|unselected"); fi

cleanup() {
  echo '[dev-all] Caught signal, stopping dev processes...' >&2
  if [ -f "$PID_FILE" ]; then
    # Reverse lines portable (no tac on macOS by default)
    awk ' { a[NR]=$0 } END { for (i=NR;i>0;i--) print a[i] }' "$PID_FILE" | cut -d: -f1 | xargs -r kill 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
  exit 0
}
trap cleanup INT TERM

echo '[dev-all] Waiting for service health endpoints...' >&2

wait_health() {
  local port=$1
  local attempts=40
  local i=0
  while (( i < attempts )); do
    if curl -sf "http://localhost:$port/health" >/dev/null; then
      echo "[dev-all] port $port up" >&2
      return 0
    fi
    sleep 1
    ((i++))
  done
  echo "[dev-all] WARNING: port $port did not become healthy in time" >&2
  return 1
}

overall_ok=0
for p in "${ALL_PORTS[@]}"; do
  # Skip waiting if service not requested in subset mode
  if [ -n "$RAW_SERVICES" ]; then
    case $p in
      8080) want gateway || continue ;;
      8001) want auth || continue ;;
      8002) want events || continue ;;
      8003) want vendors || continue ;;
      8004) want tasks || continue ;;
      8005) want attendees || continue ;;
      8006) want notifications || continue ;;
    esac
  fi
  wait_health "$p" || overall_ok=1
done

if [ $overall_ok -eq 0 ]; then
  echo '[dev-all] All health endpoints responded (or optional services skipped).' >&2
else
  echo '[dev-all] Some endpoints failed to report healthy; check logs above.' >&2
fi

# Print summary table
echo >&2
echo '[dev-all] Service startup summary:' >&2
printf '%-15s %-6s %-22s\n' 'Service' 'Port' 'Status' >&2
printf '%-15s %-6s %-22s\n' '-------' '----' '------' >&2
for line in "${SUMMARY[@]}"; do
  name=${line%%|*}; rest=${line#*|}; port=${rest%%|*}; status=${rest#*|}
  color="$C_RESET"
  case $status in
    started) color=$C_GREEN ;;
    skipped-port-in-use) color=$C_YELLOW ;;
    missing-path) color=$C_RED ;;
    unselected) color=$C_DIM ;;
  esac
  printf '%-15s %-6s %s%-22s%s\n' "$name" "$port" "$color" "$status" "$C_RESET" >&2
done
echo >&2
echo '[dev-all] Legend: started | unselected (filtered by SERVICES) | skipped-port-in-use | missing-path' >&2
echo >&2

echo '[dev-all] Development environment is running. Press Ctrl+C to stop.' >&2
echo '[dev-all] To stop from another shell: make stop-dev' >&2

wait # wait on all background jobs (until interrupted)
