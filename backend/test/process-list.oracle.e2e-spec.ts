import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { AuditService } from '../src/audit/audit.service';
import { databaseOptions } from '../src/common/config';
import { AuthenticatedUser } from '../src/common/auth.types';
import { AuthGuard } from '../src/auth/auth.guard';
import { SessionService } from '../src/auth/session.service';
import { ProcessController } from '../src/process/process.controller';
import { ListProcessesQueryDto } from '../src/process/process.dto';
import { ProcessService } from '../src/process/process.service';
import { MacroprocessEntity } from '../src/structure/macroprocess.entity';
import { ProcessTypeEntity } from '../src/structure/process-type.entity';

describe('process create-list-detail HTTP flow (Oracle)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let processes: ProcessService;
  let owner: AuthenticatedUser;
  let macroprocessId: number;
  let processTypeId: number;
  const sessionService = {
    authenticate: jest.fn(),
    verifyCsrf: jest.fn(() => true)
  };

  beforeAll(async () => {
    config({ path: resolve(__dirname, '../.env'), override: true });
    dataSource = new DataSource(databaseOptions());
    await dataSource.initialize();
    const audit = new AuditService(dataSource);
    processes = new ProcessService(dataSource, audit);

    const schema = process.env.ORACLE_SCHEMA!.toUpperCase();
    const owners: Array<{ id: number }> = await dataSource.query(
      `SELECT U.ID AS "id" FROM "${schema}"."APP_USER" U
       JOIN "${schema}"."USER_PROFILE" UP ON UP.USER_ID = U.ID
       WHERE U.IS_ACTIVE = 1 AND UP.PROFILE_CODE = 'PROCESS_OWNER'
       ORDER BY U.ID FETCH FIRST 1 ROWS ONLY`
    );
    expect(owners).toHaveLength(1);
    owner = { id: owners[0].id, profiles: ['PROCESS_OWNER'], sessionHash: '', csrfHash: '' };
    sessionService.authenticate.mockImplementation(async (token?: string) =>
      token === 'oracle-test-session' ? owner : null
    );
    macroprocessId = (await dataSource.getRepository(MacroprocessEntity)
      .findOneByOrFail({ isActive: 1 })).id;
    processTypeId = (await dataSource.getRepository(ProcessTypeEntity)
      .findOneByOrFail({ isActive: 1 })).id;

    const moduleRef = await Test.createTestingModule({
      controllers: [ProcessController],
      providers: [
        { provide: ProcessService, useValue: processes },
        { provide: DataSource, useValue: dataSource },
        { provide: AuditService, useValue: audit },
        { provide: SessionService, useValue: sessionService },
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

  it('creates a draft, lists with Angular pagination, then opens its ficha', async () => {
    const marker = `C-003 ${Date.now()}`;
    const cookie = 'jallupacha_session=oracle-test-session; jallupacha_csrf=oracle-test-csrf';
    const created = await request(app.getHttpServer())
      .post('/api/processes')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', 'oracle-test-csrf')
      .send({ macroprocessId, processTypeId, name: marker })
      .expect(201);

    expect(created.body).toMatchObject({
      code: expect.stringMatching(/^PR\d+$/),
      ownerUserId: owner.id,
      status: 'Borrador',
      name: marker
    });

    const listSpy = jest.spyOn(processes, 'list');
    const list = await request(app.getHttpServer())
      .get('/api/processes?page=1&limit=20')
      .set('Cookie', 'jallupacha_session=oracle-test-session')
      .expect(200);
    expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
    expect(typeof listSpy.mock.calls[0][0].page).toBe('number');
    expect(typeof listSpy.mock.calls[0][0].limit).toBe('number');
    const untransformedQuery = Object.assign(new ListProcessesQueryDto(), {
      page: '1',
      limit: '20'
    });
    const normalizedList = await processes.list(untransformedQuery);
    expect(normalizedList.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: created.body.id })
    ]));
    await expect(processes.list(Object.assign(new ListProcessesQueryDto(), { limit: '101' })))
      .rejects.toThrow('Invalid pagination values');
    expect(list.body).toMatchObject({
      page: 1,
      limit: 20,
      items: expect.arrayContaining([
        expect.objectContaining({
          id: created.body.id,
          code: created.body.code,
          name: marker,
          status: 'Borrador'
        })
      ])
    });

    const detail = await request(app.getHttpServer())
      .get(`/api/processes/${created.body.id}`)
      .set('Cookie', 'jallupacha_session=oracle-test-session')
      .expect(200);
    expect(detail.body).toMatchObject({
      id: created.body.id,
      code: created.body.code,
      ownerUserId: owner.id,
      status: 'Borrador',
      name: marker
    });

    const auditRows: Array<{ action: string }> = await dataSource.query(
      `SELECT ACTION AS "action" FROM "${process.env.ORACLE_SCHEMA!.toUpperCase()}"."AUDIT"
       WHERE ENTITY_TYPE = 'PROCESS' AND ENTITY_ID = :1`,
      [String(created.body.id)]
    );
    expect(auditRows.map((row) => row.action)).toEqual(['PROCESS_CREATED']);
  });
});
