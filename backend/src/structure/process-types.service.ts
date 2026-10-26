import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { qualifiedTable as table } from '../common/database';
import { runDatabaseOperation } from '../common/database-operation';
import { asBody, foldText, rejectUnknownKeys, requiredId, requiredText } from '../common/input-validation';
import { Row, fold, bool } from '../common/database-values';

@Injectable()
export class ProcessTypesService {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) { }

  async listProcessTypes(): Promise<unknown[]> {
    const rows: Row[] = await this.dataSource.query(`
      SELECT PT.ID AS "id", PT.NAME AS "name", PT.IS_ACTIVE AS "isActive",
             M.ID AS "macroprocessId", M.CODE AS "macroprocessCode", M.NAME AS "macroprocessName",
             MT.NAME AS "macroprocessTypeName",
             (SELECT COUNT(*) FROM ${table('PROCESS')} P JOIN ${table('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID
               WHERE P.IS_ACTIVE = 1 AND V.PROCESS_TYPE_ID = PT.ID) AS "processCount"
      FROM ${table('PROCESS_TYPE')} PT
      JOIN ${table('MACROPROCESS')} M ON M.ID = PT.MACROPROCESS_ID
      JOIN ${table('MACROPROCESS_TYPE')} MT ON MT.ID = M.MACROPROCESS_TYPE_ID
      ORDER BY MT.SORT_ORDER, M.SORT_ORDER, PT.NAME
    `);
    return rows.map((row) => ({ ...row, isActive: bool(row.isActive), processCount: Number(row.processCount) }));
  }

  createProcessType(raw: unknown): Promise<unknown> {
    const body = asBody(raw);
    rejectUnknownKeys(body, ['macroprocessId', 'name']);
    const macroprocessId = requiredId(body, 'macroprocessId', 'Macroproceso');
    const name = requiredText(body, 'name', 'Nombre', 120);
    return runDatabaseOperation(() => this.dataSource.transaction(async (manager) => {
      const macros: Row[] = await manager.query(
        `SELECT IS_ACTIVE AS "isActive" FROM ${table('MACROPROCESS')} WHERE ID = :1`, [macroprocessId]
      );
      if (macros.length !== 1 || !bool(macros[0].isActive)) throw new BadRequestException('El macroproceso no existe o está inactivo.');
      await this.assertProcessTypeNameFree(manager, macroprocessId, name, null);
      await manager.query(
        `INSERT INTO ${table('PROCESS_TYPE')} (MACROPROCESS_ID, NAME, IS_ACTIVE) VALUES (:1, :2, 1)`, [macroprocessId, name]
      );
      const rows: Row[] = await manager.query(
        `SELECT ID AS "id" FROM ${table('PROCESS_TYPE')} WHERE MACROPROCESS_ID = :1 AND NAME = :2`, [macroprocessId, name]
      );
      return { id: Number(rows[0].id) };
    }));
  }

  updateProcessType(id: number, raw: unknown): Promise<unknown> {
    const body = asBody(raw);
    rejectUnknownKeys(body, ['macroprocessId', 'name']);
    const name = requiredText(body, 'name', 'Nombre', 120);
    return runDatabaseOperation(() => this.dataSource.transaction(async (manager) => {
      const rows: Row[] = await manager.query(
        `SELECT MACROPROCESS_ID AS "macroprocessId" FROM ${table('PROCESS_TYPE')} WHERE ID = :1`, [id]
      );
      if (rows.length !== 1) throw new NotFoundException('Tipo de proceso no encontrado.');
      const macroprocessId = Number(rows[0].macroprocessId);
      if ('macroprocessId' in body && body.macroprocessId !== macroprocessId) {
        throw new BadRequestException('Un tipo de proceso no puede cambiar de macroproceso.');
      }
      await this.assertProcessTypeNameFree(manager, macroprocessId, name, id);
      await manager.query(`UPDATE ${table('PROCESS_TYPE')} SET NAME = :1 WHERE ID = :2`, [name, id]);
      return { id };
    }));
  }

  deactivateProcessType(id: number): Promise<unknown> {
    return runDatabaseOperation(() => this.dataSource.transaction(async (manager) => {
      const rows: Row[] = await manager.query(`SELECT ID FROM ${table('PROCESS_TYPE')} WHERE ID = :1`, [id]);
      if (rows.length !== 1) throw new NotFoundException('Tipo de proceso no encontrado.');
      const counts: Row[] = await manager.query(
        `SELECT COUNT(*) AS "total" FROM ${table('PROCESS')} P JOIN ${table('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID
          WHERE P.IS_ACTIVE = 1 AND V.PROCESS_TYPE_ID = :1`, [id]
      );
      const total = Number(counts[0].total);
      if (total > 0) {
        throw new BadRequestException(
          `No se puede desactivar el tipo: tiene ${total} proceso(s) activo(s) que debe(n) reclasificarse.`
        );
      }
      await manager.query(`UPDATE ${table('PROCESS_TYPE')} SET IS_ACTIVE = 0 WHERE ID = :1`, [id]);
      return { id };
    }));
  }

  private async assertProcessTypeNameFree(manager: EntityManager, macroprocessId: number, name: string, ignoreId: number | null): Promise<void> {
    const rows: Row[] = await manager.query(
      `SELECT ID AS "id" FROM ${table('PROCESS_TYPE')} WHERE MACROPROCESS_ID = :1 AND ${fold('NAME')} = :2`,
      [macroprocessId, foldText(name)]
    );
    if (rows.some((row) => Number(row.id) !== ignoreId)) {
      throw new ConflictException('Ya existe un tipo de proceso con ese nombre en el macroproceso.');
    }
  }
}
