import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  configureApp(app);

  const port = Number(config.get<string>('API_PORT') ?? 3000);
  await app.listen(port, '0.0.0.0');

  Logger.log(`API listening on http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
