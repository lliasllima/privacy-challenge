import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'node:path';
import { validateEnvironment } from './config/env.validation';
import { CreatorsModule } from './creators/creators.module';
import { Creator } from './entities/creator.entity';
import { Follower } from './entities/follower.entity';
import { User } from './entities/user.entity';
import { FollowersModule } from './followers/followers.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', '../.env'],
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.getOrThrow<string>('DB_HOST'),
        port: Number(config.getOrThrow<string>('DB_PORT')),
        username: config.getOrThrow<string>('DB_USER'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_NAME'),
        entities: [Creator, User, Follower],
        migrations: [join(__dirname, 'database', 'migrations', '*.{js,ts}')],
        migrationsTableName: 'migrations',
        synchronize: false,
        migrationsRun: true,
        logging:
          config.get<string>('NODE_ENV') === 'development'
            ? ['error', 'warn', 'migration']
            : ['error'],
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
    HealthModule,
    UsersModule,
    CreatorsModule,
    FollowersModule,
  ],
})
export class AppModule {}
