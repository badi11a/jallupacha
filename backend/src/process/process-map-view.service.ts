import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { qualifiedTable } from '../common/database';

interface MapRow {
  macroprocessTypeId: number | string;
  macroprocessTypeName: string;
  macroprocessTypeOrder: number | string;
  macroprocessId: number | string;
  macroprocessCode: string;
  macroprocessName: string;
  macroprocessDescription: string | null;
  macroprocessOrder: number | string;
  processTypeId: number | string | null;
  processTypeName: string | null;
  processId: number | string | null;
  processCode: string | null;
  processName: string | null;
  status: string | null;
}

@Injectable()
export class ProcessMapViewService {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) { }

  async map(): Promise<{ macroprocessTypes: unknown[] }> {
    const table = qualifiedTable;
    const rows: MapRow[] = await this.dataSource.query(`
      SELECT MT.ID AS "macroprocessTypeId", MT.NAME AS "macroprocessTypeName", MT.SORT_ORDER AS "macroprocessTypeOrder",
             M.ID AS "macroprocessId", M.CODE AS "macroprocessCode", M.NAME AS "macroprocessName", M.DESCRIPTION AS "macroprocessDescription", M.SORT_ORDER AS "macroprocessOrder",
             PT.ID AS "processTypeId", PT.NAME AS "processTypeName",
             P.ID AS "processId", P.CODE AS "processCode", V.NAME AS "processName", V.STATUS AS "status"
      FROM ${table('MACROPROCESS_TYPE')} MT
      JOIN ${table('MACROPROCESS')} M ON M.MACROPROCESS_TYPE_ID = MT.ID AND M.IS_ACTIVE = 1
      LEFT JOIN ${table('PROCESS_TYPE')} PT ON PT.MACROPROCESS_ID = M.ID AND PT.IS_ACTIVE = 1
      LEFT JOIN ${table('PROCESS_VERSION')} V ON V.MACROPROCESS_ID = M.ID AND V.PROCESS_TYPE_ID = PT.ID
      LEFT JOIN ${table('PROCESS')} P ON P.CURRENT_VERSION_ID = V.ID AND P.IS_ACTIVE = 1
      WHERE MT.IS_ACTIVE = 1
      ORDER BY MT.SORT_ORDER, M.SORT_ORDER, PT.NAME, P.CODE
    `);
    const types = new Map<number, { id: number; name: string; order: number; macroprocesses: unknown[] }>();
    const macros = new Map<number, { id: number; code: string; name: string; description: string | null; order: number; processTypes: unknown[] }>();
    const processTypes = new Map<number, { id: number; name: string; processes: unknown[] }>();
    for (const row of rows) {
      const typeId = Number(row.macroprocessTypeId);
      if (!types.has(typeId)) types.set(typeId, { id: typeId, name: row.macroprocessTypeName, order: Number(row.macroprocessTypeOrder), macroprocesses: [] });
      const macroId = Number(row.macroprocessId);
      if (!macros.has(macroId)) {
        const macro = { id: macroId, code: row.macroprocessCode, name: row.macroprocessName, description: row.macroprocessDescription, order: Number(row.macroprocessOrder), processTypes: [] };
        macros.set(macroId, macro);
        types.get(typeId)?.macroprocesses.push(macro);
      }
      if (row.processTypeId === null) continue;
      const processTypeId = Number(row.processTypeId);
      if (!processTypes.has(processTypeId)) {
        const processType = { id: processTypeId, name: row.processTypeName ?? '', processes: [] };
        processTypes.set(processTypeId, processType);
        macros.get(macroId)?.processTypes.push(processType);
      }
      if (row.processId !== null) {
        processTypes.get(processTypeId)?.processes.push({
          id: Number(row.processId), code: row.processCode, name: row.processName, status: row.status
        });
      }
    }
    return { macroprocessTypes: [...types.values()] };
  }
}
