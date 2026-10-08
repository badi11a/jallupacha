import {
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { MacroprocessEntity } from './macroprocess.entity';
import { ProcessTypeEntity } from './process-type.entity';
import {
  CreateMacroprocessDto,
  ProcessTypeDto,
  UpdateMacroprocessDto,
  UpdateProcessTypeDto
} from './catalog.dto';
import { qualifiedTable } from '../common/database';

@Injectable()
export class CatalogService {
  constructor(
    @Inject(DataSource) private readonly dataSource: DataSource,
    @Inject(AuditService) private readonly audit: AuditService
  ) {}

  async listMacroprocesses(): Promise<MacroprocessEntity[]> {
    return this.dataSource.getRepository(MacroprocessEntity).find({
      order: { order: 'ASC', id: 'ASC' }
    });
  }

  async createMacroprocess(actorId: number, input: CreateMacroprocessDto): Promise<MacroprocessEntity> {
    return this.dataSource.transaction(async (manager) => {
      const sequence = await manager.query(
        `SELECT ${qualifiedTable('MACROPROCESS_CODE_SEQ')}.NEXTVAL AS "codeNumber" FROM DUAL`
      );
      const repository = manager.getRepository(MacroprocessEntity);
      const row = repository.create({
        code: `MP${sequence[0].codeNumber}`,
        name: input.name,
        description: input.description?.length ? input.description : null,
        order: input.order,
        isActive: 1
      });
      const saved = await repository.save(row);
      await this.audit.record({
        actorUserId: actorId,
        action: 'MACROPROCESS_CREATED',
        entityType: 'MACROPROCESS',
        entityId: String(saved.id),
        afterValue: snapshot(saved)
      }, manager);
      return saved;
    });
  }

  async updateMacroprocess(actorId: number, id: number, input: UpdateMacroprocessDto): Promise<MacroprocessEntity> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(MacroprocessEntity);
      const row = await repository.findOneBy({ id });
      if (!row) throw new NotFoundException('Macroprocess not found');
      const before = snapshot(row);
      if (input.name !== undefined) row.name = input.name;
      if (input.description !== undefined) row.description = input.description?.length ? input.description : null;
      if (input.order !== undefined) row.order = input.order;
      const saved = await repository.save(row);
      await this.audit.record({
        actorUserId: actorId,
        action: 'MACROPROCESS_UPDATED',
        entityType: 'MACROPROCESS',
        entityId: String(id),
        beforeValue: before,
        afterValue: snapshot(saved)
      }, manager);
      return saved;
    });
  }

  async deactivateMacroprocess(actorId: number, id: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.query(
        `SELECT ID AS "id" FROM ${qualifiedTable('MACROPROCESS')} WHERE ID = :1 FOR UPDATE`,
        [id]
      );
      if (!locked.length) throw new NotFoundException('Macroprocess not found');
      const repository = manager.getRepository(MacroprocessEntity);
      const row = await repository.findOneBy({ id });
      if (!row) throw new NotFoundException('Macroprocess not found');
      if (row.isActive === 0) throw new ConflictException('Macroprocess is already inactive');
      const activeProcesses = await manager.query(
        `SELECT COUNT(*) AS "total"
         FROM ${qualifiedTable('PROCESS')} P
         JOIN ${qualifiedTable('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID
         WHERE P.IS_ACTIVE = 1 AND V.MACROPROCESS_ID = :1`,
        [id]
      );
      const processCount = Number(activeProcesses[0].total);
      if (processCount > 0) {
        throw new ConflictException(`Macroprocess has ${processCount} active process(es); move them first`);
      }
      const before = snapshot(row);
      row.isActive = 0;
      await repository.save(row);
      await this.audit.record({
        actorUserId: actorId,
        action: 'MACROPROCESS_DEACTIVATED',
        entityType: 'MACROPROCESS',
        entityId: String(id),
        beforeValue: before,
        afterValue: snapshot(row)
      }, manager);
    });
  }

  async listProcessTypes(): Promise<ProcessTypeEntity[]> {
    return this.dataSource.getRepository(ProcessTypeEntity).find({ order: { name: 'ASC' } });
  }

  async createProcessType(actorId: number, input: ProcessTypeDto): Promise<ProcessTypeEntity> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ProcessTypeEntity);
      if (await repository.findOneBy({ name: input.name })) {
        throw new ConflictException('Process type name already exists');
      }
      const row = await repository.save(repository.create({ name: input.name, isActive: 1 }));
      await this.audit.record({
        actorUserId: actorId,
        action: 'PROCESS_TYPE_CREATED',
        entityType: 'PROCESS_TYPE',
        entityId: String(row.id),
        afterValue: snapshot(row)
      }, manager);
      return row;
    });
  }

  async updateProcessType(actorId: number, id: number, input: UpdateProcessTypeDto): Promise<ProcessTypeEntity> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ProcessTypeEntity);
      const row = await repository.findOneBy({ id });
      if (!row) throw new NotFoundException('Process type not found');
      if (input.name !== undefined) {
        const duplicate = await repository.findOneBy({ name: input.name });
        if (duplicate && duplicate.id !== id) throw new ConflictException('Process type name already exists');
      }
      const before = snapshot(row);
      if (input.name !== undefined) row.name = input.name;
      const saved = await repository.save(row);
      await this.audit.record({
        actorUserId: actorId,
        action: 'PROCESS_TYPE_UPDATED',
        entityType: 'PROCESS_TYPE',
        entityId: String(id),
        beforeValue: before,
        afterValue: snapshot(saved)
      }, manager);
      return saved;
    });
  }

  async deactivateProcessType(actorId: number, id: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.query(
        `SELECT ID AS "id" FROM ${qualifiedTable('PROCESS_TYPE')} WHERE ID = :1 FOR UPDATE`,
        [id]
      );
      if (!locked.length) throw new NotFoundException('Process type not found');
      const repository = manager.getRepository(ProcessTypeEntity);
      const row = await repository.findOneBy({ id });
      if (!row) throw new NotFoundException('Process type not found');
      if (row.isActive === 0) throw new ConflictException('Process type is already inactive');
      const activeProcesses = await manager.query(
        `SELECT COUNT(*) AS "total"
         FROM ${qualifiedTable('PROCESS')} P
         JOIN ${qualifiedTable('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID
         WHERE P.IS_ACTIVE = 1 AND V.PROCESS_TYPE_ID = :1`,
        [id]
      );
      const processCount = Number(activeProcesses[0].total);
      if (processCount > 0) {
        throw new ConflictException(`Process type has ${processCount} active process(es); reclassify them first`);
      }
      const before = snapshot(row);
      row.isActive = 0;
      await repository.save(row);
      await this.audit.record({
        actorUserId: actorId,
        action: 'PROCESS_TYPE_DEACTIVATED',
        entityType: 'PROCESS_TYPE',
        entityId: String(id),
        beforeValue: before,
        afterValue: snapshot(row)
      }, manager);
    });
  }
}

function snapshot(row: MacroprocessEntity | ProcessTypeEntity): Record<string, unknown> {
  if (row instanceof MacroprocessEntity) {
    return { id: row.id, code: row.code, name: row.name, description: row.description, order: row.order, isActive: row.isActive };
  }
  return { id: row.id, name: row.name, isActive: row.isActive };
}
