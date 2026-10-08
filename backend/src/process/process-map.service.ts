import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { qualifiedTable } from '../common/database';

export interface ProcessMapProcess {
  id: number;
  code: string;
  name: string;
  status: string;
  processTypeId: number;
}

export interface ProcessMapType {
  id: number;
  name: string;
  processes: ProcessMapProcess[];
}

export interface ProcessMapMacroprocess {
  id: number;
  code: string;
  name: string;
  order: number;
  processTypes: ProcessMapType[];
}

interface ProcessMapRow {
  macroprocessId: number | string;
  macroprocessCode: string;
  macroprocessName: string;
  macroprocessOrder: number | string;
  processTypeId: number | string | null;
  processTypeName: string | null;
  processId: number | string | null;
  processCode: string | null;
  processName: string | null;
  status: string | null;
}

@Injectable()
export class ProcessMapService {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

  async getMap(): Promise<{ macroprocesses: ProcessMapMacroprocess[] }> {
    const rows: ProcessMapRow[] = await this.dataSource.query(
      `SELECT M.ID AS "macroprocessId", M.CODE AS "macroprocessCode",
              M.NAME AS "macroprocessName", M.SORT_ORDER AS "macroprocessOrder",
              T.ID AS "processTypeId", T.NAME AS "processTypeName",
              P.ID AS "processId", P.CODE AS "processCode",
              COALESCE(V.NAME, 'Sin nombre') AS "processName", V.STATUS AS "status"
       FROM ${qualifiedTable('MACROPROCESS')} M
       LEFT JOIN ${qualifiedTable('PROCESS')} P
         ON P.IS_ACTIVE = 1
        AND EXISTS (
          SELECT 1 FROM ${qualifiedTable('PROCESS_VERSION')} VM
          WHERE VM.ID = P.CURRENT_VERSION_ID AND VM.MACROPROCESS_ID = M.ID
        )
       LEFT JOIN ${qualifiedTable('PROCESS_VERSION')} V
         ON V.ID = P.CURRENT_VERSION_ID
       LEFT JOIN ${qualifiedTable('PROCESS_TYPE')} T
         ON T.ID = V.PROCESS_TYPE_ID
       WHERE M.IS_ACTIVE = 1
       ORDER BY M.SORT_ORDER, M.ID, T.NAME, T.ID, P.ID`
    );

    const macroprocesses = new Map<number, ProcessMapMacroprocess>();
    const typesByMacroprocess = new Map<number, Map<number, ProcessMapType>>();
    for (const row of rows) {
      const macroprocessId = Number(row.macroprocessId);
      let macroprocess = macroprocesses.get(macroprocessId);
      if (!macroprocess) {
        macroprocess = {
          id: macroprocessId,
          code: row.macroprocessCode,
          name: row.macroprocessName,
          order: Number(row.macroprocessOrder),
          processTypes: []
        };
        macroprocesses.set(macroprocessId, macroprocess);
        typesByMacroprocess.set(macroprocessId, new Map());
      }
      if (row.processId === null) continue;
      if (row.processTypeId === null || row.processTypeName === null || row.status === null) {
        throw new Error('Process map contains an incomplete persisted process');
      }

      const processTypeId = Number(row.processTypeId);
      const typeMap = typesByMacroprocess.get(macroprocessId);
      if (!typeMap) throw new Error('Process map type grouping is inconsistent');
      let processType = typeMap.get(processTypeId);
      if (!processType) {
        processType = {
          id: processTypeId,
          name: row.processTypeName,
          processes: []
        };
        typeMap.set(processTypeId, processType);
        macroprocess.processTypes.push(processType);
      }
      processType.processes.push({
        id: Number(row.processId),
        code: row.processCode ?? '',
        name: row.processName ?? 'Sin nombre',
        status: row.status,
        processTypeId
      });
    }

    return { macroprocesses: [...macroprocesses.values()] };
  }
}
