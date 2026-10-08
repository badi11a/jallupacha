import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { SessionService } from './session.service';

// tsx (the dev runner) does not emit decorator metadata, so DI must not depend on it.
describe('AuthGuard dependency injection without emitted metadata', () => {
  let app: INestApplication;
  const authenticate = jest.fn(async () => null);
  const securityEvent = jest.fn(async () => undefined);
  const query = jest.fn(async () => [{ userId: 1, displayName: 'Demo' }]);
  const original = { authMode: process.env.AUTH_MODE, nodeEnv: process.env.NODE_ENV, demo: process.env.DEMO_DATA_ENABLED };

  beforeAll(async () => {
    process.env.AUTH_MODE = 'demo';
    process.env.NODE_ENV = 'development';
    process.env.DEMO_DATA_ENABLED = 'true';
    for (const type of [AuthGuard, AuthController, SessionService, AuditService]) {
      Reflect.deleteMetadata('design:paramtypes', type);
    }
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: DataSource, useValue: { query } },
        { provide: SessionService, useValue: { authenticate } },
        { provide: AuditService, useValue: { securityEvent } },
        AuthGuard,
        { provide: APP_GUARD, useExisting: AuthGuard }
      ]
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    for (const [key, value] of [
      ['AUTH_MODE', original.authMode],
      ['NODE_ENV', original.nodeEnv],
      ['DEMO_DATA_ENABLED', original.demo]
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('serves public routes through the global guard', async () => {
    await request(app.getHttpServer()).get('/api/auth/demo/identities').expect(200);
  });

  it('still rejects protected routes without a session', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    expect(securityEvent).toHaveBeenCalledWith(null, expect.any(String), 'ACCESS_DENIED', 'REJECTED');
  });
});
