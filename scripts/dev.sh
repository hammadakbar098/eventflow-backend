#!/usr/bin/env bash

set -e

cleanup() {
  echo ""
  echo "Stopping Eventflow development database..."
  docker compose -f compose.dev.yml down
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

echo "Starting PostgreSQL..."

docker compose -f compose.dev.yml up -d --wait

echo "PostgreSQL is ready."
echo "Starting NestJS..."

npm run start:dev