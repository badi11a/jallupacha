import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { config } from 'dotenv';
import { resolve } from 'path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuditService } from '../src/audit/audit.service';
import { databaseOptions } from '../src/common/config';
import { AuthenticatedUser } from '../src/common/auth.types';
import { AuthGuard } from '../src/auth/auth.guard';
import { SessionService } from '../src/auth/session.service';
import { ProcessController } from '../src/process/process.controller';
import { ProcessMapController } from '../src/process/process-map.controller';
import { ProcessMapService } from '../src/process/process-map.service';
import { ProcessService } from '../src/process/process.service';
import { RiskCatalogController } from '../src/risk/risk-catalog.controller';
import { RiskController } from '../src/risk/risk.controller';
import { RiskService } from '../src/risk/risk.service';
import { MacroprocessEntity } from '../src/structure/macroprocess.entity';
import { ProcessTypeEntity } from '../src/structure/process-type.entity';

describe('Release 01 internal process map and risk flow (Oracle)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let macroprocess: MacroprocessEntity;
  let processType: ProcessTypeEntity;
  let owner: AuthenticatedUser;
  let otherOwner: AuthenticatedUser;
  let riskManager: AuthenticatedUser;
  let consultation: AuthenticatedUser;
  let riskTypeId: number;
  let riskLevelId: number;

  const actors = new Map<string, AuthenticatedUser>();
  const sessionService = {
    authenticate: jest.fn(async (token?: string) => token ? actors.get(token) ?? null : null),
    verifyCsrf: jest.fn(() => true)
  };

  beforeAll(async () => {
    config({ path: resolve(__dirname, '../.env'), override: true });
    dataSource = new DataSource(databaseOptions());
    await dataSource.initialize();

    const schema = process.env.ORACLE_SCHEMA!.toUpperCase();
    const findActor = async (profile: string, excludedId?: number): Promise<AuthenticatedUser> => {
      const rows: Array<{ id: number | string }> = await dataSource.query(
        `SELECT U.ID AS "id"
         FROM "${schema}"."APP_USER" U
         JOIN "${schema}"."USER_PROFILE" UP ON UP.USER_ID = U.ID
         WHERE U.IS_ACTIVE = 1 AND UP.PROFILE_CODE = :1
           AND (:2 IS NULL OR U.ID <> :3)
         ORDER BY U.ID FETCH FIRST 1 ROWS ONLY`,
        [profile, excludedId ?? null, excludedId ?? null]
      );
      if (!rows.length) throw new Error(`A seeded ${profile} account is required.`);
      return {
        id: Number(rows[0].id),
        profiles: [profile as AuthenticatedUser['profiles'][number]],
        sessionHash: '',
        csrfHash: ''
      };
    };
    owner = await findActor('PROCESS_OWNER');
    otherOwner = await findActor('PROCESS_OWNER', owner.id);
    riskManager = await findActor('RISK_MANAGER');
    consultation = await findActor('CONSULTATION');
    actors.set('owner-session', owner);
    actors.set('other-owner-session', otherOwner);
    actors.set('risk-manager-session', riskManager);
    actors.set('consultation-session', consultation);

    macroprocess = await dataSource.getRepository(MacroprocessEntity)
      .findOneByOrFail({ name: 'Misionales', isActive: 1 });
    processType = await dataSource.getRepository(ProcessTypeEntity)
      .findOneByOrFail({ isActive: 1 });
    const riskTypes: Array<{ id: number | string }> = await dataSource.query(
      `SELECT ID AS "id" FROM "${schema}"."RISK_TYPE" WHERE IS_ACTIVE = 1 ORDER BY ID FETCH FIRST 1 ROWS ONLY`
    );
    const riskLevels: Array<{ id: number | string }> = await dataSource.query(
      `SELECT ID AS "id" FROM "${schema}"."RISK_LEVEL" WHERE IS_ACTIVE = 1 ORDER BY ID FETCH FIRST 1 ROWS ONLY`
    );
    if (!riskTypes.length || !riskLevels.length) throw new Error('Active risk lists must be seeded.');
    riskTypeId = Number(riskTypes[0].id);
    riskLevelId = Number(riskLevels[0].id);

    const audit = new AuditService(dataSource);
    const moduleRef = await Test.createTestingModule({
      controllers: [
        ProcessController,
        ProcessMapController,
        RiskController,
        RiskCatalogController
      ],
      providers: [
        { provide: DataSource, useValue: dataSource },
        { provide: AuditService, useValue: audit },
        { provide: SessionService, useValue: sessionService },
        { provide: ProcessService, useValue: new ProcessService(dataSource, audit) },
        { provide: ProcessMapService, useValue: new ProcessMapService(dataSource) },
        { provide: RiskService, useValue: new RiskService(dataSource, audit) },
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
  });

  afterAll(async () => {
    await app?.close();
    await dataSource?.destroy();
  });

  it('navigates map → macroprocess → draft ficha → risk list with server-side permissions', async () => {
    const marker = `Navegación institucional ${Date.now()}`;
    const ownerCookie = 'jallupacha_session=owner-session; jallupacha_csrf=oracle-csrf';
    const created = await request(app.getHttpServer())
      .post('/api/processes')
      .set('Cookie', ownerCookie)
      .set('X-CSRF-Token', 'oracle-csrf')
      .send({
        macroprocessId: macroprocess.id,
        processTypeId: processType.id,
        name: marker,
        description: 'Descripción genérica para verificar la navegación interna.'
      })
      .expect(201);
    expect(created.body.status).toBe('Borrador');

    const map = await request(app.getHttpServer())
      .get('/api/process-map')
      .set('Cookie', 'jallupacha_session=owner-session')
      .expect(200);
    const macro = map.body.macroprocesses.find((item: { id: number }) => item.id === macroprocess.id);
    expect(macro).toBeDefined();
    const processNode = macro.processTypes
      .flatMap((item: { processes: Array<{ id: number; name: string; status: string }> }) => item.processes)
      .find((item: { id: number }) => item.id === created.body.id);
    expect(processNode).toMatchObject({ name: marker, status: 'Borrador' });

    const detail = await request(app.getHttpServer())
      .get(`/api/processes/${processNode.id}`)
      .set('Cookie', 'jallupacha_session=owner-session')
      .expect(200);
    expect(detail.body).toMatchObject({
      id: created.body.id,
      name: marker,
      status: 'Borrador',
      macroprocessId: macroprocess.id
    });

    await request(app.getHttpServer())
      .post(`/api/processes/${processNode.id}/risks`)
      .set('Cookie', 'jallupacha_session=risk-manager-session; jallupacha_csrf=oracle-csrf')
      .set('X-CSRF-Token', 'oracle-csrf')
      .send({
        description: 'La atención puede retrasarse ante una interrupción.',
        cause: 'Una dependencia de coordinación puede no estar disponible.',
        consequence: 'Las solicitudes tardan más en resolverse.',
        riskTypeId,
        riskLevelId
      })
      .expect(201);

    const risks = await request(app.getHttpServer())
      .get(`/api/processes/${processNode.id}/risks?page=1&limit=20`)
      .set('Cookie', 'jallupacha_session=owner-session')
      .expect(200);
    expect(risks.body).toMatchObject({
      page: 1,
      limit: 20,
      total: 1,
      items: [expect.objectContaining({
        processId: created.body.id,
        description: 'La atención puede retrasarse ante una interrupción.',
        cause: 'Una dependencia de coordinación puede no estar disponible.',
        consequence: 'Las solicitudes tardan más en resolverse.',
        riskTypeId,
        riskLevelId
      })]
    });

    await request(app.getHttpServer())
      .get(`/api/processes/${processNode.id}/risks`)
      .set('Cookie', 'jallupacha_session=other-owner-session')
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/processes/${processNode.id}/risks`)
      .set('Cookie', 'jallupacha_session=consultation-session')
      .expect(403);

    const schema = process.env.ORACLE_SCHEMA!.toUpperCase();
    const auditRows: Array<{ action: string }> = await dataSource.query(
      `SELECT ACTION AS "action" FROM "${schema}"."AUDIT"
       WHERE ENTITY_TYPE = 'PROCESS_RISK' AND ENTITY_ID = :1`,
      [String(risks.body.items[0].id)]
    );
    expect(auditRows.map((row) => row.action)).toEqual(['PROCESS_RISK_CREATED']);
  });
});
