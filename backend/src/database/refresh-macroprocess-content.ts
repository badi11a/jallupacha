import 'dotenv/config';
import { DataSource, EntityManager } from 'typeorm';
import { databaseOptions } from '../common/config';
import { qualifiedTable } from '../common/database';
import { loadInitialContent } from './initial-content';

const previousNames: Record<string, string> = {
  'Gestión de Personas y Abastecimiento': 'Gestión del Talento y Personas',
  'Gestión de Servicios Tecnológicos': 'Asesoría Jurídica y Normativa Institucional'
};

/** Refreshes only recognized seed records, preserving descriptions already entered. */
export async function refreshMacroprocessContent(manager: EntityManager): Promise<number> {
  const content = loadInitialContent();
  const pending: Array<{ id: number; name: string; description: string }> = [];
  for (const [index, macro] of content.entries()) {
    const code = `MP${index + 1}`;
    const rows: Array<{ id: number; name: string; description: string | null; typeCode: string }> = await manager.query(
      `SELECT M.ID AS "id", M.NAME AS "name", M.DESCRIPTION AS "description", T.CODE AS "typeCode"
       FROM ${qualifiedTable('MACROPROCESS')} M JOIN ${qualifiedTable('MACROPROCESS_TYPE')} T ON T.ID = M.MACROPROCESS_TYPE_ID
       WHERE M.CODE = :1 FOR UPDATE OF M.NAME, M.DESCRIPTION`, [code]);
    const row = rows[0];
    let recognizedName = rows.length === 1 && [macro.name, previousNames[macro.name]].includes(row.name);
    // C-037 already authorized neutral names for these seed records. Older local
    // installations are recognized by classification and their complete PR set.
    if (!recognizedName && rows.length === 1 && ['MP6', 'MP7', 'MP8'].includes(code)) {
      const processes: Array<{ code: string }> = await manager.query(
        `SELECT P.CODE AS "code" FROM ${qualifiedTable('PROCESS')} P JOIN ${qualifiedTable('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID WHERE V.MACROPROCESS_ID = :1`, [row.id]);
      recognizedName = JSON.stringify(processes.map(process => process.code).sort()) === JSON.stringify(macro.processes.map(process => process.code).sort());
    }
    if (rows.length !== 1 || row.typeCode !== macro.typeCode || !recognizedName) {
      throw new Error('The local macroprocesses do not match the recognized seed. No content was refreshed.');
    }
    if (row.name !== macro.name || !row.description?.trim()) {
      pending.push({ id: row.id, name: macro.name, description: row.description?.trim() ? row.description : macro.description });
    }
  }
  for (const row of pending) {
    await manager.query(`UPDATE ${qualifiedTable('MACROPROCESS')} SET NAME = :1, DESCRIPTION = :2 WHERE ID = :3`, [row.name, row.description, row.id]);
  }
  return pending.length;
}

async function main(): Promise<void> {
  if (process.env.APP_ENV !== 'local' || process.env.DEMO_DATA_ENABLED !== 'true' ||
      !['127.0.0.1', 'localhost', '::1'].includes(process.env.ORACLE_HOST ?? '')) {
    throw new Error('Seed content refresh is restricted to the local generic-data database.');
  }
  const source = new DataSource(databaseOptions(true));
  try {
    await source.initialize();
    const count = await source.transaction(refreshMacroprocessContent);
    console.info(`Macroprocess seed content refreshed: ${count} records. Existing descriptions were preserved.`);
  } finally {
    if (source.isInitialized) await source.destroy();
  }
}

if (require.main === module) main().catch(() => {
  console.error('Seed content refresh failed; the transaction was rolled back. Check the local configuration and seed records.');
  process.exitCode = 1;
});
