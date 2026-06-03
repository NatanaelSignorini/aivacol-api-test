#!/bin/sh
set -e

DB_HOST="${DB_HOST:-sqlserver}"
DB_PORT="${DB_PORT:-1433}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"

echo "Waiting for SQL Server at ${DB_HOST}:${DB_PORT}..."
until nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 1
done
echo "SQL Server is up."

echo "Ensuring database ${DB_DATABASE:-aivacol} exists..."
node /usr/src/app/scripts/docker-init-db.js

echo "Waiting for Redis at ${REDIS_HOST}:${REDIS_PORT}..."
until nc -z "$REDIS_HOST" "$REDIS_PORT"; do
  sleep 1
done
echo "Redis is up."

exec "$@"
