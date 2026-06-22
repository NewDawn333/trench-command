#!/bin/bash
# Starts the Trench Command dev server and opens it in your default browser.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

PORT=5174
URL="http://localhost:${PORT}"

if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display alert "Node.js required" message "Install Node.js from https://nodejs.org then try again."'
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  osascript -e 'display alert "npm required" message "Node.js should include npm. Reinstall Node from https://nodejs.org"'
  exit 1
fi

if [ ! -f package.json ]; then
  osascript -e 'display alert "Wrong folder" message "Could not find trench-command package.json."'
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "First launch — installing dependencies..."
  npm install
fi

echo ""
echo "  Trench Command"
echo "  Starting at ${URL}"
echo "  Keep this window open while playing."
echo "  Press Ctrl+C to quit."
echo ""

(
  for _ in $(seq 1 40); do
    if curl -fsS "$URL" >/dev/null 2>&1; then
      open "$URL"
      exit 0
    fi
    sleep 0.25
  done
  open "$URL"
) &

exec npm run dev
