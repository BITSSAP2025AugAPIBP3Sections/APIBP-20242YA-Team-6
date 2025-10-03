#!/usr/bin/env bash
set -euo pipefail

ALL_PORTS=(8080 8001 8002 8003 8004 8005 8006)

# Optional subset via SERVICES env (same names as dev-all.sh expects)
RAW_SERVICES=${SERVICES:-}
if [ -n "$RAW_SERVICES" ]; then
  RAW_SERVICES=$(echo "$RAW_SERVICES" | tr 'A-Z' 'a-z' | tr -d ' ' | sed -e 's/,,*/,/g' -e 's/^,//' -e 's/,$//')
  SERVICES_SET=,$RAW_SERVICES,
else
  SERVICES_SET=
fi

want() {
  local n=$1
  if [ -z "$SERVICES_SET" ]; then return 0; fi
  case $SERVICES_SET in
    *,$n,*) return 0 ;;
  esac
  return 1
}
fail=0
echo "[test-health] Checking /health endpoints" >&2
for p in "${ALL_PORTS[@]}"; do
  svc=""
  case $p in
    8080) svc=gateway ;;
    8001) svc=auth ;;
    8002) svc=events ;;
    8003) svc=vendors ;;
    8004) svc=tasks ;;
    8005) svc=attendees ;;
    8006) svc=notifications ;;
  esac
  if [ -n "$SERVICES_SET" ] && ! want "$svc"; then
    continue
  fi
  code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$p/health || true)
  if [[ "$code" != "200" ]]; then
    echo "[test-health] FAIL port $p code=$code" >&2
    fail=1
  else
    echo "[test-health] OK   port $p ($svc)" >&2
  fi
done

if [[ $fail -ne 0 ]]; then
  echo "[test-health] One or more services unhealthy" >&2
  exit 1
fi
echo "[test-health] All healthy" >&2
