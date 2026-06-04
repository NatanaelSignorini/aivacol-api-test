import { env } from './env.config';

export default () => ({
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  apiPrefix: env.API_PREFIX,
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    cacheTtl: env.REDIS_CACHE_TTL,
  },
  swagger: {
    path: env.SWAGGER_PATH,
  },
  cors: {
    origins: env.CORS_ORIGINS,
  },
  throttle: {
    ttl: env.THROTTLE_TTL,
    limit: env.THROTTLE_LIMIT,
    loginTtl: env.THROTTLE_LOGIN_TTL,
    loginLimit: env.THROTTLE_LOGIN_LIMIT,
  },
  rabbitmq: {
    enabled: env.RABBITMQ_ENABLED,
    url: env.RABBITMQ_URL,
    exchange: env.RABBITMQ_EXCHANGE,
  },
  mongodb: {
    enabled: env.MONGODB_ENABLED,
    uri: env.MONGODB_URI,
    database: env.MONGODB_DATABASE,
  },
});
