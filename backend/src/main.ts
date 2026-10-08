import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { validateDemoRuntime } from './common/config';

async function bootstrap(): Promise<void> {
  const host = process.env.HOST ?? '127.0.0.1';
  const port = Number(process.env.PORT ?? 3000);
  validateDemoRuntime(host, process.env.AUTH_MODE ?? 'google', process.env.NODE_ENV ?? 'development');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  await app.get(DataSource).initialize();
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'self'"]
      }
    },
    hsts: process.env.NODE_ENV === 'production'
  }));
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false }
  }));

  await app.listen(port, host);
}

bootstrap().catch((error: unknown) => {
  console.error('Backend startup failed. Check local configuration and Oracle availability.');
  console.error(error instanceof Error ? error.message : 'Unexpected startup error');
  process.exitCode = 1;
});
