#!/bin/sh
set -e

DB_HOST="${DB_HOST:-sqlserver}"
DB_PORT="${DB_PORT:-1433}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"

wait_for_tcp() {
  host="$1"
  port="$2"
  name="$3"
  echo "Waiting for ${name} at ${host}:${port}..."
  until nc -z "$host" "$port"; do
    sleep 1
  done
  echo "${name} is up."
}

wait_for_tcp "$DB_HOST" "$DB_PORT" "SQL Server"
wait_for_tcp "$REDIS_HOST" "$REDIS_PORT" "Redis"

RABBITMQ_HOST="${RABBITMQ_HOST:-rabbitmq}"
RABBITMQ_PORT="${RABBITMQ_PORT:-5672}"
wait_for_tcp "$RABBITMQ_HOST" "$RABBITMQ_PORT" "RabbitMQ"

MONGODB_HOST="${MONGODB_HOST:-mongodb}"
MONGODB_PORT="${MONGODB_PORT:-27017}"
wait_for_tcp "$MONGODB_HOST" "$MONGODB_PORT" "MongoDB"

echo "Installing dependencies..."
yarn install --frozen-lockfile --non-interactive

if [ ! -d node_modules/email-validator ] || [ ! -d node_modules/password-validator ]; then
  echo "Validator packages missing after install, retrying..."
  yarn install --frozen-lockfile --non-interactive --force
fi

echo "Validating environment..."
yarn validate:env

echo "Creating SQL Server database if needed..."
yarn db:create

echo "Running database migrations..."
yarn migration:run

echo "Running database seeders..."
yarn seed

exec "$@"
