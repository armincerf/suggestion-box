#!/bin/bash

# Exit on error
set -e

# Start Docker services in the background
echo "Starting Docker services (Postgres and Zero-Cache)..."
docker compose up -d

# Wait a bit for services to initialize
echo "Waiting for services to initialize..."
sleep 5

# Build and preview the frontend
echo "Building and starting the frontend..."
VITE_PUBLIC_SERVER='https://zero.agileapp3000.com' bunx vite build && bun dev:ui:preview

# Handle script termination
cleanup() {
  echo "Shutting down services..."
  docker compose down
  exit 0
}

# Set up trap to ensure clean shutdown
trap cleanup SIGINT SIGTERM

# Wait for the frontend process to finish
wait $! 