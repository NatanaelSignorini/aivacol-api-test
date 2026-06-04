import { ConfigEnvKeys } from '../common/config/config-env-keys';

/** Mapeia variáveis de ambiente tipadas para o namespace do ConfigService NestJS. */
export default () => ({
  nodeEnv: ConfigEnvKeys.nodeEnv(),
  port: ConfigEnvKeys.port(),
  apiPrefix: ConfigEnvKeys.apiPrefix(),
  jwt: {
    secret: ConfigEnvKeys.jwtSecret(),
    expiresIn: ConfigEnvKeys.jwtExpiresIn(),
  },
  redis: {
    host: ConfigEnvKeys.redisHost(),
    port: ConfigEnvKeys.redisPort(),
    cacheTtl: ConfigEnvKeys.redisCacheTtl(),
  },
  swagger: {
    path: ConfigEnvKeys.swaggerPath(),
  },
  cors: {
    origins: ConfigEnvKeys.corsOrigins(),
  },
  throttle: {
    ttl: ConfigEnvKeys.throttleTtl(),
    limit: ConfigEnvKeys.throttleLimit(),
    loginTtl: ConfigEnvKeys.throttleLoginTtl(),
    loginLimit: ConfigEnvKeys.throttleLoginLimit(),
  },
  rabbitmq: {
    url: ConfigEnvKeys.rabbitmqUrl(),
    exchange: ConfigEnvKeys.rabbitmqExchange(),
    auditExchange: ConfigEnvKeys.rabbitmqAuditExchange(),
    auditQueue: ConfigEnvKeys.rabbitmqAuditQueue(),
  },
  mongodb: {
    uri: ConfigEnvKeys.mongodbUri(),
    database: ConfigEnvKeys.mongodbDatabase(),
  },
});
