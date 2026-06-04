import type { SqlServerDataSourceOptions } from 'typeorm/driver/sqlserver/SqlServerDataSourceOptions';
import { ConfigEnvKeys } from '../common/config/config-env-keys';

export interface DatabaseEnvConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
}

/** Lê credenciais e opções TLS do SQL Server a partir das variáveis de ambiente. */
export const buildDatabaseEnvConfig = (): DatabaseEnvConfig => ({
  host: ConfigEnvKeys.dbHost(),
  port: ConfigEnvKeys.dbPort(),
  username: ConfigEnvKeys.dbUsername(),
  password: ConfigEnvKeys.dbPassword(),
  database: ConfigEnvKeys.dbDatabase(),
  encrypt: ConfigEnvKeys.dbEncrypt(),
  trustServerCertificate: ConfigEnvKeys.dbTrustServerCertificate(),
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
