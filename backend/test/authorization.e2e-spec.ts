import { Controller, Get, Post } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuditService } from '../src/audit/audit.service';
import { AuthGuard } from '../src/auth/auth.guard';
import { SessionService } from '../src/auth/session.service';
import { Public, RequireProfiles } from '../src/common/auth.decorator';

@Controller()
class AuthorizationTestController {
  @Get('catalog')
  @RequireProfiles('ADMIN')
  catalog() {
    return { allowed: true };
  }

  @Post('catalog')
  @RequireProfiles('ADMIN')
  update() {
    return { updated: true };
  }

  @Get('demo')
  @Public()
  demo() {
    return { local: true };
  }
}

describe('direct API authorization', () => {
  let app: INestApplication;
  let api: ReturnType<typeof request>;
  const securityEvent = jest.fn();
  let sessionProfiles: string[] = ['CONSULTATION'];
  const sessionService = {
    authenticate: jest.fn(async (token?: string) => {
      if (token !== 'valid-session') return null;
      return {
        id: 10,
        profiles: sessionProfiles,
        sessionHash: 'stored-hash',
        csrfHash: 'stored-csrf-hash'
      };
    }),
    verifyCsrf: jest.fn((token?: string) => token === 'valid-csrf')
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthorizationTestController],
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: AuditService, useValue: { securityEvent } },
        { provide: APP_GUARD, useClass: AuthGuard }
      ]
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    api = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    securityEvent.mockClear();
    sessionProfiles = ['CONSULTATION'];
  });

  it('permits explicitly public demo routes without a session', async () => {
    await api.get('/api/demo').expect(200, { local: true });
  });

  it('rejects protected routes without a session', async () => {
    await api.get('/api/catalog').expect(401);
    expect(securityEvent).toHaveBeenCalledWith(null, expect.any(String), 'ACCESS_DENIED', 'REJECTED');
  });

  it('rejects an authenticated profile without permission', async () => {
    await api.get('/api/catalog').set('Cookie', 'jallupacha_session=valid-session').expect(403);
    expect(securityEvent).toHaveBeenCalledWith(10, expect.any(String), 'ACCESS_DENIED', 'REJECTED');
  });

  it('allows an authorized profile after consulting current session profiles', async () => {
    sessionProfiles = ['ADMIN'];
    await api.get('/api/catalog').set('Cookie', 'jallupacha_session=valid-session').expect(200, { allowed: true });
  });

  it('requires a matching CSRF cookie and header for writes', async () => {
    await api.post('/api/catalog').set('Cookie', 'jallupacha_session=valid-session').expect(403);
    expect(sessionService.verifyCsrf).not.toHaveBeenCalled();
  });

  it('allows an authorized write only with the session-bound CSRF token', async () => {
    sessionProfiles = ['ADMIN'];
    await api.post('/api/catalog')
      .set('Cookie', 'jallupacha_session=valid-session; jallupacha_csrf=valid-csrf')
      .set('X-CSRF-Token', 'valid-csrf')
      .expect(201, { updated: true });
  });
});
