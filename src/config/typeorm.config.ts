import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigEnvKeys } from '../common/config/config-env-keys';
import {
  buildDatabaseEnvConfig,
  buildDataSourceOptions,
} from './database.config';

/** Factory do TypeOrmModule com retry, autoLoadEntities e logging em development. */
export const typeOrmConfigFactory = (): TypeOrmModuleOptions => {
  const db = buildDatabaseEnvConfig();
  const isDevelopment = ConfigEnvKeys.nodeEnv() === 'development';

  return {
    ...buildDataSourceOptions(db),
    autoLoadEntities: true,
    logging: isDevelopment ? ['error', 'warn'] : false,
    retryAttempts: 10,
    retryDelay: 3000,
  };
};
