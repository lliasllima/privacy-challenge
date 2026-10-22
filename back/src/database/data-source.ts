import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Creator } from '../entities/creator.entity';
import { Follower } from '../entities/follower.entity';
import { User } from '../entities/user.entity';

// Supports running the TypeORM CLI from /back or from the monorepo root.
for (const envPath of [
  join(process.cwd(), '.env'),
  join(process.cwd(), '..', '.env'),
]) {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath });
    break;
  }
}

export function buildDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [Creator, User, Follower],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsTableName: 'migrations',
    synchronize: false,
    migrationsRun: false,
    logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  };
}

export const AppDataSource = new DataSource(buildDataSourceOptions());

export default AppDataSource;
