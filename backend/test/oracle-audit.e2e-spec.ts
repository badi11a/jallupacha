import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { config } from 'dotenv';
import { resolve } from 'path';
import request from 'supertest';
import { DataSource } from 'typeorm';

// Requires the local Oracle database with all migrations applied and backend/.env configured.
// The runtime account cannot delete audit rows, so the test only appends and counts.
describe('security event audit (Oracle)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const originalSchema = process.env.ORACLE_SCHEMA;

  beforeAll(async () => {
    config({ path: resolve(__dirname, '../.env'), override: true });
    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    dataSource = app.get(DataSource);
    await dataSource.initialize();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (originalSchema === undefined) delete process.env.ORACLE_SCHEMA;
    else process.env.ORACLE_SCHEMA = originalSchema;
  });

  const schema = () => process.env.ORACLE_SCHEMA!.toUpperCase();
  const countDenied = async (): Promise<number> => {
    const rows = await dataSource.query(
      `SELECT COUNT(*) AS "count" FROM "${schema()}"."SECURITY_EVENT" E
       JOIN "${schema()}"."SECURITY_EVENT_IP" P ON P.SECURITY_EVENT_ID = E.ID
       WHERE E.EVENT = 'ACCESS_DENIED' AND E.RESULT = 'REJECTED' AND E.ACTOR_USER_ID IS NULL`
    );
    return Number(rows[0].count ?? rows[0].COUNT);
  };

  it('keeps the IP only in SECURITY_EVENT_IP', async () => {
    const columns = await dataSource.query(
      `SELECT COLUMN_NAME FROM ALL_TAB_COLUMNS WHERE OWNER = :1 AND TABLE_NAME = 'SECURITY_EVENT'`,
      [schema()]
    );
    expect(columns.map((c: { COLUMN_NAME: string }) => c.COLUMN_NAME)).not.toContain('IP_ADDRESS');
  });

  it('rejects an unauthenticated request with 401 and records the event with its IP', async () => {
    const before = await countDenied();
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    expect(await countDenied()).toBe(before + 1);
  });
});
