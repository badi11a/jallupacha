import 'dotenv/config';
import { DataSource } from 'typeorm';
import { assertSchemaInstallAllowed, databaseOptions } from '../common/config';
import { createSchema } from './create-schema';
import { applyRuntimeGrants } from './grants';
import { seedProcesses } from './seed-processes';

async function installSchema(): Promise<void> {
  const schema = assertSchemaInstallAllowed();
  const source = new DataSource({
    ...databaseOptions(true),
    entities: []
  } as never);
  try {
    await source.initialize();
    await assertSchemaIsEmpty(source);
    const ddlRunner = source.createQueryRunner();
    try {
      await ddlRunner.connect();
      await createSchema(ddlRunner);
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

async function assertSchemaIsEmpty(source: DataSource): Promise<void> {
  const tables: Array<{ tableName: string }> = await source.query('SELECT TABLE_NAME AS "tableName" FROM USER_TABLES');
  const sequences: Array<{ sequenceName: string }> = await source.query('SELECT SEQUENCE_NAME AS "sequenceName" FROM USER_SEQUENCES');
  if (tables.length > 0 || sequences.length > 0) {
    throw new Error('Schema installation requires an empty Oracle schema; it never drops existing objects.');
  }
}

installSchema().then(
  () => console.info('Current schema created in an empty Oracle schema with generic content.'),
  (error: unknown) => {
    console.error('Schema installation failed; no application should be started until the error is resolved.');
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  }
);
