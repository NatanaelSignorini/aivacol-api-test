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

echo "Waiting for Redis at ${REDIS_HOST}:${REDIS_PORT}..."
until nc -z "$REDIS_HOST" "$REDIS_PORT"; do
  sleep 1
done
echo "Redis is up."

echo "Installing dependencies..."
yarn install --frozen-lockfile --non-interactive

if [ ! -d node_modules/email-validator ] || [ ! -d node_modules/password-validator ]; then
  echo "Validator packages missing after install, retrying..."
  yarn install --frozen-lockfile --non-interactive --force
fi

echo "Validating environment..."
yarn validate:env

echo "Running database migrations..."
yarn migration:run

echo "Running database seeders..."
yarn seed

exec "$@"
