const ALLOWED_NODE_ENVS = ['development', 'test', 'production'] as const;

const getString = (
  env: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = env[key];

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getNumber = (
  env: Record<string, unknown>,
  key: string,
): number | undefined => {
  const value = getString(env, key);

  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const isValidPort = (port: number | undefined): boolean =>
  port !== undefined && port >= 1 && port <= 65535;

export const validateEnvironment = (env: Record<string, unknown>): void => {
  const errors: string[] = [];

  const nodeEnv = getString(env, 'NODE_ENV') ?? 'development';

  if (
    !ALLOWED_NODE_ENVS.includes(nodeEnv as (typeof ALLOWED_NODE_ENVS)[number])
  ) {
    errors.push(
      `NODE_ENV must be one of: ${ALLOWED_NODE_ENVS.join(', ')} (got "${nodeEnv}")`,
    );
  }

  const jwtSecret = getString(env, 'JWT_SECRET');

  if (!jwtSecret) {
    errors.push('JWT_SECRET is required');
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }

  if (nodeEnv !== 'test') {
    const dbPassword = getString(env, 'DB_PASSWORD');

    if (!dbPassword) {
      errors.push('DB_PASSWORD is required');
    } else if (dbPassword.length < 8) {
      errors.push('DB_PASSWORD must be at least 8 characters');
    }
  }

  const port = getNumber(env, 'PORT') ?? 4000;

  if (!isValidPort(port)) {
    errors.push('PORT must be between 1 and 65535');
  }

  const dbPort = getNumber(env, 'DB_PORT') ?? 1433;

  if (!isValidPort(dbPort)) {
    errors.push('DB_PORT must be between 1 and 65535');
  }

  const redisPort = getNumber(env, 'REDIS_PORT') ?? 6379;

  if (!isValidPort(redisPort)) {
    errors.push('REDIS_PORT must be between 1 and 65535');
  }

  const redisCacheTtl = getNumber(env, 'REDIS_CACHE_TTL') ?? 300;

  if (redisCacheTtl < 1) {
    errors.push('REDIS_CACHE_TTL must be greater than 0');
  }

  if (errors.length > 0) {
    throw new Error(errors.map((error) => `  - ${error}`).join('\n'));
  }
};
