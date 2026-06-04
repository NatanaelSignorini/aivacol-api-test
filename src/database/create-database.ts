#!/usr/bin/env node

import 'reflect-metadata';

import { config } from 'dotenv';

config({ quiet: true });

import sql from 'mssql';
import { buildDatabaseEnvConfig } from '../config/database.config';

const DATABASE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

/** Cria banco SQL Server em `master` se ainda não existir (script de bootstrap Docker). */
async function createDatabase(): Promise<void> {
  const db = buildDatabaseEnvConfig();

  if (!DATABASE_NAME_PATTERN.test(db.database)) {
    throw new Error(`Invalid database name: ${db.database}`);
  }

  const pool = await sql.connect({
    server: db.host,
    port: db.port,
    user: db.username,
    password: db.password,
    database: 'master',
    options: {
      encrypt: db.encrypt,
      trustServerCertificate: db.trustServerCertificate,
    },
  });

  try {
    const existing = await pool
      .request()
      .input('name', sql.NVarChar, db.database)
      .query<{ found: number }>(
        'SELECT 1 AS found FROM sys.databases WHERE name = @name',
      );

    if (existing.recordset.length > 0) {
      console.log(`Database "${db.database}" already exists.`);
      return;
    }

    await pool.request().query(`CREATE DATABASE [${db.database}]`);
    console.log(`Database "${db.database}" created.`);
  } finally {
    await pool.close();
  }
}

createDatabase().catch((error: unknown) => {
  console.error('Failed to create database:', error);
  process.exit(1);
});
