const sql = require('mssql');

const dbName = process.env.DB_DATABASE ?? 'aivacol';

const config = {
  server: process.env.DB_HOST ?? 'sqlserver',
  port: Number.parseInt(process.env.DB_PORT ?? '1433', 10),
  user: process.env.DB_USERNAME ?? 'sa',
  password: process.env.DB_PASSWORD ?? '',
  database: 'master',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
  },
};

async function ensureDatabase() {
  const pool = await sql.connect(config);

  await pool
    .request()
    .input('name', sql.NVarChar, dbName)
    .query(
      `IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = @name)
       BEGIN
         EXEC('CREATE DATABASE [' + @name + ']');
       END`,
    );

  await pool.close();
  console.log(`Database "${dbName}" is ready.`);
}

ensureDatabase().catch((error) => {
  console.error('Failed to initialize database:', error.message);
  process.exit(1);
});
