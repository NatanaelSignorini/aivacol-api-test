import { DataSource } from 'typeorm';
import {
  buildDatabaseEnvConfig,
  buildDataSourceOptions,
} from '../config/database.config';

export default new DataSource(
  buildDataSourceOptions(buildDatabaseEnvConfig(), {
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/database/migrations/*.ts'],
  }),
);
