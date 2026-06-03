import { config } from 'dotenv';

config({ quiet: true });

const getString = (key: string, fallback: string): string =>
  process.env[key]?.trim() || fallback;

const getNumber = (key: string, fallback: number): number => {
  const value = process.env[key];

  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const getBoolean = (key: string, fallback: boolean): boolean => {
  const value = process.env[key];

  if (value === undefined) {
    return fallback;
  }

  return value === 'true';
};

export const env = {
  NODE_ENV: getString('NODE_ENV', 'development'),
  PORT: getNumber('PORT', 4000),
  API_PREFIX: getString('API_PREFIX', 'api/v1'),
  JWT_SECRET: getString('JWT_SECRET', ''),
  JWT_EXPIRES_IN: getString('JWT_EXPIRES_IN', '1h'),
  DB_HOST: getString('DB_HOST', 'localhost'),
  DB_PORT: getNumber('DB_PORT', 1433),
  DB_USERNAME: getString('DB_USERNAME', 'sa'),
  DB_PASSWORD: getString('DB_PASSWORD', ''),
  DB_DATABASE: getString('DB_DATABASE', 'aivacol'),
  DB_ENCRYPT: getBoolean('DB_ENCRYPT', false),
  DB_TRUST_SERVER_CERTIFICATE: getBoolean('DB_TRUST_SERVER_CERTIFICATE', true),
  REDIS_HOST: getString('REDIS_HOST', 'localhost'),
  REDIS_PORT: getNumber('REDIS_PORT', 6379),
  REDIS_CACHE_TTL: getNumber('REDIS_CACHE_TTL', 300),
  SWAGGER_PATH: getString('SWAGGER_PATH', 'api/docs'),
} as const;

export type Env = typeof env;
