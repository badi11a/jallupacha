import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { MacroprocessTypeEntity } from './macroprocess-type.entity';
import { MacroprocessEntity } from './macroprocess.entity';
import { ProcessTypeEntity } from './process-type.entity';
import { OrganizationalUnitEntity } from './organizational-unit.entity';
import {
  CreateMacroprocessDto,
  CreateUnitDto,
  ProcessTypeDto,
  UpdateMacroprocessDto,
  UpdateProcessTypeDto,
  UpdateUnitDto
} from './catalog.dto';
import { qualifiedTable } from '../common/database';

@Injectable()
export class CatalogService {
  constructor(
    @Inject(DataSource) private readonly dataSource: DataSource,
    @Inject(AuditService) private readonly audit: AuditService
  ) {}

  async listMacroprocessTypes(): Promise<MacroprocessTypeEntity[]> {
    return this.dataSource.getRepository(MacroprocessTypeEntity).find({
      order: { sortOrder: 'ASC', id: 'ASC' }
    });
  }

  async listMacroprocesses(): Promise<MacroprocessEntity[]> {
    return this.dataSource.getRepository(MacroprocessEntity).find({
      relations: ['macroprocessType'],
      order: { order: 'ASC', id: 'ASC' }
    });
  }

  async createMacroprocess(actorId: number, input: CreateMacroprocessDto): Promise<MacroprocessEntity> {
    return this.dataSource.transaction(async (manager) => {
      const typeId = input.macroprocessTypeId ?? (
        await manager.getRepository(MacroprocessTypeEntity).findOne({ order: { sortOrder: 'ASC' } })
      )?.id ?? 1;

      const sequence = await manager.query(
        `SELECT ${qualifiedTable('MACROPROCESS_CODE_SEQ')}.NEXTVAL AS "codeNumber" FROM DUAL`
      );
      const repository = manager.getRepository(MacroprocessEntity);
      const row = repository.create({
        macroprocessTypeId: typeId,
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
    return this.dataSource.getRepository(ProcessTypeEntity).find({
      relations: ['macroprocess'],
      order: { name: 'ASC' }
    });
  }

  async createProcessType(actorId: number, input: ProcessTypeDto): Promise<ProcessTypeEntity> {
    return this.dataSource.transaction(async (manager) => {
      const macroprocessId = input.macroprocessId ?? (
        await manager.getRepository(MacroprocessEntity).findOne({ order: { id: 'ASC' } })
      )?.id ?? 1;

      const repository = manager.getRepository(ProcessTypeEntity);
      const duplicate = await repository.findOneBy({ macroprocessId, name: input.name });
      if (duplicate) {
        throw new ConflictException('Process type name already exists in this macroprocess');
      }
      const row = await repository.save(repository.create({
        macroprocessId,
        name: input.name,
        isActive: 1
      }));
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
        const duplicate = await repository.findOneBy({ macroprocessId: row.macroprocessId, name: input.name });
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

  // ---------- Unidades Organizacionales (REQ-54) ----------

  async listUnits(): Promise<OrganizationalUnitEntity[]> {
    return this.dataSource.getRepository(OrganizationalUnitEntity).find({
      order: { name: 'ASC' }
    });
  }

  async createUnit(actorId: number, input: CreateUnitDto): Promise<OrganizationalUnitEntity> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(OrganizationalUnitEntity);
      const parentUnitId = input.parentUnitId ?? null;
      if (parentUnitId !== null) {
        const parent = await repository.findOneBy({ id: parentUnitId, isActive: 1 });
        if (!parent) throw new BadRequestException('Parent unit does not exist or is inactive');
      }

      const duplicate = await repository.findOneBy({ parentUnitId: parentUnitId ?? IsNull(), name: input.name });
      if (duplicate) throw new ConflictException('A unit with this name already exists under the parent unit');

      const tempCode = `TMP${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.slice(0, 32).toUpperCase();
      const saved = await repository.save(repository.create({
        code: tempCode,
        name: input.name,
        parentUnitId,
        isActive: 1
      }));
      saved.code = `UNIDAD_${String(saved.id).padStart(2, '0')}`;
      await repository.save(saved);

      await this.audit.record({
        actorUserId: actorId,
        action: 'ORGANIZATIONAL_UNIT_CREATED',
        entityType: 'ORGANIZATIONAL_UNIT',
        entityId: String(saved.id),
        afterValue: snapshot(saved)
      }, manager);
      return saved;
    });
  }

  async updateUnit(actorId: number, id: number, input: UpdateUnitDto): Promise<OrganizationalUnitEntity> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(OrganizationalUnitEntity);
      const row = await repository.findOneBy({ id });
      if (!row) throw new NotFoundException('Unit not found');

      const parentUnitId = input.parentUnitId !== undefined ? (input.parentUnitId ?? null) : row.parentUnitId;
      if (parentUnitId !== null && parentUnitId !== row.parentUnitId) {
        const parent = await repository.findOneBy({ id: parentUnitId, isActive: 1 });
        if (!parent) throw new BadRequestException('Parent unit does not exist or is inactive');
        await this.assertNoUnitCycle(manager, id, parentUnitId);
      }

      const finalName = input.name ?? row.name;
      const duplicate = await repository.findOneBy({ parentUnitId: parentUnitId ?? IsNull(), name: finalName });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('A unit with this name already exists under the parent unit');
      }

      const before = snapshot(row);
      row.name = finalName;
      row.parentUnitId = parentUnitId;
      const saved = await repository.save(row);

      await this.audit.record({
        actorUserId: actorId,
        action: 'ORGANIZATIONAL_UNIT_UPDATED',
        entityType: 'ORGANIZATIONAL_UNIT',
        entityId: String(id),
        beforeValue: before,
        afterValue: snapshot(saved)
      }, manager);
      return saved;
    });
  }

  async deactivateUnit(actorId: number, id: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(OrganizationalUnitEntity);
      const row = await repository.findOneBy({ id });
      if (!row) throw new NotFoundException('Unit not found');
      if (row.isActive === 0) throw new ConflictException('Unit is already inactive');

      const before = snapshot(row);
      row.isActive = 0;
      await repository.save(row);

      await this.audit.record({
        actorUserId: actorId,
        action: 'ORGANIZATIONAL_UNIT_DEACTIVATED',
        entityType: 'ORGANIZATIONAL_UNIT',
        entityId: String(id),
        beforeValue: before,
        afterValue: snapshot(row)
      }, manager);
    });
  }

  private async assertNoUnitCycle(manager: EntityManager, unitId: number, newParentId: number): Promise<void> {
    const seen = new Set<number>();
    let cursor: number | null = newParentId;
    while (cursor !== null) {
      if (cursor === unitId) throw new BadRequestException('A unit cannot depend on itself or its subordinates');
      if (seen.has(cursor)) break;
      seen.add(cursor);
      const rows = await manager.getRepository(OrganizationalUnitEntity).findOneBy({ id: cursor });
      cursor = rows && rows.parentUnitId !== null ? rows.parentUnitId : null;
    }
  }
}

function snapshot(row: MacroprocessEntity | ProcessTypeEntity | OrganizationalUnitEntity): Record<string, unknown> {
  if (row instanceof MacroprocessEntity) {
    return { id: row.id, code: row.code, name: row.name, description: row.description, order: row.order, isActive: row.isActive };
  }
  if (row instanceof ProcessTypeEntity) {
    return { id: row.id, macroprocessId: row.macroprocessId, name: row.name, isActive: row.isActive };
  }
  return { id: row.id, code: row.code, name: row.name, parentUnitId: row.parentUnitId, isActive: row.isActive };
}
