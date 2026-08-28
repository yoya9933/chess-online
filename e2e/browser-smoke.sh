#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8787}"
BASE="http://127.0.0.1:${PORT}"
LOG="${RUNNER_TEMP:-/tmp}/chuhe-wrangler.log"
DESKTOP="${RUNNER_TEMP:-/tmp}/chuhe-desktop.html"
MOBILE="${RUNNER_TEMP:-/tmp}/chuhe-mobile.html"

npx wrangler dev --local --ip 127.0.0.1 --port "$PORT" >"$LOG" 2>&1 &
SERVER_PID=$!
cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

for _ in $(seq 1 40); do
  if curl -fsS "$BASE/" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done
curl -fsS "$BASE/" >/dev/null
curl -fsS "$BASE/manifest.webmanifest" | grep -q '楚河棋局'

BROWSER=""
for candidate in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$candidate" >/dev/null 2>&1; then
    BROWSER="$candidate"
    break
  fi
done
if [ -z "$BROWSER" ]; then
  echo "No supported Chrome/Chromium binary found" >&2
  exit 1
fi

COMMON_FLAGS=(
  --headless=new
  --no-sandbox
  --disable-gpu
  --disable-dev-shm-usage
  --virtual-time-budget=3000
)

"$BROWSER" "${COMMON_FLAGS[@]}" --window-size=1440,900 --dump-dom "$BASE/" >"$DESKTOP"
"$BROWSER" "${COMMON_FLAGS[@]}" --window-size=390,844 --dump-dom "$BASE/" >"$MOBILE"

for page in "$DESKTOP" "$MOBILE"; do
  grep -q 'id="join-form"' "$page"
  grep -q '楚河棋局' "$page"
  grep -q 'manifest.webmanifest' "$page"
  grep -q 'id="recent-games"' "$page"
done

printf 'Browser smoke passed with %s at desktop and mobile viewports.\n' "$BROWSER"
