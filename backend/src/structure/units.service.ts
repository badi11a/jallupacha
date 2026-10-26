import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { qualifiedTable as table } from '../common/database';
import { runDatabaseOperation } from '../common/database-operation';
import { asBody, foldText, optionalId, optionalText, rejectUnknownKeys, requiredText } from '../common/input-validation';
import { Row, fold, bool } from '../common/database-values';

@Injectable()
export class UnitsService {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) { }

  async listUnits(): Promise<unknown[]> {
    const rows: Row[] = await this.dataSource.query(`
      SELECT U.ID AS "id", U.CODE AS "code", U.NAME AS "name", U.PARENT_UNIT_ID AS "parentUnitId", U.IS_ACTIVE AS "isActive",
             (SELECT COUNT(*) FROM ${table('PROCESS_UNIT')} PU WHERE PU.UNIT_ID = U.ID) AS "processCount"
      FROM ${table('ORGANIZATIONAL_UNIT')} U ORDER BY U.NAME
    `);
    return rows.map((row) => ({
      ...row, id: Number(row.id), parentUnitId: row.parentUnitId === null ? null : Number(row.parentUnitId),
      isActive: bool(row.isActive), processCount: Number(row.processCount)
    }));
  }

  createUnit(raw: unknown): Promise<unknown> {
    const body = asBody(raw);
    rejectUnknownKeys(body, ['name', 'parentUnitId']);
    const name = requiredText(body, 'name', 'Nombre', 200);
    const parentUnitId = optionalId(body, 'parentUnitId', 'Unidad superior') ?? null;
    return runDatabaseOperation(() => this.dataSource.transaction(async (manager) => {
      if (parentUnitId !== null) await this.assertActiveUnit(manager, parentUnitId, 'La unidad superior');
      await this.assertUnitNameFree(manager, parentUnitId, name, null);
      const temporaryCode = `TMP${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.slice(0, 32).toUpperCase();
      await manager.query(
        `INSERT INTO ${table('ORGANIZATIONAL_UNIT')} (CODE, NAME, PARENT_UNIT_ID, IS_ACTIVE) VALUES (:1, :2, :3, 1)`,
        [temporaryCode, name, parentUnitId]
      );
      const rows: Row[] = await manager.query(`SELECT ID AS "id" FROM ${table('ORGANIZATIONAL_UNIT')} WHERE CODE = :1`, [temporaryCode]);
      const id = Number(rows[0].id);
      await manager.query(
        `UPDATE ${table('ORGANIZATIONAL_UNIT')} SET CODE = :1 WHERE ID = :2`, [`UNIDAD_${String(id).padStart(2, '0')}`, id]
      );
      return { id };
    }));
  }

  updateUnit(id: number, raw: unknown): Promise<unknown> {
    const body = asBody(raw);
    rejectUnknownKeys(body, ['name', 'parentUnitId']);
    const name = optionalText(body, 'name', 'Nombre', 200);
    if (name === null) throw new BadRequestException('Nombre es obligatorio.');
    const parentUnitId = optionalId(body, 'parentUnitId', 'Unidad superior');
    return runDatabaseOperation(() => this.dataSource.transaction(async (manager) => {
      const rows: Row[] = await manager.query(
        `SELECT NAME AS "name", PARENT_UNIT_ID AS "parentUnitId" FROM ${table('ORGANIZATIONAL_UNIT')} WHERE ID = :1`, [id]
      );
      if (rows.length !== 1) throw new NotFoundException('Unidad no encontrada.');
      const finalName = name ?? String(rows[0].name);
      const currentParent = rows[0].parentUnitId === null ? null : Number(rows[0].parentUnitId);
      const finalParent = parentUnitId === undefined ? currentParent : parentUnitId;
      if (finalParent !== currentParent && finalParent !== null) {
        await this.assertActiveUnit(manager, finalParent, 'La unidad superior');
        await this.assertNoCycle(manager, id, finalParent);
      }
      await this.assertUnitNameFree(manager, finalParent, finalName, id);
      await manager.query(
        `UPDATE ${table('ORGANIZATIONAL_UNIT')} SET NAME = :1, PARENT_UNIT_ID = :2 WHERE ID = :3`, [finalName, finalParent, id]
      );
      return { id };
    }));
  }

  deactivateUnit(id: number): Promise<unknown> {
    return runDatabaseOperation(async () => {
      const result = await this.dataSource.query(`SELECT ID FROM ${table('ORGANIZATIONAL_UNIT')} WHERE ID = :1`, [id]);
      if (result.length !== 1) throw new NotFoundException('Unidad no encontrada.');
      await this.dataSource.query(`UPDATE ${table('ORGANIZATIONAL_UNIT')} SET IS_ACTIVE = 0 WHERE ID = :1`, [id]);
      return { id };
    });
  }

  private async assertActiveUnit(manager: EntityManager, unitId: number, label: string): Promise<void> {
    const rows: Row[] = await manager.query(`SELECT IS_ACTIVE AS "isActive" FROM ${table('ORGANIZATIONAL_UNIT')} WHERE ID = :1`, [unitId]);
    if (rows.length !== 1 || !bool(rows[0].isActive)) throw new BadRequestException(`${label} no existe o está inactiva.`);
  }

  private async assertNoCycle(manager: EntityManager, unitId: number, newParentId: number): Promise<void> {
    const seen = new Set<number>();
    let cursor: number | null = newParentId;
    while (cursor !== null) {
      if (cursor === unitId) throw new BadRequestException('Una unidad no puede depender de sí misma ni de una unidad subordinada.');
      if (seen.has(cursor)) break;
      seen.add(cursor);
      const rows: Row[] = await manager.query(`SELECT PARENT_UNIT_ID AS "parentUnitId" FROM ${table('ORGANIZATIONAL_UNIT')} WHERE ID = :1`, [cursor]);
      cursor = rows.length === 1 && rows[0].parentUnitId !== null ? Number(rows[0].parentUnitId) : null;
    }
  }

  private async assertUnitNameFree(manager: EntityManager, parentUnitId: number | null, name: string, ignoreId: number | null): Promise<void> {
    const rows: Row[] = await manager.query(
      `SELECT ID AS "id" FROM ${table('ORGANIZATIONAL_UNIT')}
        WHERE ${parentUnitId === null ? 'PARENT_UNIT_ID IS NULL' : 'PARENT_UNIT_ID = :1'} AND ${fold('NAME')} = ${parentUnitId === null ? ':1' : ':2'}`,
      parentUnitId === null ? [foldText(name)] : [parentUnitId, foldText(name)]
    );
    if (rows.some((row) => Number(row.id) !== ignoreId)) throw new ConflictException('Ya existe una unidad con ese nombre bajo la misma unidad superior.');
  }
}
