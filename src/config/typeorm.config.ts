import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import {
  buildDatabaseEnvConfig,
  buildDataSourceOptions,
} from './database.config';
import { env } from './env.config';

export const typeOrmConfigFactory = (): TypeOrmModuleOptions => {
  const db = buildDatabaseEnvConfig();
  const isDevelopment = env.NODE_ENV === 'development';

  return {
    ...buildDataSourceOptions(db),
    autoLoadEntities: true,
    logging: isDevelopment ? ['error', 'warn'] : false,
    retryAttempts: 10,
    retryDelay: 3000,
  };
};
