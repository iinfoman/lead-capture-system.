#!/usr/bin/env bash
#
# Builds the app against a mock Supabase and drives the customer journey in a
# real browser. Needs no network and no Supabase project.
#
# Usage:  npm run test:e2e
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MOCK_PORT=4180
APP_PORT=4173
MOCK_PID=""
APP_PID=""

cleanup() {
  [ -n "$MOCK_PID" ] && kill "$MOCK_PID" 2>/dev/null || true
  [ -n "$APP_PID" ] && kill "$APP_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Playwright ships with the image on some hosts and via npm on others.
PW_ENTRY=""
for candidate in \
  "$ROOT/node_modules/playwright/index.mjs" \
  "/opt/node22/lib/node_modules/playwright/index.mjs"; do
  [ -f "$candidate" ] && PW_ENTRY="$candidate" && break
done
if [ -z "$PW_ENTRY" ]; then
  echo "playwright not found — install it with: npm i -D playwright" >&2
  exit 1
fi
export PW_ENTRY

CHROME=""
for candidate in /opt/pw-browsers/chromium-*/chrome-linux/chrome; do
  [ -x "$candidate" ] && CHROME="$candidate" && break
done
export CHROME

echo "==> building against the mock backend"
VITE_SUPABASE_URL="http://127.0.0.1:$MOCK_PORT" \
VITE_SUPABASE_ANON_KEY="test-anon-key" \
  npm run build >/dev/null

echo "==> starting mock backend"
node "$ROOT/e2e/mock-supabase.mjs" >/dev/null 2>&1 &
MOCK_PID=$!

echo "==> serving the build"
node "$ROOT/e2e/static-server.mjs" "$ROOT/dist" "$APP_PORT" >/dev/null 2>&1 &
APP_PID=$!

# Wait for both to answer rather than guessing with a fixed sleep.
for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:$APP_PORT/" >/dev/null 2>&1 \
     && curl -sf "http://127.0.0.1:$MOCK_PORT/__problems" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

echo "==> running the browser test"
node "$ROOT/e2e/landing.test.mjs"
