import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { hashPassword } from '../common/security';
import { AuthController } from './auth.controller';
import { SessionService } from './session.service';

describe('AuthController - POST /api/auth/login', () => {
  let app: INestApplication;
  let validPasswordHash: string;
  const mockSecurityEvent = jest.fn();
  const mockCreateSession = jest.fn();
  const mockUpdateCredential = jest.fn();
  const mockDataSourceQuery = jest.fn();

  const mockTransaction = jest.fn(async (cb: (manager: unknown) => Promise<unknown>) => {
    const mockManager = {
      getRepository: () => ({
        update: mockUpdateCredential
      }),
      query: jest.fn(async () => [{ profileCode: 'ADMIN' }])
    };
    return cb(mockManager);
  });

  const mockDataSource = {
    query: mockDataSourceQuery,
    transaction: mockTransaction
  };

  beforeAll(async () => {
    validPasswordHash = await hashPassword('ClaveDemo2026!');
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: DataSource, useValue: mockDataSource },
        { provide: SessionService, useValue: { create: mockCreateSession } },
        { provide: AuditService, useValue: { securityEvent: mockSecurityEvent } }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('authenticates valid credentials, sets session and csrf cookies, and resets failure count', async () => {
    mockDataSourceQuery.mockResolvedValueOnce([
      {
        id: 1,
        isActive: 1,
        displayName: 'Usuario Administrador',
        email: 'admin@example.test',
        passwordHash: validPasswordHash,
        failedAttempts: 2,
        lockedUntil: null
      }
    ]);
    mockCreateSession.mockResolvedValueOnce({
      sessionToken: 'test-session-token-valid-abc1234567890123456789',
      csrfToken: 'test-csrf-token-valid-abc1234567890123456789'
    });

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@example.test', password: 'ClaveDemo2026!' })
      .expect(200);

    expect(response.body).toEqual({
      authenticated: true,
      userId: 1,
      displayName: 'Usuario Administrador',
      email: 'admin@example.test',
      profiles: ['ADMIN']
    });

    // Check Set-Cookie headers
    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('jallupacha_session='))).toBe(true);
    expect(cookies.some((c) => c.includes('jallupacha_csrf='))).toBe(true);

    // Check credential reset to 0
    expect(mockUpdateCredential).toHaveBeenCalledWith(
      { userId: 1 },
      { failedAttempts: 0, lockedUntil: null }
    );
    expect(mockSecurityEvent).toHaveBeenCalledWith(1, expect.any(String), 'LOGIN', 'SUCCESS', expect.anything());
  });

  it('rejects when email does not exist with neutral error message and logs event', async () => {
    mockDataSourceQuery.mockResolvedValueOnce([]);

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'unknown@example.test', password: 'ClaveDemo2026!' })
      .expect(401);

    expect(response.body.message).toBe('Credenciales no válidas');
    expect(mockSecurityEvent).toHaveBeenCalledWith(null, expect.any(String), 'LOGIN', 'REJECTED');
  });

  it('rejects when account is inactive', async () => {
    mockDataSourceQuery.mockResolvedValueOnce([
      {
        id: 2,
        isActive: 0,
        displayName: 'Usuario Inactivo',
        email: 'inactive@example.test',
        passwordHash: validPasswordHash,
        failedAttempts: 0,
        lockedUntil: null
      }
    ]);

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'inactive@example.test', password: 'ClaveDemo2026!' })
      .expect(401);

    expect(response.body.message).toBe('Credenciales no válidas');
    expect(mockSecurityEvent).toHaveBeenCalledWith(2, expect.any(String), 'LOGIN', 'REJECTED');
  });

  it('increments failed attempts on wrong password and returns neutral error', async () => {
    mockDataSourceQuery.mockResolvedValueOnce([
      {
        id: 3,
        isActive: 1,
        displayName: 'Usuario',
        email: 'user@example.test',
        passwordHash: validPasswordHash,
        failedAttempts: 1,
        lockedUntil: null
      }
    ]);

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'user@example.test', password: 'WrongPassword123!' })
      .expect(401);

    expect(response.body.message).toBe('Credenciales no válidas');
    expect(mockUpdateCredential).toHaveBeenCalledWith(
      { userId: 3 },
      { failedAttempts: 2, lockedUntil: null }
    );
    expect(mockSecurityEvent).toHaveBeenCalledWith(3, expect.any(String), 'LOGIN', 'REJECTED', expect.anything());
  });

  it('locks account for 15 minutes upon 5th consecutive failed attempt', async () => {
    mockDataSourceQuery.mockResolvedValueOnce([
      {
        id: 4,
        isActive: 1,
        displayName: 'Usuario Bloqueado',
        email: 'locked@example.test',
        passwordHash: validPasswordHash,
        failedAttempts: 4,
        lockedUntil: null
      }
    ]);

    const beforeAttempt = Date.now();
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'locked@example.test', password: 'WrongPassword123!' })
      .expect(401);

    expect(response.body.message).toBe('Credenciales no válidas');
    expect(mockUpdateCredential).toHaveBeenCalledWith(
      { userId: 4 },
      {
        failedAttempts: 5,
        lockedUntil: expect.any(Date)
      }
    );
    const lockedDate: Date = mockUpdateCredential.mock.calls[0][1].lockedUntil;
    expect(lockedDate.getTime()).toBeGreaterThanOrEqual(beforeAttempt + 14 * 60 * 1000);
    expect(lockedDate.getTime()).toBeLessThanOrEqual(Date.now() + 16 * 60 * 1000);
    expect(mockSecurityEvent).toHaveBeenCalledWith(4, expect.any(String), 'LOGIN', 'REJECTED', expect.anything());
  });

  it('rejects immediately when account is currently locked without checking password', async () => {
    const futureLock = new Date(Date.now() + 10 * 60 * 1000);
    mockDataSourceQuery.mockResolvedValueOnce([
      {
        id: 5,
        isActive: 1,
        displayName: 'Usuario En Bloqueo',
        email: 'still-locked@example.test',
        passwordHash: validPasswordHash,
        failedAttempts: 5,
        lockedUntil: futureLock
      }
    ]);

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'still-locked@example.test', password: 'ClaveDemo2026!' })
      .expect(401);

    expect(response.body.message).toBe('Credenciales no válidas');
    expect(mockUpdateCredential).not.toHaveBeenCalled();
    expect(mockCreateSession).not.toHaveBeenCalled();
    expect(mockSecurityEvent).toHaveBeenCalledWith(5, expect.any(String), 'LOGIN', 'REJECTED');
  });

  it('validates DTO inputs rejecting invalid formats with 400 Bad Request', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'invalid-email', password: 'short' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@example.test' })
      .expect(400);
  });
});
