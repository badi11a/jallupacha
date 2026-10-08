import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
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

  async list(page: number, limit: number): Promise<{ items: AuditEntity[]; total: number }> {
    const [items, total] = await this.dataSource.getRepository(AuditEntity).findAndCount({
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit
    });
    return { items, total };
  }
}
