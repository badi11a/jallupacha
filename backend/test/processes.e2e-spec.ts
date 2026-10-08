import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuditService } from '../src/audit/audit.service';
import { AuthGuard } from '../src/auth/auth.guard';
import { SessionService } from '../src/auth/session.service';
import { AuthenticatedUser } from '../src/common/auth.types';
import { ProcessController } from '../src/process/process.controller';
import { ProcessService } from '../src/process/process.service';
import { UsersController } from '../src/identity/users.controller';
import { DataSource } from 'typeorm';

describe('process endpoint authorization', () => {
  let app: INestApplication;
  let api: ReturnType<typeof request>;
  let activeUser: { id: number; profiles: string[] } = { id: 10, profiles: ['CONSULTATION'] };
  const securityEvent = jest.fn();
  const service = {
    list: jest.fn(async () => ({ items: [], total: 0, page: 1, limit: 20 })),
    create: jest.fn(async (actor: AuthenticatedUser) => ({ ownerUserId: actor.id })),
    get: jest.fn(async (id: number) => ({ id })),
    update: jest.fn(async (id: number) => ({ id })),
    reassignOwner: jest.fn(async (id: number) => ({ id }))
  };
  const sessionService = {
    authenticate: jest.fn(async (token?: string) => token === 'valid-session'
      ? { ...activeUser, sessionHash: 'stored-hash', csrfHash: 'stored-csrf-hash' }
      : null),
    verifyCsrf: jest.fn((token?: string) => token === 'valid-csrf')
  };
  const dataSource = { query: jest.fn(async () => []) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProcessController, UsersController],
      providers: [
        { provide: ProcessService, useValue: service },
        { provide: DataSource, useValue: dataSource },
        { provide: SessionService, useValue: sessionService },
        { provide: AuditService, useValue: { securityEvent, record: jest.fn() } },
        { provide: APP_GUARD, useClass: AuthGuard }
      ]
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false }
    }));
    await app.init();
    api = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    activeUser = { id: 10, profiles: ['CONSULTATION'] };
    jest.clearAllMocks();
  });

  it('requires a session to read the process listing and permits authenticated reading', async () => {
    await api.get('/api/processes').expect(401);
    await api.get('/api/processes')
      .set('Cookie', 'jallupacha_session=valid-session')
      .expect(200, { items: [], total: 0, page: 1, limit: 20 });
  });

  it('denies consultation writes and permits a process owner with CSRF protection', async () => {
    const headers = {
      Cookie: 'jallupacha_session=valid-session; jallupacha_csrf=valid-csrf',
      'X-CSRF-Token': 'valid-csrf'
    };
    await api.post('/api/processes')
      .set(headers)
      .send({ macroprocessId: 1, processTypeId: 1 })
      .expect(403);

    activeUser = { id: 12, profiles: ['PROCESS_OWNER'] };
    await api.post('/api/processes')
      .set(headers)
      .send({ macroprocessId: 1, processTypeId: 1 })
      .expect(201, { ownerUserId: 12 });
  });

  it('rejects client-supplied owner, state and code fields', async () => {
    activeUser = { id: 12, profiles: ['PROCESS_OWNER'] };
    await api.post('/api/processes')
      .set({
        Cookie: 'jallupacha_session=valid-session; jallupacha_csrf=valid-csrf',
        'X-CSRF-Token': 'valid-csrf'
      })
      .send({ macroprocessId: 1, processTypeId: 1, ownerUserId: 20, status: 'Vigente', code: 'PR1' })
      .expect(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('rejects markup in process text', async () => {
    activeUser = { id: 12, profiles: ['PROCESS_OWNER'] };
    await api.post('/api/processes')
      .set({
        Cookie: 'jallupacha_session=valid-session; jallupacha_csrf=valid-csrf',
        'X-CSRF-Token': 'valid-csrf'
      })
      .send({ macroprocessId: 1, processTypeId: 1, name: '<script>alert(1)</script>' })
      .expect(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('keeps owner candidate and user listing APIs restricted to administrators', async () => {
    const cookie = 'jallupacha_session=valid-session';
    await api.get('/api/users/process-owners').set('Cookie', cookie).expect(403);
    await api.get('/api/users').set('Cookie', cookie).expect(403);

    activeUser = { id: 10, profiles: ['ADMIN'] };
    await api.get('/api/users/process-owners')
      .set('Cookie', cookie)
      .expect(200, []);
  });

  it('checks authorization metadata against the actual process controller route', async () => {
    activeUser = { id: 15, profiles: ['RISK_MANAGER'] };
    await api.patch('/api/processes/1')
      .set({
        Cookie: 'jallupacha_session=valid-session; jallupacha_csrf=valid-csrf',
        'X-CSRF-Token': 'valid-csrf'
      })
      .send({ revision: 1, name: 'Cambio' })
      .expect(403);
  });
});
