import 'dotenv/config';
import { DataSource } from 'typeorm';
import { assertSchemaInstallAllowed, databaseOptions } from '../common/config';
import { MvpV14Initial1770000000000 } from './migrations/1770000000000-InitialMvpV14';
import { applyRuntimeGrants } from './grants';
import { seedProcesses } from './seed-processes';
import { SCHEMA_SEQUENCES, SCHEMA_TABLES, requiredOracleIdentifier } from './schema';

async function installSchema(): Promise<void> {
  const schema = assertSchemaInstallAllowed();
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
      await seedProcesses(seedRunner.manager);
      await seedRunner.commitTransaction();
    } catch (error) {
      if (seedRunner.isTransactionActive) await seedRunner.rollbackTransaction();
      throw error;
    } finally {
      await seedRunner.release();
    }
    if (process.env.DATABASE_USER?.trim().toUpperCase() !== schema) {
      await applyRuntimeGrants(source);
    }
  } finally {
    if (source.isInitialized) await source.destroy();
  }
}

async function dropApplicationObjects(source: DataSource, schema: string): Promise<void> {
  const tables: Array<{ tableName: string }> = await source.query('SELECT TABLE_NAME AS "tableName" FROM USER_TABLES');
  const existingTables = new Set(tables.map(({ tableName }) => tableName));
  for (const table of SCHEMA_TABLES) {
    if (existingTables.has(table)) {
      await source.query(`DROP TABLE "${schema}"."${table}" CASCADE CONSTRAINTS PURGE`);
    }
  }

  const sequences: Array<{ sequenceName: string }> = await source.query('SELECT SEQUENCE_NAME AS "sequenceName" FROM USER_SEQUENCES');
  const existingSequences = new Set(sequences.map(({ sequenceName }) => sequenceName));
  for (const sequence of SCHEMA_SEQUENCES) {
    if (existingSequences.has(sequence)) await source.query(`DROP SEQUENCE "${schema}"."${sequence}"`);
  }
}

installSchema().then(
  () => console.info('Historical schema base recreated with generic content; this does not certify a complete v15 installation.'),
  (error: unknown) => {
    console.error('Schema installation failed; no application should be started until the error is resolved.');
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  }
);
