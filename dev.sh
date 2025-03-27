#!/bin/bash

# Exit on error
set -e

# Make scripts executable
chmod +x log-forwarder.ts

# Check for zero-cache process and stop it gracefully
echo "Checking for existing zero-cache processes on default port..."
if pgrep -f "bun run dev:zero-cache" > /dev/null && ! pgrep -f "bun run dev:zero-cache.*4848" > /dev/null; then
  echo "Found existing zero-cache process. Stopping it gracefully..."
  pkill -TERM -f "bun run dev:zero-cache" || true
  # Give it a moment to shut down
  sleep 2
fi

# Create a temporary docker-compose override file for development
cat > docker-compose.dev.yml << EOL
services:
  postgres-dev:
    extends:
      service: postgres
      file: docker-compose.yml
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: user
      POSTGRES_DB: postgres_dev
      POSTGRES_PASSWORD: password
    volumes:
      - zstart_solid_pgdata_dev:/var/lib/postgresql/data
      - ./docker:/docker-entrypoint-initdb.d

volumes:
  zstart_solid_pgdata_dev:
    driver: local
EOL

# Start Docker services in the background with the development override
echo "Starting dedicated Postgres instance for development..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres-dev

# Wait a bit for services to initialize
echo "Waiting for services to initialize..."
sleep 5

# Apply schema changes to the database
echo "Applying schema changes to the development database..."
DATABASE_URL="postgresql://user:password@localhost:5432/postgres_dev" bun run db:push

# Reset and seed the database with test data
echo "Resetting and seeding development database with test data..."
DATABASE_URL="postgresql://user:password@localhost:5432/postgres_dev" bun run db:seed

# Run zero-cache locally with logging (on default port, not 4848)
echo "Starting zero-cache for development..."
ZERO_UPSTREAM_DB="postgresql://user:password@localhost:5432/postgres_dev" \
ZERO_AUTH_SECRET="suggestion-box-development-secret-key" \
ZERO_REPLICA_FILE="/tmp/zstart_solid_dev_replica.db" \
bun run log-forwarder.ts zero-cache-dev -- bun run dev:zero-cache &
ZERO_CACHE_PID=$!

# Start Drizzle Studio in the background
echo "Starting Drizzle Studio in the background..."
DATABASE_URL="postgresql://user:password@localhost:5432/postgres_dev" bun run db:studio &
DRIZZLE_STUDIO_PID=$!

# Start the frontend in development mode
echo "Starting frontend in development mode..."
VITE_PUBLIC_SERVER='http://localhost:3000' bun run dev:ui &
FRONTEND_PID=$!

# Handle script termination
cleanup() {
  echo "Shutting down development services..."
  kill -TERM $ZERO_CACHE_PID 2>/dev/null || true
  kill -TERM $DRIZZLE_STUDIO_PID 2>/dev/null || true
  kill -TERM $FRONTEND_PID 2>/dev/null || true
  docker compose -f docker-compose.yml -f docker-compose.dev.yml down
  rm docker-compose.dev.yml
  exit 0
}

# Set up trap to ensure clean shutdown
trap cleanup SIGINT SIGTERM

# Wait for processes to finish
echo "All development services running. Press Ctrl+C to stop."
wait $ZERO_CACHE_PID $DRIZZLE_STUDIO_PID $FRONTEND_PID 