#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.postgres.yml"

echo "Starting Postgres via docker-compose ($COMPOSE_FILE)"
docker compose -f "$COMPOSE_FILE" up -d

echo "Waiting for Postgres container to become healthy..."
for i in {1..60}; do
  status=$(docker inspect -f '{{.State.Health.Status}}' jobapp-postgres 2>/dev/null || echo "")
  printf "."
  if [ "$status" = "healthy" ]; then
    echo "\nPostgres is healthy"
    break
  fi
  sleep 1
done

if [ "$status" != "healthy" ]; then
  echo "\nPostgres failed to become healthy. Showing last 200 lines of logs:"
  docker logs --tail 200 jobapp-postgres
  exit 1
fi

# Compose DATABASE_URL for local development
HOST=localhost
PORT=15432
USER=lifepath
PASS=secretpass
DB=lifepathdb
URL="postgres://$USER:$PASS@$HOST:$PORT/$DB"

ENVFILE=.env
if [ ! -f "$ENVFILE" ]; then
  echo "Creating $ENVFILE"
  touch "$ENVFILE"
fi

if ! grep -q '^DATABASE_URL=' "$ENVFILE"; then
  printf "\n# Local Postgres (docker)\nDATABASE_URL=%s\n" "$URL" >> "$ENVFILE"
  echo "Wrote DATABASE_URL to $ENVFILE"
else
  echo "DATABASE_URL already present in $ENVFILE — skipping write"
fi

echo "Postgres ready. Connection string:"
echo "$URL"
