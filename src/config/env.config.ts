import { config } from 'dotenv';

config({ quiet: true });

const ALLOWED_NODE_ENVS = ['development', 'test', 'production'] as const;

const BOOLEAN_ENV_KEYS = [
  'RABBITMQ_ENABLED',
  'MONGODB_ENABLED',
  'DB_ENCRYPT',
  'DB_TRUST_SERVER_CERTIFICATE',
] as const;

const AMQP_URL_PATTERN = /^amqps?:\/\/.+/;
const MONGODB_URI_PATTERN = /^mongodb(\+srv)?:\/\/.+/;

const RABBITMQ_REQUIRED_WHEN_ENABLED = [
  'RABBITMQ_URL',
  'RABBITMQ_EXCHANGE',
  'RABBITMQ_PORT',
] as const;

const RABBITMQ_OPTIONAL_PORTS_WHEN_ENABLED = [
  'RABBITMQ_MANAGEMENT_PORT',
] as const;

const MONGODB_REQUIRED_WHEN_ENABLED = [
  'MONGODB_URI',
  'MONGODB_DATABASE',
  'MONGODB_PORT',
] as const;

type EnvSource = Record<string, unknown>;

const readString = (source: EnvSource, key: string): string | undefined => {
  const value = source[key];

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const readNumber = (source: EnvSource, key: string): number | undefined => {
  const value = readString(source, key);

  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const readBoolean = (source: EnvSource, key: string): boolean | undefined => {
  const value = source[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return undefined;
};

const isFeatureEnabled = (source: EnvSource, flag: string): boolean =>
  readBoolean(source, flag) === true;

const isValidPort = (port: number | undefined): boolean =>
  port !== undefined && port >= 1 && port <= 65535;

const parsePortFromUrl = (
  url: string,
  defaultPort: number,
): number | undefined => {
  try {
    const parsed = new URL(url);
    if (!parsed.port) {
      return defaultPort;
    }

    const port = Number.parseInt(parsed.port, 10);
    return Number.isNaN(port) ? undefined : port;
  } catch {
    return undefined;
  }
};

const parsePortFromAmqpUrl = (url: string): number | undefined =>
  parsePortFromUrl(url.replace(/^amqps?:/, 'http:'), 5672);

const parsePortFromMongoUri = (uri: string): number | undefined => {
  if (uri.startsWith('mongodb+srv://')) {
    return 27017;
  }

  return parsePortFromUrl(uri.replace(/^mongodb:\/\//, 'http://'), 27017);
};

const envString = (key: string, fallback: string): string =>
  readString(process.env, key) ?? fallback;

const envNumber = (key: string, fallback: number): number => {
  const parsed = readNumber(process.env, key);
  return parsed ?? fallback;
};

const envBoolean = (key: string, fallback: boolean): boolean =>
  readBoolean(process.env, key) ?? fallback;

export const env = {
  NODE_ENV: envString('NODE_ENV', 'development'),
  PORT: envNumber('PORT', 4000),
  API_PREFIX: envString('API_PREFIX', 'api/v1'),
  JWT_SECRET: envString('JWT_SECRET', ''),
  JWT_EXPIRES_IN: envString('JWT_EXPIRES_IN', '1h'),
  DB_HOST: envString('DB_HOST', 'localhost'),
  DB_PORT: envNumber('DB_PORT', 1433),
  DB_USERNAME: envString('DB_USERNAME', 'sa'),
  DB_PASSWORD: envString('DB_PASSWORD', ''),
  DB_DATABASE: envString('DB_DATABASE', 'aivacol'),
  DB_ENCRYPT: envBoolean('DB_ENCRYPT', false),
  DB_TRUST_SERVER_CERTIFICATE: envBoolean('DB_TRUST_SERVER_CERTIFICATE', true),
  REDIS_HOST: envString('REDIS_HOST', 'localhost'),
  REDIS_PORT: envNumber('REDIS_PORT', 6379),
  REDIS_CACHE_TTL: envNumber('REDIS_CACHE_TTL', 300),
  SWAGGER_PATH: envString('SWAGGER_PATH', 'api/docs'),
  CORS_ORIGINS: envString('CORS_ORIGINS', ''),
  THROTTLE_TTL: envNumber('THROTTLE_TTL', 60000),
  THROTTLE_LIMIT: envNumber('THROTTLE_LIMIT', 100),
  THROTTLE_LOGIN_TTL: envNumber('THROTTLE_LOGIN_TTL', 60000),
  THROTTLE_LOGIN_LIMIT: envNumber('THROTTLE_LOGIN_LIMIT', 5),
  RABBITMQ_ENABLED: envBoolean('RABBITMQ_ENABLED', false),
  RABBITMQ_URL: envString('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672'),
  RABBITMQ_EXCHANGE: envString('RABBITMQ_EXCHANGE', 'aivacol.vehicles'),
  RABBITMQ_PORT: envNumber('RABBITMQ_PORT', 5672),
  RABBITMQ_MANAGEMENT_PORT: envNumber('RABBITMQ_MANAGEMENT_PORT', 15672),
  MONGODB_ENABLED: envBoolean('MONGODB_ENABLED', false),
  MONGODB_URI: envString('MONGODB_URI', 'mongodb://localhost:27017'),
  MONGODB_DATABASE: envString('MONGODB_DATABASE', 'aivacol_audit'),
  MONGODB_PORT: envNumber('MONGODB_PORT', 27017),
} as const;

export type Env = typeof env;

const validateBooleanEnvVars = (source: EnvSource, errors: string[]): void => {
  for (const key of BOOLEAN_ENV_KEYS) {
    if (source[key] === undefined) {
      continue;
    }

    if (readBoolean(source, key) === undefined) {
      errors.push(`${key} must be "true" or "false"`);
    }
  }
};

const requireStringWhenEnabled = (
  source: EnvSource,
  flag: string,
  key: string,
  errors: string[],
): void => {
  if (!readString(source, key)) {
    errors.push(`${key} is required when ${flag}=true`);
  }
};

const requirePortWhenEnabled = (
  source: EnvSource,
  flag: string,
  key: string,
  errors: string[],
): void => {
  const raw = readString(source, key);

  if (!raw) {
    errors.push(`${key} is required when ${flag}=true`);
    return;
  }

  const port = readNumber(source, key);

  if (!isValidPort(port)) {
    errors.push(`${key} must be between 1 and 65535 when ${flag}=true`);
  }
};

const validateOptionalPortWhenEnabled = (
  source: EnvSource,
  flag: string,
  key: string,
  errors: string[],
): void => {
  if (source[key] === undefined) {
    return;
  }

  const port = readNumber(source, key);

  if (!isValidPort(port)) {
    errors.push(`${key} must be between 1 and 65535 when ${flag}=true`);
  }
};

const validateCoreInfrastructure = (
  source: EnvSource,
  nodeEnv: string,
  errors: string[],
): void => {
  if (!readString(source, 'API_PREFIX')) {
    errors.push('API_PREFIX is required');
  }

  if (!readString(source, 'DB_HOST')) {
    errors.push('DB_HOST is required');
  }

  if (!readString(source, 'DB_USERNAME')) {
    errors.push('DB_USERNAME is required');
  }

  if (!readString(source, 'DB_DATABASE')) {
    errors.push('DB_DATABASE is required');
  }

  if (nodeEnv !== 'test') {
    const dbPassword = readString(source, 'DB_PASSWORD');

    if (!dbPassword) {
      errors.push('DB_PASSWORD is required');
    } else if (dbPassword.length < 8) {
      errors.push('DB_PASSWORD must be at least 8 characters');
    }
  }

  if (!readString(source, 'REDIS_HOST')) {
    errors.push('REDIS_HOST is required (cache is always enabled)');
  }
};

const validateRabbitMq = (source: EnvSource, errors: string[]): void => {
  const flag = 'RABBITMQ_ENABLED';

  if (!isFeatureEnabled(source, flag)) {
    return;
  }

  for (const key of RABBITMQ_REQUIRED_WHEN_ENABLED) {
    if (key.endsWith('_PORT')) {
      requirePortWhenEnabled(source, flag, key, errors);
    } else {
      requireStringWhenEnabled(source, flag, key, errors);
    }
  }

  for (const key of RABBITMQ_OPTIONAL_PORTS_WHEN_ENABLED) {
    validateOptionalPortWhenEnabled(source, flag, key, errors);
  }

  const url = readString(source, 'RABBITMQ_URL');

  if (url && !AMQP_URL_PATTERN.test(url)) {
    errors.push(
      'RABBITMQ_URL must start with amqp:// or amqps:// when RABBITMQ_ENABLED=true',
    );
  }

  const configuredPort = readNumber(source, 'RABBITMQ_PORT');
  const urlPort = url ? parsePortFromAmqpUrl(url) : undefined;

  if (
    isValidPort(configuredPort) &&
    urlPort !== undefined &&
    configuredPort !== urlPort
  ) {
    errors.push(
      `RABBITMQ_PORT (${configuredPort}) must match the port in RABBITMQ_URL (${urlPort}) when RABBITMQ_ENABLED=true`,
    );
  }
};

const validateMongoDb = (source: EnvSource, errors: string[]): void => {
  const flag = 'MONGODB_ENABLED';

  if (!isFeatureEnabled(source, flag)) {
    return;
  }

  for (const key of MONGODB_REQUIRED_WHEN_ENABLED) {
    if (key.endsWith('_PORT')) {
      requirePortWhenEnabled(source, flag, key, errors);
    } else {
      requireStringWhenEnabled(source, flag, key, errors);
    }
  }

  const uri = readString(source, 'MONGODB_URI');

  if (uri && !MONGODB_URI_PATTERN.test(uri)) {
    errors.push(
      'MONGODB_URI must start with mongodb:// or mongodb+srv:// when MONGODB_ENABLED=true',
    );
  }

  const configuredPort = readNumber(source, 'MONGODB_PORT');
  const uriPort = uri ? parsePortFromMongoUri(uri) : undefined;

  if (
    isValidPort(configuredPort) &&
    uriPort !== undefined &&
    configuredPort !== uriPort
  ) {
    errors.push(
      `MONGODB_PORT (${configuredPort}) must match the port in MONGODB_URI (${uriPort}) when MONGODB_ENABLED=true`,
    );
  }
};

/** Validates values loaded from `.env` into `process.env`. Does not run on import. */
export const validateEnvironment = (source: EnvSource = process.env): void => {
  const errors: string[] = [];

  const nodeEnv = readString(source, 'NODE_ENV') ?? 'development';

  if (
    !ALLOWED_NODE_ENVS.includes(nodeEnv as (typeof ALLOWED_NODE_ENVS)[number])
  ) {
    errors.push(
      `NODE_ENV must be one of: ${ALLOWED_NODE_ENVS.join(', ')} (got "${nodeEnv}")`,
    );
  }

  const jwtSecret = readString(source, 'JWT_SECRET');

  if (!jwtSecret) {
    errors.push('JWT_SECRET is required');
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }

  validateBooleanEnvVars(source, errors);
  validateCoreInfrastructure(source, nodeEnv, errors);
  validateRabbitMq(source, errors);
  validateMongoDb(source, errors);

  const port = readNumber(source, 'PORT') ?? 4000;

  if (!isValidPort(port)) {
    errors.push('PORT must be between 1 and 65535');
  }

  const dbPort = readNumber(source, 'DB_PORT') ?? 1433;

  if (!isValidPort(dbPort)) {
    errors.push('DB_PORT must be between 1 and 65535');
  }

  const redisPort = readNumber(source, 'REDIS_PORT') ?? 6379;

  if (!isValidPort(redisPort)) {
    errors.push('REDIS_PORT must be between 1 and 65535');
  }

  const redisCacheTtl = readNumber(source, 'REDIS_CACHE_TTL') ?? 300;

  if (redisCacheTtl < 1) {
    errors.push('REDIS_CACHE_TTL must be greater than 0');
  }

  const throttleTtl = readNumber(source, 'THROTTLE_TTL') ?? 60000;
  if (throttleTtl < 1) {
    errors.push('THROTTLE_TTL must be greater than 0');
  }

  const throttleLimit = readNumber(source, 'THROTTLE_LIMIT') ?? 100;
  if (throttleLimit < 1) {
    errors.push('THROTTLE_LIMIT must be greater than 0');
  }

  const throttleLoginTtl = readNumber(source, 'THROTTLE_LOGIN_TTL') ?? 60000;
  if (throttleLoginTtl < 1) {
    errors.push('THROTTLE_LOGIN_TTL must be greater than 0');
  }

  const throttleLoginLimit = readNumber(source, 'THROTTLE_LOGIN_LIMIT') ?? 5;
  if (throttleLoginLimit < 1) {
    errors.push('THROTTLE_LOGIN_LIMIT must be greater than 0');
  }

  if (errors.length > 0) {
    throw new Error(errors.map((error) => `  - ${error}`).join('\n'));
  }
};
