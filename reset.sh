#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_COMPOSE_DIR="$SCRIPT_DIR/docker"

echo "⚠️  Resetting Whitespace services (all data will be deleted)..."
echo ""
read -p "Are you sure? Press 'y' to confirm: " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "✓ Reset cancelled"
    exit 0
fi

echo ""
echo "🛑 Stopping services and removing all data..."
cd "$DOCKER_COMPOSE_DIR"
docker-compose -f docker-compose.dev.yml down -v

echo "✓ Data cleared"
echo ""
echo "▶ Starting fresh services..."
cd "$SCRIPT_DIR"
./start.sh
