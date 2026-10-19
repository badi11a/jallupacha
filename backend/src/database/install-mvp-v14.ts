import 'dotenv/config';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../common/config';
import { MvpV14Initial1770000000000 } from './mvp-v14-initial.migration';
import { applyMvpV14RuntimeGrants } from './mvp-v14-grants';
import { seedMvpV14 } from './mvp-v14-seed';
import { MVP_V14_SEQUENCES, MVP_V14_TABLES, requiredOracleIdentifier } from './mvp-v14-schema';

function assertMvpV14InstallAllowed(): string {
  const schema = requiredOracleIdentifier('ORACLE_SCHEMA');
  const service = process.env.ORACLE_SERVICE?.trim();
  const migrationUser = requiredOracleIdentifier('MIGRATION_USER');
  const expectedConfirmation = service ? `INSTALL MVP V14 ${schema}@${service}` : '';

  if (!service || migrationUser !== schema ||
    process.env.MVP_V14_INSTALL_ALLOWED !== 'true' ||
    process.env.MVP_V14_INSTALL_CONFIRM !== expectedConfirmation) {
    throw new Error(
      'MVP v14 installation refused. Require the owner migration user, MVP_V14_INSTALL_ALLOWED=true, and ' +
      `MVP_V14_INSTALL_CONFIRM="${expectedConfirmation}".`
    );
  }
  const usesOwnerAsRuntime = process.env.DATABASE_USER?.trim().toUpperCase() === schema;
  const allowsOwnerRuntimeInQa = process.env.MVP_V14_ALLOW_OWNER_RUNTIME_FOR_QA === 'true';
  if (usesOwnerAsRuntime && !allowsOwnerRuntimeInQa) {
    throw new Error(
      'MVP v14 installation requires a runtime database user separate from the schema owner. ' +
      'For the approved QA exception, set MVP_V14_ALLOW_OWNER_RUNTIME_FOR_QA=true explicitly.'
    );
  }
  return schema;
}

async function installMvpV14(): Promise<void> {
  const schema = assertMvpV14InstallAllowed();
  const source = new DataSource({
    ...databaseOptions(true),
    entities: [],
    migrations: []
  } as never);
  try {
    await source.initialize();
    await dropApplicationObjects(source, schema);
    const ddlRunner = source.createQueryRunner();
    try {
      await ddlRunner.connect();
      await new MvpV14Initial1770000000000().up(ddlRunner);
    } finally {
      await ddlRunner.release();
    }
    const seedRunner = source.createQueryRunner();
    try {
      await seedRunner.connect();
      await seedRunner.startTransaction();
      await seedMvpV14(seedRunner.manager);
      await seedRunner.commitTransaction();
    } catch (error) {
      if (seedRunner.isTransactionActive) await seedRunner.rollbackTransaction();
      throw error;
    } finally {
      await seedRunner.release();
    }
    if (process.env.DATABASE_USER?.trim().toUpperCase() !== schema) {
      await applyMvpV14RuntimeGrants(source);
    }
  } finally {
    if (source.isInitialized) await source.destroy();
  }
}

async function dropApplicationObjects(source: DataSource, schema: string): Promise<void> {
  const tables: Array<{ tableName: string }> = await source.query('SELECT TABLE_NAME AS "tableName" FROM USER_TABLES');
  const existingTables = new Set(tables.map(({ tableName }) => tableName));
  for (const table of MVP_V14_TABLES) {
    if (existingTables.has(table)) {
      await source.query(`DROP TABLE "${schema}"."${table}" CASCADE CONSTRAINTS PURGE`);
    }
  }
  // TypeORM may have created this internal record in an earlier installer run.
  // It is not part of the MVP schema and must not survive a clean installation.
  if (existingTables.has('migrations')) {
    await source.query(`DROP TABLE "${schema}"."migrations" CASCADE CONSTRAINTS PURGE`);
  }

  const sequences: Array<{ sequenceName: string }> = await source.query('SELECT SEQUENCE_NAME AS "sequenceName" FROM USER_SEQUENCES');
  const existingSequences = new Set(sequences.map(({ sequenceName }) => sequenceName));
  for (const sequence of MVP_V14_SEQUENCES) {
    if (existingSequences.has(sequence)) await source.query(`DROP SEQUENCE "${schema}"."${sequence}"`);
  }
}

installMvpV14().then(
  () => console.info('MVP v14 schema was recreated from its initial migration and demonstration content.'),
  (error: unknown) => {
    console.error('MVP v14 installation failed; no application should be started until the error is resolved.');
    console.error(error instanceof Error ? error.message : 'Unexpected installation error');
    process.exitCode = 1;
  }
);
