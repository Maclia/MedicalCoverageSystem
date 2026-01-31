#!/bin/bash
# Docker Compose build script with sequential builds
# This script prevents RPC EOF errors on Windows by forcing sequential builds
# Issue: Docker daemon runs out of resources when building 10+ services in parallel

set -e

echo "Building Docker Compose services sequentially..."
echo "This prevents RPC EOF errors on resource-constrained systems"
echo ""

docker compose up -d --build --parallel 1

echo ""
echo "Build complete! Checking service status..."
docker compose ps
