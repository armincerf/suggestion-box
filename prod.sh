#!/bin/bash

# Exit on error
set -e

# Make scripts executable
chmod +x log-forwarder.ts

# Check for zero-cache process and stop it gracefully
echo "Checking for existing zero-cache processes..."
if pgrep -f "bun run dev:zero-cache" > /dev/null; then
  echo "Found existing zero-cache process. Stopping it gracefully..."
  pkill -TERM -f "bun run dev:zero-cache" || true
  # Give it a moment to shut down
  sleep 2
fi

# Start Docker services in the background
echo "Starting Docker services (Postgres)..."
docker compose up -d postgres

# Wait for Postgres to be ready
echo "Waiting for Postgres to be healthy..."
until docker compose ps postgres | grep -q "(healthy)"
do
  echo "Waiting for Postgres..."
  sleep 2
done

# Run zero-cache locally with logging
echo "Starting zero-cache locally..."
bun run log-forwarder.ts zero-cache -- bun run dev:zero-cache &
ZERO_CACHE_PID=$!

# Build and preview the frontend
echo "Building and starting the frontend..."
bun run log-forwarder.ts frontend -- bash -c "VITE_PUBLIC_SERVER='https://zero.agileapp3000.com' bunx vite build && bun dev:ui:preview" &
FRONTEND_PID=$!

# Handle script termination
cleanup() {
  echo "Shutting down services..."
  kill -TERM $ZERO_CACHE_PID 2>/dev/null || true
  kill -TERM $FRONTEND_PID 2>/dev/null || true
  docker compose down
  exit 0
}

# Set up trap to ensure clean shutdown
trap cleanup SIGINT SIGTERM

# Wait for processes to finish
echo "All services running. Press Ctrl+C to stop."
wait $ZERO_CACHE_PID $FRONTEND_PID 