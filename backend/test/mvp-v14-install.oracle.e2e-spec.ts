import { DataSource, EntityManager } from 'typeorm';
import { databaseOptions } from '../src/common/config';

const oracleOptIn = process.env.MVP_V14_ORACLE_TEST === 'true';
const oracleDescribe = oracleOptIn ? describe : describe.skip;
let dataSourceForOracle: DataSource | undefined;

const APPLICATION_TABLES = [
  'MACROPROCESS_TYPE',
  'MACROPROCESS',
  'PROCESS_TYPE',
  'ORGANIZATIONAL_UNIT',
  'PROCESS',
  'PROCESS_VERSION',
  'PROCESS_UNIT',
  'PROCESS_RISK',
  'PROCESS_RELATION'
];

const LEGACY_TABLES = [
  'APP_USER',
  'APP_PROFILE',
  'USER_PROFILE',
  'USER_IDENTITY',
  'DEMO_IDENTITY',
  'APP_SESSION',
  'AUDIT',
  'SECURITY_EVENT',
  'SECURITY_EVENT_IP',
  'RISK_TYPE',
  'RISK_LEVEL'
];

interface IdRow {
  id: number | string;
}

interface ClassifiedTypeRow {
  macroprocessId: number | string;
  processTypeId: number | string;
}

oracleDescribe('MVP v14 Oracle installation', () => {
  let schema: string;

  beforeAll(async () => {
    if (!oracleOptIn) return;

    const requiredVariables = [
      'ORACLE_HOST',
      'ORACLE_PORT',
      'ORACLE_SERVICE',
      'ORACLE_SCHEMA',
      'MIGRATION_USER',
      'MIGRATION_PASSWORD',
      'MVP_V14_ORACLE_SCHEMA'
    ];
    const missing = requiredVariables.filter((name) => !process.env[name]?.trim());
    if (missing.length) {
      throw new Error(
        `MVP_V14_ORACLE_TEST=true requires explicit Oracle configuration: ${missing.join(', ')}`
      );
    }

    schema = process.env.ORACLE_SCHEMA!.trim().toUpperCase();
    if (process.env.MVP_V14_ORACLE_SCHEMA!.trim().toUpperCase() !== schema) {
      throw new Error('MVP_V14_ORACLE_SCHEMA must explicitly match ORACLE_SCHEMA.');
    }
    if (process.env.MIGRATION_USER!.trim().toUpperCase() !== schema) {
      throw new Error('MVP v14 Oracle install tests must connect as the ORACLE_SCHEMA owner.');
    }

    dataSourceForOracle = new DataSource(databaseOptions(true));
    await dataSourceForOracle.initialize();
  });

  afterAll(async () => {
    if (dataSourceForOracle?.isInitialized) await dataSourceForOracle.destroy();
  });

  it('has exactly the v14 tables and no user, session, audit, or configurable risk tables', async () => {
    const rows: Array<{ tableName: string }> = await oracle().query(
      'SELECT TABLE_NAME AS "tableName" FROM USER_TABLES ORDER BY TABLE_NAME'
    );
    const actual = rows.map((row) => row.tableName);
    const migrationTables = actual.filter((name) => name.toUpperCase() === 'MIGRATIONS');

    expect(migrationTables).toHaveLength(1);
    expect([...actual].sort()).toEqual([...APPLICATION_TABLES, migrationTables[0]].sort());
    expect(actual.map((name) => name.toUpperCase())).not.toEqual(
      expect.arrayContaining(LEGACY_TABLES)
    );
  });

  it('contains the fixed v14 demonstration seed counts', async () => {
    const counts: Array<{
      macroprocessTypes: number | string;
      macroprocesses: number | string;
      processTypes: number | string;
      processes: number | string;
      risks: number | string;
      responsibleUnits: number | string;
    }> = await oracle().query(
      `SELECT
         (SELECT COUNT(*) FROM "${schema}"."MACROPROCESS_TYPE") AS "macroprocessTypes",
         (SELECT COUNT(*) FROM "${schema}"."MACROPROCESS") AS "macroprocesses",
         (SELECT COUNT(*) FROM "${schema}"."PROCESS_TYPE") AS "processTypes",
         (SELECT COUNT(*) FROM "${schema}"."PROCESS") AS "processes",
         (SELECT COUNT(*) FROM "${schema}"."PROCESS_RISK") AS "risks",
         (SELECT COUNT(*) FROM "${schema}"."PROCESS_UNIT" WHERE ROLE = 'RESPONSABLE') AS "responsibleUnits"
       FROM DUAL`
    );

    expect({
      macroprocessTypes: Number(counts[0].macroprocessTypes),
      macroprocesses: Number(counts[0].macroprocesses),
      processTypes: Number(counts[0].processTypes),
      processes: Number(counts[0].processes),
      risks: Number(counts[0].risks),
      responsibleUnits: Number(counts[0].responsibleUnits)
    }).toEqual({
      macroprocessTypes: 3,
      macroprocesses: 3,
      processTypes: 6,
      processes: 24,
      risks: 24,
      responsibleUnits: 24
    });
  });

  it('rejects a risk with an invalid level', async () => {
    const processId = await seededProcessId();
    await expectConstraintRejection(async (manager) => {
      await manager.query(
        `INSERT INTO "${schema}"."PROCESS_RISK"
          (PROCESS_ID, DESCRIPTION, CAUSE, CONSEQUENCE, RISK_TYPE, RISK_LEVEL)
         VALUES (:1, :2, :3, :4, :5, :6)`,
        [processId, 'description', 'cause', 'consequence', 'test', 'INVALID']
      );
    });
  });

  it('rejects a relation from a process to itself', async () => {
    const processId = await seededProcessId();
    await expectConstraintRejection(async (manager) => {
      await manager.query(
        `INSERT INTO "${schema}"."PROCESS_RELATION"
          (ORIGIN_PROCESS_ID, DESTINATION_PROCESS_ID, RELATION_TYPE, DESCRIPTION)
         VALUES (:1, :1, 'FLUJO', 'test')`,
        [processId, processId]
      );
    });
  });

  it('rejects a second responsible unit for the same process', async () => {
    const processId = await seededProcessId();
    await expectConstraintRejection(async (manager) => {
      const unitCode = uniqueCode('UT');
      await manager.query(
        `INSERT INTO "${schema}"."ORGANIZATIONAL_UNIT" (CODE, NAME, IS_ACTIVE)
         VALUES (:1, :2, 1)`,
        [unitCode, `Oracle test unit ${unitCode}`]
      );
      const units: IdRow[] = await manager.query(
        `SELECT ID AS "id" FROM "${schema}"."ORGANIZATIONAL_UNIT" WHERE CODE = :1`,
        [unitCode]
      );
      expect(units).toHaveLength(1);
      await manager.query(
        `INSERT INTO "${schema}"."PROCESS_UNIT" (PROCESS_ID, UNIT_ID, ROLE)
         VALUES (:1, :2, 'RESPONSABLE')`,
        [processId, Number(units[0].id)]
      );
    });
  });

  it('rejects a process type belonging to a different macroprocess', async () => {
    await expectConstraintRejection(async (manager) => {
      const classifications: ClassifiedTypeRow[] = await manager.query(
        `SELECT M.ID AS "macroprocessId", PT.ID AS "processTypeId"
         FROM "${schema}"."MACROPROCESS" M
         CROSS JOIN "${schema}"."PROCESS_TYPE" PT
         WHERE PT.MACROPROCESS_ID <> M.ID
         FETCH FIRST 1 ROWS ONLY`
      );
      expect(classifications).toHaveLength(1);
      const processCode = uniqueCode('PT');
      await manager.query(
        `INSERT INTO "${schema}"."PROCESS" (CODE, IS_ACTIVE) VALUES (:1, 1)`,
        [processCode]
      );
      const testProcesses: IdRow[] = await manager.query(
        `SELECT ID AS "id" FROM "${schema}"."PROCESS" WHERE CODE = :1`,
        [processCode]
      );
      await manager.query(
        `INSERT INTO "${schema}"."PROCESS_VERSION"
          (PROCESS_ID, MACROPROCESS_ID, PROCESS_TYPE_ID)
         VALUES (:1, :2, :3)`,
        [
          Number(testProcesses[0].id),
          Number(classifications[0].macroprocessId),
          Number(classifications[0].processTypeId)
        ]
      );
    });
  });

  it('rejects a current version that belongs to another process', async () => {
    await expectConstraintRejection(async (manager) => {
      const macroprocessRows: IdRow[] = await manager.query(
        `SELECT ID AS "id" FROM "${schema}"."MACROPROCESS" ORDER BY ID FETCH FIRST 1 ROWS ONLY`
      );
      const processTypeRows: IdRow[] = await manager.query(
        `SELECT ID AS "id" FROM "${schema}"."PROCESS_TYPE"
         WHERE MACROPROCESS_ID = :1 ORDER BY ID FETCH FIRST 1 ROWS ONLY`,
        [Number(macroprocessRows[0].id)]
      );
      const codes = [uniqueCode('PV'), uniqueCode('PV')];
      const processIds: number[] = [];
      for (const code of codes) {
        await manager.query(
          `INSERT INTO "${schema}"."PROCESS" (CODE, IS_ACTIVE) VALUES (:1, 1)`,
          [code]
        );
        const rows: IdRow[] = await manager.query(
          `SELECT ID AS "id" FROM "${schema}"."PROCESS" WHERE CODE = :1`,
          [code]
        );
        processIds.push(Number(rows[0].id));
      }

      await manager.query(
        `INSERT INTO "${schema}"."PROCESS_VERSION"
          (PROCESS_ID, MACROPROCESS_ID, PROCESS_TYPE_ID)
         VALUES (:1, :2, :3)`,
        [processIds[1], Number(macroprocessRows[0].id), Number(processTypeRows[0].id)]
      );
      const versionRows: IdRow[] = await manager.query(
        `SELECT ID AS "id" FROM "${schema}"."PROCESS_VERSION" WHERE PROCESS_ID = :1`,
        [processIds[1]]
      );
      await manager.query(
        `UPDATE "${schema}"."PROCESS" SET CURRENT_VERSION_ID = :1 WHERE ID = :2`,
        [Number(versionRows[0].id), processIds[0]]
      );
    });
  });

  async function seededProcessId(): Promise<number> {
    const rows: IdRow[] = await oracle().query(
      `SELECT ID AS "id" FROM "${schema}"."PROCESS" ORDER BY ID FETCH FIRST 1 ROWS ONLY`
    );
    expect(rows).toHaveLength(1);
    return Number(rows[0].id);
  }
});

function oracle(): DataSource {
  if (!dataSourceForOracle?.isInitialized) throw new Error('Oracle v14 test datasource is not initialized.');
  return dataSourceForOracle;
}

async function expectConstraintRejection(action: (manager: EntityManager) => Promise<void>): Promise<void> {
  const rollbackMarker = Symbol('rollback Oracle constraint test');
  try {
    await oracle().transaction(async (manager) => {
      try {
        await action(manager);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/ORA-\d{5}/.test(message)) throw error;
        throw rollbackMarker;
      }
      throw new Error('Expected the Oracle statement to reject the invalid data.');
    });
  } catch (error) {
    if (error === rollbackMarker) return;
    throw error;
  }
}

function uniqueCode(prefix: string): string {
  return `${prefix}${Date.now()}${Math.random().toString(36).slice(2, 9)}`.toUpperCase();
}
