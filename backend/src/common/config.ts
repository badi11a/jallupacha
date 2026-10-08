import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { OracleConnectionOptions } from 'typeorm/driver/oracle/OracleConnectionOptions';

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new InternalServerErrorException(`Missing required configuration: ${name}`);
  }
  return value;
};

export function databaseOptions(migration = false): OracleConnectionOptions {
  const schema = required('ORACLE_SCHEMA').toUpperCase();
  if (!/^[A-Z][A-Z0-9_$#]{0,29}$/.test(schema)) {
    throw new InternalServerErrorException('Invalid Oracle schema configuration');
  }

  const port = Number(process.env.ORACLE_PORT ?? 1521);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new InternalServerErrorException('Invalid Oracle port configuration');
  }

  return {
    type: 'oracle' as const,
    host: required('ORACLE_HOST'),
    port,
    serviceName: required('ORACLE_SERVICE'),
    username: required(migration ? 'MIGRATION_USER' : 'DATABASE_USER'),
    password: required(migration ? 'MIGRATION_PASSWORD' : 'DATABASE_PASSWORD'),
    schema,
    synchronize: false,
    migrationsRun: false,
    migrations: [__dirname + '/../database/migrations/*{.js,.ts}'],
    entities: [__dirname + '/../**/*.entity{.js,.ts}'],
    logging: false
  };
}

export function validateDemoRuntime(host: string, mode: string, nodeEnv: string): void {
  if (mode !== 'demo') return;
  if (nodeEnv !== 'development') {
    throw new Error('AUTH_MODE=demo is allowed only when NODE_ENV=development');
  }
  if (!['127.0.0.1', '::1', 'localhost'].includes(host.toLowerCase())) {
    throw new Error('AUTH_MODE=demo requires a loopback HOST');
  }
}

export function configuredRateLimit(): { ttl: number; limit: number } {
  const ttl = Number(process.env.API_RATE_LIMIT_TTL_MS ?? 60_000);
  const limit = Number(process.env.API_RATE_LIMIT_MAX ?? 120);
  if (!Number.isInteger(ttl) || ttl < 1 || !Number.isInteger(limit) || limit < 1) {
    throw new BadRequestException('Invalid rate-limit configuration');
  }
  return { ttl, limit };
}
