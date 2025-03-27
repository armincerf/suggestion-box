#!/bin/bash

# Exit on error
set -e

# Make scripts executable
chmod +x log-forwarder.ts

# Define common variables
PROD_AUTH_SECRET="suggestion-box-production-secret-key"
PROD_FRONTEND_PORT=5169
PROD_DB_URL="postgresql://user:password@localhost:5469/suggestion-box-prod"
PROD_ZERO_PORT=4848

# Check for zero-cache process and stop it gracefully
echo "Checking for existing zero-cache processes on port $PROD_ZERO_PORT..."
if pgrep -f "bun run dev:zero-cache.*$PROD_ZERO_PORT" > /dev/null; then
  echo "Found existing zero-cache process on port $PROD_ZERO_PORT. Stopping it gracefully..."
  pkill -TERM -f "bun run dev:zero-cache.*$PROD_ZERO_PORT" || true
  # Give it a moment to shut down
  sleep 2
fi

echo "Applying Drizzle migrations to production database..."
bun drizzle-kit push --config=drizzleprod.config.ts

# Run dedicated zero-cache for production on port 4848
echo "Starting dedicated zero-cache instance for production on port $PROD_ZERO_PORT..."
ZERO_UPSTREAM_DB="$PROD_DB_URL" \
ZERO_REPLICA_FILE="/tmp/zstart_solid_prod_replica.db" \
ZERO_PORT=$PROD_ZERO_PORT \
bun run log-forwarder.ts zero-cache-prod -- bun run dev:zero-cache &
ZERO_CACHE_PID=$!

# Build the frontend first
echo "Building the production frontend..."
VITE_PUBLIC_SERVER="http://localhost:$PROD_ZERO_PORT" \
VITE_ZERO_AUTH_SECRET="suggestion-box-secret-key" \
bun run build

# Then serve the frontend on port 5169
echo "Serving the production frontend on port $PROD_FRONTEND_PORT..."
bun run log-forwarder.ts frontend-prod -- bunx vite preview --port $PROD_FRONTEND_PORT &
FRONTEND_PID=$!

# Handle script termination
cleanup() {
  echo "Shutting down production services..."
  kill -TERM $ZERO_CACHE_PID 2>/dev/null || true
  kill -TERM $FRONTEND_PID 2>/dev/null || true
  docker compose -f docker-compose.yml -f docker-compose.prod.yml down
  rm docker-compose.prod.yml
  exit 0
}

# Set up trap to ensure clean shutdown
trap cleanup SIGINT SIGTERM

# Wait for processes to finish
echo "All production services running. Frontend at http://localhost:$PROD_FRONTEND_PORT, Zero-Cache at http://localhost:$PROD_ZERO_PORT. Press Ctrl+C to stop."
wait $ZERO_CACHE_PID $FRONTEND_PID 