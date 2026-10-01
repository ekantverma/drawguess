#!/usr/bin/env bash
# Browser end-to-end tests. Starts the production builds of both apps, drives real Chromium sessions
# (3-4 independent browser contexts), then shuts everything down.
#
# Prereqs:  npm run build           (from repo root)
#           pip install playwright && playwright install chromium
# Usage:    bash e2e/run.sh            # runs all suites
#           bash e2e/run.sh gameplay   # one suite: gameplay | moderation_and_resilience | tools_and_settings
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SUITES=("${@:-gameplay moderation_and_resilience tools_and_settings}")
read -r -a SUITES <<< "${SUITES[*]}"

(cd "$ROOT/apps/server" && PORT=4000 CLIENT_ORIGIN=http://localhost:3000 node dist/index.js > "$ROOT/e2e/server.log" 2>&1) &
SP=$!
(cd "$ROOT/apps/web" && npx next start -p 3000 > "$ROOT/e2e/web.log" 2>&1) &
WP=$!
trap 'kill $SP $WP 2>/dev/null' EXIT
for _ in $(seq 1 60); do
  curl -s localhost:3000 -o /dev/null && curl -s localhost:4000/health -o /dev/null && break
  sleep 0.5
done

status=0
for s in "${SUITES[@]}"; do
  echo "=== $s ==="
  python3 "$ROOT/e2e/$s.py" || status=1
done
exit $status
