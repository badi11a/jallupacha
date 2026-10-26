import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { qualifiedTable as table } from '../common/database';
import { runDatabaseOperation } from '../common/database-operation';
import { asBody, oneOf, RELATION_TYPES, rejectUnknownKeys, requiredId, requiredText } from '../common/input-validation';
import { Row } from '../common/database-values';

@Injectable()
export class ProcessRelationsService {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) { }

  addRelation(originId: number, raw: unknown): Promise<unknown> {
    const body = asBody(raw);
    rejectUnknownKeys(body, ['destinationProcessId', 'type', 'description']);
    const destinationId = requiredId(body, 'destinationProcessId', 'Proceso destino');
    const type = oneOf(body.type, RELATION_TYPES, 'El tipo de relación');
    const description = requiredText(body, 'description', 'Descripción', 4000);
    if (destinationId === originId) throw new BadRequestException('No se puede relacionar un proceso consigo mismo.');
    return runDatabaseOperation(() => this.dataSource.transaction(async (manager) => {
      await this.assertProcessExists(manager, originId, 'El proceso');
      await this.assertProcessExists(manager, destinationId, 'El proceso destino');
      await this.assertRelationFree(manager, originId, destinationId, type, null);
      await manager.query(
        `INSERT INTO ${table('PROCESS_RELATION')} (ORIGIN_PROCESS_ID, DESTINATION_PROCESS_ID, RELATION_TYPE, DESCRIPTION) VALUES (:1, :2, :3, :4)`,
        [originId, destinationId, type, description]
      );
      const rows: Row[] = await manager.query(
        `SELECT ID AS "id" FROM ${table('PROCESS_RELATION')} WHERE ORIGIN_PROCESS_ID = :1 AND DESTINATION_PROCESS_ID = :2 AND RELATION_TYPE = :3`,
        [originId, destinationId, type]
      );
      return { id: Number(rows[0].id) };
    }));
  }

  updateRelation(originId: number, relationId: number, raw: unknown): Promise<unknown> {
    const body = asBody(raw);
    rejectUnknownKeys(body, ['type', 'description']);
    const type = oneOf(body.type, RELATION_TYPES, 'El tipo de relación');
    const description = requiredText(body, 'description', 'Descripción', 4000);
    return runDatabaseOperation(() => this.dataSource.transaction(async (manager) => {
      const rows: Row[] = await manager.query(
        `SELECT DESTINATION_PROCESS_ID AS "destinationId" FROM ${table('PROCESS_RELATION')} WHERE ID = :1 AND ORIGIN_PROCESS_ID = :2`,
        [relationId, originId]
      );
      if (rows.length !== 1) throw new NotFoundException('Relación no encontrada.');
      await this.assertRelationFree(manager, originId, Number(rows[0].destinationId), type, relationId);
      await manager.query(`UPDATE ${table('PROCESS_RELATION')} SET RELATION_TYPE = :1, DESCRIPTION = :2 WHERE ID = :3`, [type, description, relationId]);
      return { id: relationId };
    }));
  }

  deleteRelation(originId: number, relationId: number): Promise<void> {
    return runDatabaseOperation(async () => {
      const rows: Row[] = await this.dataSource.query(
        `SELECT ID FROM ${table('PROCESS_RELATION')} WHERE ID = :1 AND ORIGIN_PROCESS_ID = :2`, [relationId, originId]
      );
      if (rows.length !== 1) throw new NotFoundException('Relación no encontrada.');
      await this.dataSource.query(`DELETE FROM ${table('PROCESS_RELATION')} WHERE ID = :1`, [relationId]);
    });
  }

  private async assertRelationFree(manager: EntityManager, originId: number, destinationId: number, type: string, ignoreId: number | null): Promise<void> {
    const rows: Row[] = await manager.query(
      `SELECT ID AS "id" FROM ${table('PROCESS_RELATION')} WHERE ORIGIN_PROCESS_ID = :1 AND DESTINATION_PROCESS_ID = :2 AND RELATION_TYPE = :3`,
      [originId, destinationId, type]
    );
    if (rows.some((row) => Number(row.id) !== ignoreId)) throw new ConflictException('Esa relación ya existe.');
  }

  private async assertProcessExists(manager: EntityManager, processId: number, label: string): Promise<void> {
    const rows: Row[] = await manager.query(`SELECT ID FROM ${table('PROCESS')} WHERE ID = :1 AND IS_ACTIVE = 1`, [processId]);
    if (rows.length !== 1) throw new BadRequestException(`${label} no existe.`);
  }
}
