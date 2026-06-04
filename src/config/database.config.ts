import type { SqlServerDataSourceOptions } from 'typeorm/driver/sqlserver/SqlServerDataSourceOptions';
import { env } from './env.config';

export interface DatabaseEnvConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
}

/** Lê credenciais e opções TLS do SQL Server a partir de `env`. */
export const buildDatabaseEnvConfig = (): DatabaseEnvConfig => ({
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  encrypt: env.DB_ENCRYPT,
  trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
});

type MssqlDataSourceExtras = Partial<
  Pick<SqlServerDataSourceOptions, 'entities' | 'migrations'>
>;

/** Monta opções TypeORM para SQL Server (`synchronize: false` sempre). */
export const buildDataSourceOptions = (
  db: DatabaseEnvConfig,
  extra?: MssqlDataSourceExtras,
): SqlServerDataSourceOptions => ({
  type: 'mssql',
  host: db.host,
  port: db.port,
  username: db.username,
  password: db.password,
  database: db.database,
  synchronize: false,
  options: {
    encrypt: db.encrypt,
    trustServerCertificate: db.trustServerCertificate,
  },
  ...extra,
});
