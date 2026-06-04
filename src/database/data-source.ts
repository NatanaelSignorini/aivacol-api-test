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

export default new DataSource({
  ...baseOptions,
  ...seederOptions,
});
