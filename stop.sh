#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_COMPOSE_DIR="$SCRIPT_DIR/docker"

echo "🛑 Stopping Whitespace services..."
cd "$DOCKER_COMPOSE_DIR"
docker-compose -f docker-compose.dev.yml down

echo "✓ Services stopped"
