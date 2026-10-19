import 'dotenv/config';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../common/config';

type ConnectionIdentity = {
  databaseUser: string;
  currentSchema: string;
  serviceName: string;
};

async function verifyConnection(label: string, migration: boolean): Promise<void> {
  const source = new DataSource({ ...databaseOptions(migration), entities: [], migrations: [] } as never);
  try {
    await source.initialize();
    const [identity] = await source.query<ConnectionIdentity[]>(
      `SELECT USER AS "databaseUser",
              SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') AS "currentSchema",
              SYS_CONTEXT('USERENV', 'SERVICE_NAME') AS "serviceName"
         FROM DUAL`
    );
    console.info(`${label}: ${identity.databaseUser} en ${identity.currentSchema} (${identity.serviceName})`);
  } finally {
    if (source.isInitialized) await source.destroy();
  }
}

Promise.all([
  verifyConnection('Runtime', false),
  verifyConnection('Migración', true)
]).catch((error: unknown) => {
  console.error('La comprobación QA falló. No se modificó ningún objeto.');
  console.error(error instanceof Error ? error.message : 'Error inesperado');
  process.exitCode = 1;
});
