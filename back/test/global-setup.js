/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('node:path');
const { Client } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * Creates the dedicated test database if it does not exist yet, connecting to
 * the always-present "postgres" maintenance database. Never runs against the
 * development database (guarded by the "_test" suffix).
 */
module.exports = async () => {
  const testDatabase = process.env.TEST_DB_NAME || 'followers_test';

  if (!testDatabase.endsWith('_test')) {
    throw new Error(
      `TEST_DB_NAME must end with "_test" (received "${testDatabase}") to avoid touching the development database`,
    );
  }

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });

  await client.connect();

  try {
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [testDatabase],
    );

    if (rowCount === 0) {
      await client.query(`CREATE DATABASE "${testDatabase.replace(/"/g, '""')}"`);
    }
  } finally {
    await client.end();
  }
};
