import 'dotenv/config';
import 'reflect-metadata';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

function configureDocumentationEnvironment(): void {
  const unusedDatabaseConfiguration: Record<string, string> = {
    ORACLE_SCHEMA: 'OPENAPI_GENERATOR',
    ORACLE_HOST: '127.0.0.1',
    ORACLE_SERVICE: 'OPENAPI_GENERATOR',
    DATABASE_USER: 'OPENAPI_GENERATOR',
    DATABASE_PASSWORD: 'OPENAPI_GENERATOR'
  };
  for (const [name, value] of Object.entries(unusedDatabaseConfiguration)) {
    if (!process.env[name]) process.env[name] = value;
  }
}

async function generateOpenApi(): Promise<void> {
  configureDocumentationEnvironment();
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    const config = new DocumentBuilder()
      .setTitle('Jallupacha API')
      .setDescription('API institucional de gestión de procesos. Requiere sesión y perfiles autorizados, salvo endpoints de autenticación pública documentados explícitamente.')
      .setVersion('0.1.0')
      .addCookieAuth('jallupacha_session')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    await writeFile(join(__dirname, '..', 'openapi.json'), JSON.stringify(document, null, 2), 'utf8');
  } finally {
    await app.close();
  }
}

generateOpenApi().catch((error: unknown) => {
  console.error('OpenAPI generation failed. Check the local configuration.');
  if (error instanceof Error) console.error(error.message);
  process.exitCode = 1;
});
