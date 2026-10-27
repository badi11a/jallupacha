import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuditService } from '../src/audit/audit.service';
import { AuthController } from '../src/auth/auth.controller';
import { AuthGuard } from '../src/auth/auth.guard';
import { SessionService } from '../src/auth/session.service';
import { ProfileCode } from '../src/common/auth.types';

describe('C-048: identity/logout contract for every frontend profile', () => {
  let app: INestApplication;
  let profiles: ProfileCode[];
  const originalSchema = process.env.ORACLE_SCHEMA;
  const invalidate = jest.fn(async () => undefined);
  beforeAll(async () => {
    process.env.ORACLE_SCHEMA = 'GENERIC_TEST';
    const module = await Test.createTestingModule({ controllers: [AuthController], providers: [
      { provide: DataSource, useValue: { query: jest.fn(async () => [{ displayName: 'Persona de prueba', email: 'persona@example.test' }]) } },
      { provide: AuditService, useValue: { securityEvent: jest.fn(async () => undefined) } },
      { provide: SessionService, useValue: {
        authenticate: async (token: string) => token === 'generic-session' ? { id: 1, profiles, sessionHash: 'generic-hash', csrfHash: 'generic-csrf-hash' } : null,
        verifyCsrf: (token: string) => token === 'generic-csrf', invalidate
      } }, { provide: APP_GUARD, useClass: AuthGuard }
    ] }).compile();
    app = module.createNestApplication(); app.setGlobalPrefix('api'); await app.init();
  });
  beforeEach(() => { invalidate.mockClear(); profiles = ['VALIDATOR']; });
  afterAll(async () => {
    await app.close();
    if (originalSchema === undefined) delete process.env.ORACLE_SCHEMA; else process.env.ORACLE_SCHEMA = originalSchema;
  });
  it.each<ProfileCode>(['ADMIN', 'PROCESS_OWNER', 'VALIDATOR', 'RISK_MANAGER', 'CONSULTATION'])('permits own identity/logout with only %s', async profile => {
    profiles = [profile];
    const user = await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', 'jallupacha_session=generic-session').expect(200);
    expect(user.body.profiles).toEqual([profile]);
    const response = await request(app.getHttpServer()).post('/api/auth/logout')
      .set('Cookie', 'jallupacha_session=generic-session; jallupacha_csrf=generic-csrf').set('X-CSRF-Token', 'generic-csrf').expect(204);
    expect(invalidate).toHaveBeenCalledWith('generic-hash');
    const cookies: unknown = response.headers['set-cookie'];
    expect(Array.isArray(cookies)).toBe(true);
    if (!Array.isArray(cookies)) throw new Error('Expected cleared session cookies');
    expect(cookies).toHaveLength(2);
    expect(cookies.every(cookie => typeof cookie === 'string' && cookie.includes('Max-Age=0'))).toBe(true);
  });
  it('rejects missing session and missing CSRF without revocation', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    await request(app.getHttpServer()).post('/api/auth/logout').set('Cookie', 'jallupacha_session=generic-session').expect(403);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
