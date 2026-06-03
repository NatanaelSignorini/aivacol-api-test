import type { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

export const cacheConfigFactory = async (
  configService: ConfigService,
): Promise<CacheModuleOptions> => {
  const cacheTtl = configService.get<number>('redis.cacheTtl') ?? 300;

  return {
    store: await redisStore({
      socket: {
        host: configService.get<string>('redis.host'),
        port: configService.get<number>('redis.port'),
      },
      ttl: cacheTtl * 1000,
    }),
  };
};
