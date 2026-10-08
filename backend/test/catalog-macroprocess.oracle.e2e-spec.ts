import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { AuditEntity } from '../src/audit/audit.entity';
import { AuditService } from '../src/audit/audit.service';
import { databaseOptions } from '../src/common/config';
import { MacroprocessEntity } from '../src/structure/macroprocess.entity';
import { CatalogService } from '../src/structure/catalog.service';
import { UpdateMacroprocessDto } from '../src/structure/catalog.dto';

describe('macroprocess edit (Oracle)', () => {
  let dataSource: DataSource;
  let catalogs: CatalogService;
  const originalSchema = process.env.ORACLE_SCHEMA;
  const originalDatabaseUser = process.env.DATABASE_USER;

  beforeAll(async () => {
    config({ path: resolve(__dirname, '../.env'), override: true });
    dataSource = new DataSource(databaseOptions());
    await dataSource.initialize();
    catalogs = new CatalogService(dataSource, new AuditService(dataSource));
  });

  afterAll(async () => {
    await dataSource?.destroy();
    restoreEnvironment('ORACLE_SCHEMA', originalSchema);
    restoreEnvironment('DATABASE_USER', originalDatabaseUser);
  });

  it('edits, reloads persisted values, and verifies the matching audit entry', async () => {
    const rows: Array<{ id: number; name: string; description: string | null; order: number }> =
      await dataSource.getRepository(MacroprocessEntity).find({
        order: { id: 'ASC' },
        take: 1
      });
    expect(rows).toHaveLength(1);
    const original = rows[0];
    const actors: Array<{ id: number }> = await dataSource.query(
      `SELECT U.ID AS "id" FROM "${process.env.ORACLE_SCHEMA!.toUpperCase()}"."APP_USER" U
       JOIN "${process.env.ORACLE_SCHEMA!.toUpperCase()}"."USER_PROFILE" P ON P.USER_ID = U.ID
       WHERE P.PROFILE_CODE = 'ADMIN' AND U.IS_ACTIVE = 1 FETCH FIRST 1 ROWS ONLY`
    );
    expect(actors).toHaveLength(1);
    const previousAudit = await dataSource.getRepository(AuditEntity).maximum('id') ?? 0;
    const marker = `C002-${Date.now()}`;
    const input: UpdateMacroprocessDto = {
      name: marker,
      description: `Oracle regression ${marker}`,
      order: original.order + 1
    };

    try {
      await catalogs.updateMacroprocess(actors[0].id, original.id, input);

      const reloaded = await dataSource.getRepository(MacroprocessEntity).findOneByOrFail({ id: original.id });
      expect(reloaded).toMatchObject({
        name: input.name,
        description: input.description,
        order: input.order
      });

      const auditRows: Array<{ action: string; entityId: string; beforeValue: string; afterValue: string }> =
        await dataSource.query(
          `SELECT ACTION AS "action", ENTITY_ID AS "entityId",
                  BEFORE_VALUE AS "beforeValue", AFTER_VALUE AS "afterValue"
           FROM "${process.env.ORACLE_SCHEMA!.toUpperCase()}"."AUDIT"
           WHERE ID > :1 AND ACTION = 'MACROPROCESS_UPDATED' AND ENTITY_ID = :2
           ORDER BY ID DESC FETCH FIRST 1 ROWS ONLY`,
          [previousAudit, String(original.id)]
        );
      expect(auditRows).toHaveLength(1);
      expect(auditRows[0].action).toBe('MACROPROCESS_UPDATED');
      expect(JSON.parse(auditRows[0].beforeValue)).toMatchObject({
        name: original.name,
        description: original.description,
        order: original.order
      });
      expect(JSON.parse(auditRows[0].afterValue)).toMatchObject(input);
    } finally {
      await catalogs.updateMacroprocess(actors[0].id, original.id, {
        name: original.name,
        description: original.description ?? '',
        order: original.order
      });
    }
  });
});

function restoreEnvironment(name: string, original: string | undefined): void {
  if (original === undefined) delete process.env[name];
  else process.env[name] = original;
}
