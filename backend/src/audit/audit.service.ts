import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { qualifiedTable } from '../common/database';
import { AuditEntity } from './audit.entity';
import { SecurityEventEntity } from './security-event.entity';
import { SecurityEventIpEntity } from './security-event-ip.entity';

export interface AuditEntry {
  actorUserId: number | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeValue?: unknown;
  afterValue?: unknown;
}

@Injectable()
export class AuditService {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

  async record(entry: AuditEntry, manager = this.dataSource.manager): Promise<void> {
    await manager.getRepository(AuditEntity).insert({
      actorUserId: entry.actorUserId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      beforeValue: entry.beforeValue === undefined ? null : JSON.stringify(entry.beforeValue),
      afterValue: entry.afterValue === undefined ? null : JSON.stringify(entry.afterValue)
    });
  }

  async securityEvent(
    actorUserId: number | null,
    ipAddress: string,
    event: string,
    result: 'SUCCESS' | 'REJECTED',
    manager?: EntityManager
  ): Promise<void> {
    const insert = async (entityManager: EntityManager) => {
      const savedEvent = await entityManager.getRepository(SecurityEventEntity).save(
        entityManager.getRepository(SecurityEventEntity).create({ actorUserId, event, result })
      );
      await entityManager.getRepository(SecurityEventIpEntity).insert({
        securityEventId: savedEvent.id,
        ipAddress: ipAddress.slice(0, 64)
      });
    };
    if (manager) await insert(manager);
    else await this.dataSource.transaction(insert);
  }

  async list(
    page: number,
    limit: number,
    filter?: { entityType?: string; action?: string }
  ): Promise<{ items: unknown[]; total: number }> {
    const offset = (page - 1) * limit;
    const whereClauses: string[] = ['1 = 1'];
    const params: unknown[] = [];

    if (filter?.entityType && filter.entityType.trim()) {
      params.push(filter.entityType.trim());
      whereClauses.push(`A.ENTITY_TYPE = :${params.length}`);
    }
    if (filter?.action && filter.action.trim()) {
      params.push(filter.action.trim());
      whereClauses.push(`A.ACTION = :${params.length}`);
    }

    const whereSql = whereClauses.join(' AND ');
    const countParams = [...params];
    params.push(offset, limit);

    const [items, count] = await Promise.all([
      this.dataSource.query(
        `SELECT A.ID AS "id", A.CREATED_AT AS "createdAt", A.ACTOR_USER_ID AS "actorUserId",
                I.DISPLAY_NAME AS "actorDisplayName", I.EMAIL AS "actorEmail",
                A.ACTION AS "action", A.ENTITY_TYPE AS "entityType", A.ENTITY_ID AS "entityId",
                A.BEFORE_VALUE AS "beforeValue", A.AFTER_VALUE AS "afterValue"
         FROM ${qualifiedTable('AUDIT')} A
         LEFT JOIN ${qualifiedTable('USER_IDENTITY')} I ON I.USER_ID = A.ACTOR_USER_ID
         WHERE ${whereSql}
         ORDER BY A.ID DESC
         OFFSET :${params.length - 1} ROWS FETCH NEXT :${params.length} ROWS ONLY`,
        params
      ),
      this.dataSource.query(
        `SELECT COUNT(*) AS "total" FROM ${qualifiedTable('AUDIT')} A WHERE ${whereSql}`,
        countParams
      )
    ]);

    return { items, total: Number(count[0]?.total ?? 0) };
  }
}
