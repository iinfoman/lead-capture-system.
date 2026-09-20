#!/usr/bin/env bash
# Captures screenshots of every screen against the preview mock, so the design
# and flow can be reviewed without deploying anything.
#
#   npm run preview:shots      # writes to preview/
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MOCK_PID=""; APP_PID=""
cleanup() { [ -n "$MOCK_PID" ] && kill "$MOCK_PID" 2>/dev/null || true
            [ -n "$APP_PID" ] && kill "$APP_PID" 2>/dev/null || true; }
trap cleanup EXIT

for c in "$ROOT/node_modules/playwright/index.mjs" /opt/node22/lib/node_modules/playwright/index.mjs; do
  [ -f "$c" ] && export PW_ENTRY="$c" && break
done
for c in /opt/pw-browsers/chromium-*/chrome-linux/chrome; do
  [ -x "$c" ] && export CHROME="$c" && break
done

echo "==> building against the preview mock"
VITE_SUPABASE_URL=http://127.0.0.1:4190 VITE_SUPABASE_ANON_KEY=preview-key npm run build >/dev/null

echo "==> starting mock + static server"
node "$ROOT/e2e/preview-mock.mjs" >/dev/null 2>&1 & MOCK_PID=$!
node "$ROOT/e2e/static-server.mjs" "$ROOT/dist" 4174 >/dev/null 2>&1 & APP_PID=$!

for _ in $(seq 1 40); do
  curl -sf http://127.0.0.1:4174/ >/dev/null 2>&1 && break
  sleep 0.25
done

mkdir -p preview
echo "==> capturing"
node "$ROOT/e2e/screenshots.mjs"
