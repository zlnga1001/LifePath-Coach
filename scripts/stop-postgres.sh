#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.postgres.yml"

echo "Stopping Postgres container (if running)"
docker compose -f "$COMPOSE_FILE" down

echo "Stopped and removed containers defined in $COMPOSE_FILE"
