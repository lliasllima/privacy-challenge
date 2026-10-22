/**
 * Runs before the test framework and before AppModule is imported.
 * Forces every test process to use the dedicated test database, never the
 * development one.
 */
const testDatabase = process.env.TEST_DB_NAME ?? 'followers_test';

if (!testDatabase.endsWith('_test')) {
  throw new Error(
    `TEST_DB_NAME must end with "_test" (received "${testDatabase}") to avoid touching the development database`,
  );
}

process.env.DB_NAME = testDatabase;
process.env.NODE_ENV = 'test';
