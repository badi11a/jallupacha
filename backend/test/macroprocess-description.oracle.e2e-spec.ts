import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../src/common/config';
import { qualifiedTable } from '../src/common/database';
import { loadInitialContent } from '../src/database/initial-content';
import { refreshMacroprocessContent } from '../src/database/refresh-macroprocess-content';
import { ProcessMapViewService } from '../src/process/process-map-view.service';

describe('macroprocess descriptions (Oracle)', () => {
  let source: DataSource;

  beforeAll(async () => {
    config({ path: resolve(__dirname, '../.env'), override: true });
    if (process.env.APP_ENV !== 'local' || process.env.DEMO_DATA_ENABLED !== 'true') {
      throw new Error('Description regression requires the local generic-data environment.');
    }
    // Fixture setup uses the owner; runtime permissions remain unchanged.
    source = new DataSource(databaseOptions(true));
    await source.initialize();
  });

  afterAll(async () => { if (source?.isInitialized) await source.destroy(); });

  it('refreshes recognized seed records, preserves authored descriptions and is idempotent', async () => {
    const runner = source.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(`UPDATE ${qualifiedTable('MACROPROCESS')} SET DESCRIPTION = :1 WHERE CODE = 'MP1'`, ['   ']);
      await runner.query(`UPDATE ${qualifiedTable('MACROPROCESS')} SET DESCRIPTION = :1 WHERE CODE = 'MP2'`, ['Descripción registrada por la entidad.']);
      await refreshMacroprocessContent(runner.manager);
      expect(await refreshMacroprocessContent(runner.manager)).toBe(0);
      const rows: Array<{ code: string; name: string; description: string }> = await runner.query(`SELECT CODE AS "code", NAME AS "name", DESCRIPTION AS "description" FROM ${qualifiedTable('MACROPROCESS')}`);
      expect(rows.find(row => row.code === 'MP1')?.description).toBe(loadInitialContent()[0].description);
      expect(rows.find(row => row.code === 'MP2')?.description).toBe('Descripción registrada por la entidad.');
      expect(rows.find(row => row.code === 'MP9')?.name).toBe('Gestión de Personas y Abastecimiento');
      expect(rows.find(row => row.code === 'MP11')?.name).toBe('Gestión de Servicios Tecnológicos');
      await runner.query(`UPDATE ${qualifiedTable('MACROPROCESS')} SET NAME = :1 WHERE CODE = 'MP3'`, ['Nombre personalizado']);
      await expect(refreshMacroprocessContent(runner.manager)).rejects.toThrow('do not match the recognized seed');
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it('returns the persisted descriptions for all seed macroprocesses and null for a missing description', async () => {
    const runner = source.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    const marker = `C042${Date.now()}`;
    try {
      await runner.query(`INSERT INTO ${qualifiedTable('MACROPROCESS_TYPE')} (CODE, NAME, SORT_ORDER, IS_ACTIVE) VALUES (:1, :2, 9999, 1)`, [marker, marker]);
      const [family] = await runner.query(`SELECT ID AS "id" FROM ${qualifiedTable('MACROPROCESS_TYPE')} WHERE CODE = :1`, [marker]);
      const content = loadInitialContent();
      for (const [index, macro] of content.entries()) {
        await runner.query(`INSERT INTO ${qualifiedTable('MACROPROCESS')} (MACROPROCESS_TYPE_ID, CODE, NAME, DESCRIPTION, SORT_ORDER, IS_ACTIVE) VALUES (:1, :2, :3, :4, :5, 1)`,
          [family.id, `${marker}_${index}`, macro.name, macro.description, index + 1]);
      }
      await runner.query(`INSERT INTO ${qualifiedTable('MACROPROCESS')} (MACROPROCESS_TYPE_ID, CODE, NAME, SORT_ORDER, IS_ACTIVE) VALUES (:1, :2, :3, 100, 1)`,
        [family.id, `${marker}_empty`, 'Macroproceso sin descripción']);
      const controller = new ProcessMapViewService({ query: (sql: string, parameters?: unknown[]) => runner.query(sql, parameters) } as DataSource);
      const result = await controller.map();
      const actual = (result.macroprocessTypes as Array<{ id: number; macroprocesses: Array<{ name: string; description: string | null }> }>).find(item => item.id === Number(family.id))!;
      expect(actual.macroprocesses.map(({ name, description }) => ({ name, description }))).toEqual([
        ...content.map(({ name, description }) => ({ name, description })),
        { name: 'Macroproceso sin descripción', description: null }
      ]);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
