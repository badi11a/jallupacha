import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuditService } from '../src/audit/audit.service';
import { AuthGuard } from '../src/auth/auth.guard';
import { SessionService } from '../src/auth/session.service';
import { ProfileCode } from '../src/common/auth.types';
import { ProcessRecordsController } from '../src/process/process-records.controller';
import { ProcessRecordsService } from '../src/process/process-records.service';
import { ProcessLifecycleController } from '../src/process/process-lifecycle.controller';
import { ProcessLifecycleService } from '../src/process/process-lifecycle.service';
import { ProcessMapViewController } from '../src/process/process-map-view.controller';
import { ProcessMapViewService } from '../src/process/process-map-view.service';
import { ProcessRelationsController } from '../src/process/process-relations.controller';
import { ProcessRelationsService } from '../src/process/process-relations.service';
import { ProcessRisksController } from '../src/risk/process-risks.controller';
import { ProcessRisksService } from '../src/risk/process-risks.service';
import { ProcessTypesController } from '../src/structure/process-types.controller';
import { ProcessTypesService } from '../src/structure/process-types.service';
import { UnitsController } from '../src/structure/units.controller';
import { UnitsService } from '../src/structure/units.service';

type Verb = 'get' | 'post' | 'patch' | 'delete';
const routes: Array<[Verb, string, ProfileCode]> = [
  ['get', 'map', 'CONSULTATION'], ['get', 'processes', 'CONSULTATION'], ['get', 'processes/1', 'CONSULTATION'],
  ['post', 'processes', 'PROCESS_OWNER'], ['patch', 'processes/1', 'PROCESS_OWNER'],
  ['post', 'processes/1/submit', 'PROCESS_OWNER'], ['post', 'processes/1/approve', 'VALIDATOR'],
  ['post', 'processes/1/reject', 'VALIDATOR'], ['post', 'processes/1/new-version', 'PROCESS_OWNER'],
  ['post', 'processes/1/retire', 'ADMIN'],
  ['post', 'processes/1/risks', 'RISK_MANAGER'], ['patch', 'processes/1/risks/2', 'RISK_MANAGER'],
  ['delete', 'processes/1/risks/2', 'RISK_MANAGER'],
  ['post', 'processes/1/relations', 'PROCESS_OWNER'], ['patch', 'processes/1/relations/2', 'PROCESS_OWNER'],
  ['delete', 'processes/1/relations/2', 'PROCESS_OWNER'],
  ['get', 'process-types', 'CONSULTATION'], ['post', 'process-types', 'ADMIN'],
  ['patch', 'process-types/1', 'ADMIN'], ['patch', 'process-types/1/deactivate', 'ADMIN'],
  ['get', 'units', 'CONSULTATION'], ['post', 'units', 'ADMIN'],
  ['patch', 'units/1', 'ADMIN'], ['patch', 'units/1/deactivate', 'ADMIN']
];

describe('capture API authorization across real v15 domain controllers (PT-07)', () => {
  let app: INestApplication;
  let profiles: ProfileCode[];
  const invoked = jest.fn(async (..._arguments: unknown[]) => ({}));
  const service = (names: string[]) => Object.fromEntries(names.map(name => [name, invoked]));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProcessRecordsController, ProcessLifecycleController, ProcessMapViewController,
        ProcessRelationsController, ProcessRisksController, ProcessTypesController, UnitsController],
      providers: [
        { provide: ProcessRecordsService, useValue: service(['listProcesses', 'processDetail', 'createProcess', 'updateProcess']) },
        { provide: ProcessLifecycleService, useValue: service(['submitProcess', 'approveProcess', 'rejectProcess', 'newVersion', 'retireProcess']) },
        { provide: ProcessMapViewService, useValue: service(['map']) },
        { provide: ProcessRelationsService, useValue: service(['addRelation', 'updateRelation', 'deleteRelation']) },
        { provide: ProcessRisksService, useValue: service(['addRisk', 'updateRisk', 'deleteRisk']) },
        { provide: ProcessTypesService, useValue: service(['listProcessTypes', 'createProcessType', 'updateProcessType', 'deactivateProcessType']) },
        { provide: UnitsService, useValue: service(['listUnits', 'createUnit', 'updateUnit', 'deactivateUnit']) },
        {
          provide: SessionService, useValue: {
            authenticate: async (token?: string) => token === 'session' ? { id: 1, profiles, sessionHash: 'hash', csrfHash: 'csrf' } : null,
            verifyCsrf: (token: string) => token === 'csrf'
          }
        },
        { provide: AuditService, useValue: { securityEvent: jest.fn() } },
        { provide: APP_GUARD, useClass: AuthGuard }
      ]
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });
  afterAll(async () => { await app.close(); });
  beforeEach(() => { profiles = ['CONSULTATION']; invoked.mockClear(); });

  it.each(routes)('rejects anonymous %s %s before accessing data', async (verb, route) => {
    await request(app.getHttpServer())[verb](`/api/management/${route}`).expect(401);
    expect(invoked).not.toHaveBeenCalled();
  });

  const writes = routes.filter(([verb]) => verb !== 'get');
  it.each(writes)('rejects consultation writes with valid CSRF: %s %s', async (verb, route) => {
    await request(app.getHttpServer())[verb](`/api/management/${route}`)
      .set('Cookie', 'jallupacha_session=session; jallupacha_csrf=csrf').set('X-CSRF-Token', 'csrf').send({}).expect(403);
    expect(invoked).not.toHaveBeenCalled();
  });
  it.each(writes)('requires CSRF even for the permitted role: %s %s', async (verb, route, profile) => {
    profiles = [profile];
    await request(app.getHttpServer())[verb](`/api/management/${route}`)
      .set('Cookie', 'jallupacha_session=session').send({}).expect(403);
    expect(invoked).not.toHaveBeenCalled();
  });
  it.each(routes)('dispatches authorized %s %s to its domain service', async (verb, route, profile) => {
    profiles = [profile];
    const expected = verb === 'delete' ? 204 : verb === 'post' ? 201 : 200;
    await request(app.getHttpServer())[verb](`/api/management/${route}`)
      .set('Cookie', 'jallupacha_session=session; jallupacha_csrf=csrf').set('X-CSRF-Token', 'csrf').send({}).expect(expected);
    expect(invoked).toHaveBeenCalledTimes(1);
  });
  it('passes the authenticated actor to approval instead of accepting an absent actor', async () => {
    profiles = ['VALIDATOR'];
    await request(app.getHttpServer()).post('/api/management/processes/1/approve')
      .set('Cookie', 'jallupacha_session=session; jallupacha_csrf=csrf').set('X-CSRF-Token', 'csrf').send({}).expect(201);
    expect(invoked).toHaveBeenCalledWith(1, expect.objectContaining({ id: 1, profiles: ['VALIDATOR'] }));
  });

  it.each<[ProfileCode, string]>([
    ['PROCESS_OWNER', 'processes/1/approve'],
    ['PROCESS_OWNER', 'processes/1/retire'],
    ['PROCESS_OWNER', 'processes/1/risks'],
    ['ADMIN', 'processes/1/risks']
  ])('rejects a valid session with an unrelated business profile: %s %s', async (profile, route) => {
    profiles = [profile];
    await request(app.getHttpServer()).post(`/api/management/${route}`)
      .set('Cookie', 'jallupacha_session=session; jallupacha_csrf=csrf').set('X-CSRF-Token', 'csrf').send({}).expect(403);
    expect(invoked).not.toHaveBeenCalled();
  });
});
