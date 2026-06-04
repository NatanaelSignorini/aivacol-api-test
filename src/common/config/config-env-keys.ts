const castNumber = (value: unknown): number | undefined => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

/** Facilita leitura tipada de variáveis de ambiente em runtime. */
export class ConfigEnvKeys {
  private constructor() {}

  static nodeEnv(): string {
    return process.env.NODE_ENV ?? 'development';
  }

  static port(): number {
    return castNumber(process.env.PORT) ?? 4000;
  }

  static apiPrefix(): string {
    return process.env.API_PREFIX ?? 'api/v1';
  }

  static jwtSecret(): string {
    return process.env.JWT_SECRET ?? '';
  }

  static jwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN ?? '1h';
  }

  static dbHost(): string {
    return process.env.DB_HOST ?? 'localhost';
  }

  static dbPort(): number {
    return castNumber(process.env.DB_PORT) ?? 1433;
  }

  static dbUsername(): string {
    return process.env.DB_USERNAME ?? 'sa';
  }

  static dbPassword(): string {
    return process.env.DB_PASSWORD ?? '';
  }

  static dbDatabase(): string {
    return process.env.DB_DATABASE ?? 'aivacol';
  }

  static dbEncrypt(): boolean {
    return process.env.DB_ENCRYPT === 'true';
  }

  static dbTrustServerCertificate(): boolean {
    return process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false';
  }

  static redisHost(): string {
    return process.env.REDIS_HOST ?? 'localhost';
  }

  static redisPort(): number {
    return castNumber(process.env.REDIS_PORT) ?? 6379;
  }

  static redisCacheTtl(): number {
    return castNumber(process.env.REDIS_CACHE_TTL) ?? 300;
  }

  static swaggerPath(): string {
    return process.env.SWAGGER_PATH ?? 'api/docs';
  }

  static corsOrigins(): string {
    return process.env.CORS_ORIGINS ?? '';
  }

  static throttleTtl(): number {
    return castNumber(process.env.THROTTLE_TTL) ?? 60000;
  }

  static throttleLimit(): number {
    return castNumber(process.env.THROTTLE_LIMIT) ?? 100;
  }

  static throttleLoginTtl(): number {
    return castNumber(process.env.THROTTLE_LOGIN_TTL) ?? 60000;
  }

  static throttleLoginLimit(): number {
    return castNumber(process.env.THROTTLE_LOGIN_LIMIT) ?? 5;
  }

  static rabbitmqEnabled(): boolean {
    return process.env.RABBITMQ_ENABLED === 'true';
  }

  static rabbitmqUrl(): string {
    return process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
  }

  static rabbitmqExchange(): string {
    return process.env.RABBITMQ_EXCHANGE ?? 'aivacol.vehicles';
  }

  static rabbitmqPort(): number {
    return castNumber(process.env.RABBITMQ_PORT) ?? 5672;
  }

  static rabbitmqManagementPort(): number {
    return castNumber(process.env.RABBITMQ_MANAGEMENT_PORT) ?? 15672;
  }

  static mongodbEnabled(): boolean {
    return process.env.MONGODB_ENABLED === 'true';
  }

  static mongodbUri(): string {
    return process.env.MONGODB_URI ?? 'mongodb://localhost:27017';
  }

  static mongodbDatabase(): string {
    return process.env.MONGODB_DATABASE ?? 'aivacol_audit';
  }

  static mongodbPort(): number {
    return castNumber(process.env.MONGODB_PORT) ?? 27017;
  }
}
