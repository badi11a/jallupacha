import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { EntityManager } from 'typeorm';
import request from 'supertest';
import { AuditService } from '../src/audit/audit.service';
import { AuthController } from '../src/auth/auth.controller';
import { SessionService } from '../src/auth/session.service';

describe('local demo sessions', () => {
  let app: INestApplication;
  let api: ReturnType<typeof request>;
  const originalEnv = {
    authMode: process.env.AUTH_MODE,
    nodeEnv: process.env.NODE_ENV,
    demoEnabled: process.env.DEMO_DATA_ENABLED
  };
  const query = jest.fn(async (_sql: string, params?: number[]) =>
    params?.[0] === 1 ? [{ userId: 1 }] : []
  );
  const createSession = jest.fn(async () => ({
    sessionToken: 'opaque-session-token-that-is-not-returned',
    csrfToken: 'opaque-csrf-token'
  }));
  const securityEvent = jest.fn(async () => undefined);
  const transaction = async <T>(operation: (manager: EntityManager) => Promise<T>): Promise<T> =>
    operation({} as EntityManager);

  beforeAll(async () => {
    process.env.AUTH_MODE = 'demo';
    process.env.NODE_ENV = 'development';
    process.env.DEMO_DATA_ENABLED = 'true';
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: DataSource, useValue: { query, transaction } },
        { provide: SessionService, useValue: { create: createSession } },
        { provide: AuditService, useValue: { securityEvent } }
      ]
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    api = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    restoreEnv('AUTH_MODE', originalEnv.authMode);
    restoreEnv('NODE_ENV', originalEnv.nodeEnv);
    restoreEnv('DEMO_DATA_ENABLED', originalEnv.demoEnabled);
  });

  beforeEach(() => {
    query.mockClear();
    createSession.mockClear();
    securityEvent.mockClear();
    process.env.AUTH_MODE = 'demo';
    process.env.NODE_ENV = 'development';
    process.env.DEMO_DATA_ENABLED = 'true';
  });

  it('only starts a session for a server-listed demo identity', async () => {
    const response = await api.post('/api/auth/demo/session')
      .set('Origin', 'http://127.0.0.1:4200')
      .send({ identityId: 1 })
      .expect(201);
    expect(createSession).toHaveBeenCalledWith(1, expect.any(Object));
    expect(response.body).toEqual({ authenticated: true });
    const cookies = response.headers['set-cookie'];
    if (!Array.isArray(cookies)) {
      throw new Error('Session cookies were not issued');
    }
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toContain('HttpOnly');
    expect(cookies[0]).toContain('SameSite=Strict');
    expect(cookies[0]).not.toContain('Secure');
    expect(response.text).not.toContain('opaque-session-token');
  });

  it('rejects identities that are not in the demo seed', async () => {
    await api.post('/api/auth/demo/session')
      .set('Origin', 'http://127.0.0.1:4200')
      .send({ identityId: 999 })
      .expect(401);
    expect(createSession).not.toHaveBeenCalled();
    expect(securityEvent).toHaveBeenCalledWith(null, expect.any(String), 'LOGIN', 'REJECTED');
  });

  it('rejects client-supplied profile assignments', async () => {
    await api.post('/api/auth/demo/session')
      .set('Origin', 'http://127.0.0.1:4200')
      .send({ identityId: 1, profiles: ['ADMIN'] })
      .expect(400);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('disables simulated authentication outside development', async () => {
    process.env.NODE_ENV = 'production';
    await api.post('/api/auth/demo/session')
      .set('Origin', 'http://127.0.0.1:4200')
      .send({ identityId: 1 })
      .expect(401);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('rejects demo session attempts from another origin', async () => {
    await api.post('/api/auth/demo/session')
      .set('Origin', 'http://evil.example')
      .send({ identityId: 1 })
      .expect(403);
    expect(createSession).not.toHaveBeenCalled();
    expect(securityEvent).toHaveBeenCalledWith(null, expect.any(String), 'LOGIN', 'REJECTED');
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
