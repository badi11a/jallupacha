import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { AuditEntity } from '../src/audit/audit.entity';
import { AuditService } from '../src/audit/audit.service';
import { databaseOptions } from '../src/common/config';
import { AuthenticatedUser } from '../src/common/auth.types';
import { CatalogService } from '../src/structure/catalog.service';
import { MacroprocessEntity } from '../src/structure/macroprocess.entity';
import { ProcessTypeEntity } from '../src/structure/process-type.entity';
import { ProcessService } from '../src/process/process.service';

describe('process drafts (Oracle)', () => {
  let dataSource: DataSource;
  let processes: ProcessService;
  let catalogs: CatalogService;
  let audit: AuditService;
  let owner: AuthenticatedUser;
  let secondOwnerId: number;
  let admin: AuthenticatedUser;
  let macroprocessId: number;
  let processTypeId: number;
  const originalSchema = process.env.ORACLE_SCHEMA;
  const originalDatabaseUser = process.env.DATABASE_USER;

  beforeAll(async () => {
    config({ path: resolve(__dirname, '../.env'), override: true });
    dataSource = new DataSource(databaseOptions());
    await dataSource.initialize();
    audit = new AuditService(dataSource);
    processes = new ProcessService(dataSource, audit);
    catalogs = new CatalogService(dataSource, audit);

    const owners: Array<{ id: number }> = await dataSource.query(
      `SELECT U.ID AS "id" FROM "${process.env.ORACLE_SCHEMA!.toUpperCase()}"."APP_USER" U
       JOIN "${process.env.ORACLE_SCHEMA!.toUpperCase()}"."USER_PROFILE" UP ON UP.USER_ID = U.ID
       WHERE U.IS_ACTIVE = 1 AND UP.PROFILE_CODE = 'PROCESS_OWNER'
       ORDER BY U.ID FETCH FIRST 2 ROWS ONLY`
    );
    expect(owners.length).toBeGreaterThanOrEqual(2);
    owner = { id: owners[0].id, profiles: ['PROCESS_OWNER'], sessionHash: '', csrfHash: '' };
    secondOwnerId = owners[1].id;
    const admins: Array<{ id: number }> = await dataSource.query(
      `SELECT U.ID AS "id" FROM "${process.env.ORACLE_SCHEMA!.toUpperCase()}"."APP_USER" U
       JOIN "${process.env.ORACLE_SCHEMA!.toUpperCase()}"."USER_PROFILE" UP ON UP.USER_ID = U.ID
       WHERE U.IS_ACTIVE = 1 AND UP.PROFILE_CODE = 'ADMIN'
       ORDER BY U.ID FETCH FIRST 1 ROWS ONLY`
    );
    expect(admins).toHaveLength(1);
    admin = { id: admins[0].id, profiles: ['ADMIN'], sessionHash: '', csrfHash: '' };
    const macroprocess = await dataSource.getRepository(MacroprocessEntity).findOneByOrFail({ isActive: 1 });
    let processType = await dataSource.getRepository(ProcessTypeEntity).findOneBy({ isActive: 1 });
    if (!processType) {
      processType = await catalogs.createProcessType(admin.id, {
        name: `Tipo de verificación ${Date.now()}`
      });
    }
    macroprocessId = macroprocess.id;
    processTypeId = processType.id;
  });

  afterAll(async () => {
    await dataSource?.destroy();
    restoreEnvironment('ORACLE_SCHEMA', originalSchema);
    restoreEnvironment('DATABASE_USER', originalDatabaseUser);
  });

  it('creates, edits, reloads, audits, protects ownership/revision and blocks catalog deactivation', async () => {
    const beforeCountRows: Array<{ total: number }> = await dataSource.query(
      `SELECT COUNT(*) AS "total" FROM "${process.env.ORACLE_SCHEMA!.toUpperCase()}"."PROCESS"`
    );
    const failingAudit = new AuditService(dataSource);
    jest.spyOn(failingAudit, 'record').mockRejectedValueOnce(new Error('Injected audit failure'));
    const failingService = new ProcessService(dataSource, failingAudit);
    await expect(failingService.create(owner, {
      macroprocessId,
      processTypeId,
      name: 'Transactional verification'
    })).rejects.toThrow('Injected audit failure');
    const afterCountRows: Array<{ total: number }> = await dataSource.query(
      `SELECT COUNT(*) AS "total" FROM "${process.env.ORACLE_SCHEMA!.toUpperCase()}"."PROCESS"`
    );
    expect(afterCountRows[0].total).toBe(beforeCountRows[0].total);

    const marker = `Incremento 2 ${Date.now()}`;
    const created = await processes.create(owner, {
      macroprocessId,
      processTypeId,
      name: marker
    });
    const processId = Number(created.id);
    expect(Number.isSafeInteger(processId)).toBe(true);
    expect(created).toMatchObject({
      code: expect.stringMatching(/^PR\d+$/),
      ownerUserId: owner.id,
      ownerDisplayName: expect.any(String),
      status: 'Borrador',
      versionNumber: 1,
      revision: 1,
      name: marker,
      alias: null,
      description: null,
      parentProcessId: null,
      internalUnits: null,
      bpmnModel: null
    });

    const child = await processes.create(owner, {
      macroprocessId,
      processTypeId,
      name: `${marker} hijo`,
      parentProcessId: processId
    });
    const childId = Number(child.id);
    expect(Number.isSafeInteger(childId)).toBe(true);
    await expect(processes.update(processId, owner, {
      revision: 1,
      parentProcessId: childId
    })).rejects.toThrow('Parent process would create a cycle');

    const updated = await processes.update(processId, owner, {
      revision: 1,
      name: `${marker} actualizado`,
      description: 'Ficha persistida en Oracle',
      involvedParties: 'Equipo de procesos'
    });
    expect(updated).toMatchObject({
      revision: 2,
      name: `${marker} actualizado`,
      description: 'Ficha persistida en Oracle',
      involvedParties: 'Equipo de procesos'
    });
    await expect(processes.update(processId, owner, {
      revision: 1,
      name: 'Revisión obsoleta'
    })).rejects.toThrow('Process was changed by another request');

    const unauthorizedOwner: AuthenticatedUser = {
      id: secondOwnerId,
      profiles: ['PROCESS_OWNER'],
      sessionHash: '',
      csrfHash: ''
    };
    await expect(processes.update(processId, unauthorizedOwner, {
      revision: 2,
      name: 'Edición ajena'
    })).rejects.toThrow('Forbidden');

    const reassigned = await processes.reassignOwner(processId, admin, {
      ownerUserId: secondOwnerId,
      revision: 2
    });
    expect(reassigned).toMatchObject({
      ownerUserId: secondOwnerId,
      revision: 3
    });
    const reloaded = await processes.get(processId);
    expect(reloaded).toMatchObject({
      code: created.code,
      ownerUserId: secondOwnerId,
      revision: 3,
      status: 'Borrador',
      name: `${marker} actualizado`
    });

    const auditRows: Array<{ action: string; beforeValue: string; afterValue: string }> = await dataSource.query(
      `SELECT ACTION AS "action", BEFORE_VALUE AS "beforeValue", AFTER_VALUE AS "afterValue"
       FROM "${process.env.ORACLE_SCHEMA!.toUpperCase()}"."AUDIT"
       WHERE ENTITY_TYPE = 'PROCESS' AND ENTITY_ID = :1
       ORDER BY ID`,
      [String(processId)]
    );
    expect(auditRows.map((row) => row.action)).toEqual([
      'PROCESS_CREATED',
      'PROCESS_UPDATED',
      'PROCESS_OWNER_REASSIGNED'
    ]);
    expect(JSON.parse(auditRows[1].beforeValue).name).toBe(marker);
    expect(JSON.parse(auditRows[1].afterValue).name).toBe(`${marker} actualizado`);
    expect(JSON.parse(auditRows[2].beforeValue).ownerUserId).toBe(owner.id);
    expect(JSON.parse(auditRows[2].afterValue).ownerUserId).toBe(secondOwnerId);
    expect(auditRows.some((row) => /email|displayName/i.test(row.beforeValue + row.afterValue))).toBe(false);

    await expect(catalogs.deactivateMacroprocess(admin.id, macroprocessId))
      .rejects.toThrow('Macroprocess has');
    await expect(catalogs.deactivateProcessType(admin.id, processTypeId))
      .rejects.toThrow('Process type has');
  });
});

function restoreEnvironment(name: string, original: string | undefined): void {
  if (original === undefined) delete process.env[name];
  else process.env[name] = original;
}
