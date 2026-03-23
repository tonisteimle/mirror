#!/bin/bash
# Mirror IDE - Development Script
# Starts HTTP server + Tauri dev mode

# Save script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIRROR_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Add cargo to PATH
export PATH="$HOME/.cargo/bin:$PATH"

# Kill any existing http-server on port 5500
lsof -ti:5500 | xargs kill -9 2>/dev/null

# Start HTTP server in background (serves from Mirror root)
echo "[Dev] Starting HTTP server on port 5500..."
echo "[Dev] Serving from: $MIRROR_DIR"
cd "$MIRROR_DIR"
npx http-server . -p 5500 -c-1 --silent &
HTTP_PID=$!

# Cleanup on exit
trap "kill $HTTP_PID 2>/dev/null" EXIT

# Wait for server to start
sleep 2

# Start Tauri dev
echo "[Dev] Starting Tauri dev mode..."
cd "$SCRIPT_DIR"
npm run dev
