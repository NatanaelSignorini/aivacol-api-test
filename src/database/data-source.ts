import { DataSource } from 'typeorm';
import type { SeederOptions } from 'typeorm-extension';
import {
  buildDatabaseEnvConfig,
  buildDataSourceOptions,
} from '../config/database.config';

const baseOptions = buildDataSourceOptions(buildDatabaseEnvConfig(), {
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});

const seederOptions: SeederOptions = {
  seeds: ['src/database/seeds/*.seeder.ts'],
  factories: [],
};

/** DataSource TypeORM CLI: migrations, entities e seeds para comandos yarn migration/seed. */
export default new DataSource({
  ...baseOptions,
  ...seederOptions,
});
