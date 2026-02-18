#!/usr/bin/env bash
set -euo pipefail

# Start background job processor in the same deploy service.
python worker.py &
WORKER_PID=$!

cleanup() {
  kill "$WORKER_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

exec uvicorn api.main:app --host 0.0.0.0 --port "${PORT:-8000}"
