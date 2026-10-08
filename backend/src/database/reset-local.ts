import 'dotenv/config';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../common/config';
import { applyRuntimeGrants } from './grants';
import { seed } from './seed';

const TABLE_DROP_ORDER = [
  'PROCESS_RISK',
  'PROCESS',
  'PROCESS_VERSION',
  'SECURITY_EVENT_IP',
  'SECURITY_EVENT',
  'APP_SESSION',
  'AUDIT',
  'USER_PROFILE',
  'DEMO_IDENTITY',
  'USER_IDENTITY',
  'APP_PROFILE',
  'APP_USER',
  'PROCESS_TYPE',
  'RISK_TYPE',
  'RISK_LEVEL',
  'MACROPROCESS',
  'ADMIN_CONTROL',
  'migrations'
];

const SEQUENCES = ['PROCESS_CODE_SEQ', 'MACROPROCESS_CODE_SEQ'];

function assertLocalResetAllowed(): string {
  const schema = process.env.ORACLE_SCHEMA?.trim().toUpperCase();
  const service = process.env.ORACLE_SERVICE?.trim();
  const expectedConfirmation = schema && service ? `RESET ${schema}@${service}` : '';
  const loopback = ['127.0.0.1', '::1', 'localhost'];
  const migrationUser = process.env.MIGRATION_USER?.trim().toUpperCase();

  if (process.env.NODE_ENV !== 'development' ||
    process.env.AUTH_MODE !== 'demo' ||
    process.env.DEMO_DATA_ENABLED !== 'true' ||
    !loopback.includes((process.env.HOST ?? '').trim().toLowerCase()) ||
    !loopback.includes((process.env.ORACLE_HOST ?? '').trim().toLowerCase()) ||
    !schema ||
    !/^[A-Z][A-Z0-9_$#]{0,29}$/.test(schema) ||
    !service ||
    migrationUser !== schema ||
    process.env.LOCAL_RESET_SCHEMA?.trim().toUpperCase() !== schema ||
    process.env.LOCAL_RESET_CONFIRM !== expectedConfirmation) {
    throw new Error(
      'Local reset refused. Require development/demo mode, loopback hosts, owner migration user, ' +
      'LOCAL_RESET_SCHEMA matching ORACLE_SCHEMA, and LOCAL_RESET_CONFIRM="RESET <schema>@<service>".'
    );
  }
  if (process.env.DATABASE_USER?.trim().toUpperCase() === schema) {
    throw new Error('Local reset requires a runtime database user separate from the schema owner.');
  }
  return schema;
}

async function resetLocalSchema(): Promise<void> {
  const schema = assertLocalResetAllowed();
  const source = new DataSource(databaseOptions(true));
  try {
    await source.initialize();
    const tables: Array<{ tableName: string }> = await source.query(
      'SELECT TABLE_NAME AS "tableName" FROM USER_TABLES'
    );
    const tableNames = new Set(tables.map(({ tableName }) => tableName));
    for (const name of TABLE_DROP_ORDER) {
      if (!tableNames.has(name)) continue;
      await source.query(`DROP TABLE "${schema}"."${name}" CASCADE CONSTRAINTS PURGE`);
    }

    const sequences: Array<{ sequenceName: string }> = await source.query(
      'SELECT SEQUENCE_NAME AS "sequenceName" FROM USER_SEQUENCES'
    );
    const sequenceNames = new Set(sequences.map(({ sequenceName }) => sequenceName));
    for (const name of SEQUENCES) {
      if (sequenceNames.has(name)) await source.query(`DROP SEQUENCE "${schema}"."${name}"`);
    }

    await source.runMigrations({ transaction: 'all' });
    await applyRuntimeGrants(source);
  } finally {
    if (source.isInitialized) await source.destroy();
  }
  await seed();
}

resetLocalSchema().then(
  () => console.info('Local schema was recreated from migrations and generic content.'),
  (error: unknown) => {
    console.error('Local schema reset failed; verify the explicit local-only safeguards and Oracle access.');
    console.error(error instanceof Error ? error.message : 'Unexpected reset error');
    process.exitCode = 1;
  }
);
