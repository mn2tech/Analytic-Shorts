#!/usr/bin/env bash
# Start the backend if not already running on port 5000.
# Usage: ./start-or-check.sh   (from backend/ or project root)
#        ./start-or-check.sh --check-only   (only check, don't start)

set -e
PORT=${PORT:-5000}
CHECK_ONLY=false
for arg in "$@"; do
  [ "$arg" = "--check-only" ] && CHECK_ONLY=true
done

# Resolve backend dir (script may be run from project root or backend/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

check() {
  if command -v curl &>/dev/null; then
    if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/api/health" 2>/dev/null | grep -q 200; then
      echo "Backend is running on port ${PORT} (health check OK)."
      return 0
    fi
  fi
  if command -v ss &>/dev/null; then
    if ss -tlnp 2>/dev/null | grep -q ":${PORT} "; then
      echo "Backend appears to be listening on port ${PORT} (no health check)."
      return 0
    fi
  elif command -v lsof &>/dev/null; then
    if lsof -i ":${PORT}" 2>/dev/null | grep -q LISTEN; then
      echo "Backend appears to be listening on port ${PORT} (no health check)."
      return 0
    fi
  fi
  return 1
}

if check; then
  exit 0
fi

if [ "$CHECK_ONLY" = true ]; then
  echo "Backend is not running on port ${PORT}."
  exit 1
fi

echo "Starting backend on port ${PORT}..."
node server.js
