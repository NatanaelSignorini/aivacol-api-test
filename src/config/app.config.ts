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
});
