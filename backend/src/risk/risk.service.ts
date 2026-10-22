import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/auth.types';
import { qualifiedTable } from '../common/database';
import { CreateRiskDto, CreateRiskListValueDto, ListRisksQueryDto } from './risk.dto';
import { RiskEntity } from './risk.entity';
import { RiskLevelEntity } from './risk-level.entity';
import { RiskTypeEntity } from './risk-type.entity';

export interface RiskListValue {
  id: number | string;
  name: string;
  isActive: number | string;
}

@Injectable()
export class RiskService {
  constructor(
    @Inject(DataSource) private readonly dataSource: DataSource,
    @Inject(AuditService) private readonly audit: AuditService
  ) {}

  async listForProcess(
    processId: number,
    actor: AuthenticatedUser,
    query: ListRisksQueryDto
  ): Promise<{ items: Record<string, unknown>[]; total: number; page: number; limit: number }> {
    this.validatePagination(query);
    await this.assertCanReadProcessRisks(processId, actor);
    const offset = (query.page - 1) * query.limit;
    if (!Number.isSafeInteger(offset)) throw new BadRequestException('Invalid pagination values');

    const [items, counts] = await Promise.all([
      this.dataSource.query(
        `SELECT R.ID AS "id", R.PROCESS_ID AS "processId",
                R.DESCRIPTION AS "description", R.CAUSE AS "cause",
                R.CONSEQUENCE AS "consequence",
                R.RISK_TYPE AS "riskType", R.RISK_TYPE AS "riskTypeName",
                R.RISK_LEVEL AS "riskLevel", R.RISK_LEVEL AS "riskLevelName",
                R.CREATED_AT AS "createdAt"
         FROM ${qualifiedTable('PROCESS_RISK')} R
         WHERE R.PROCESS_ID = :1
         ORDER BY R.ID
         OFFSET :2 ROWS FETCH NEXT :3 ROWS ONLY`,
        [processId, offset, query.limit]
      ),
      this.dataSource.query(
        `SELECT COUNT(*) AS "total" FROM ${qualifiedTable('PROCESS_RISK')} WHERE PROCESS_ID = :1`,
        [processId]
      )
    ]);
    return {
      items,
      total: Number(counts[0].total),
      page: query.page,
      limit: query.limit
    };
  }

  async createForProcess(
    processId: number,
    actor: AuthenticatedUser,
    input: CreateRiskDto
  ): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      const processRows: Array<{ id: number | string }> = await manager.query(
        `SELECT ID AS "id" FROM ${qualifiedTable('PROCESS')}
         WHERE ID = :1 AND IS_ACTIVE = 1 FOR UPDATE`,
        [processId]
      );
      if (!processRows.length) throw new NotFoundException('Process not found');

      let typeName = input.type ?? input.riskType;
      if (!typeName && input.riskTypeId) {
        const riskType = await this.lockActiveListValue(manager, 'RISK_TYPE', input.riskTypeId);
        typeName = riskType.name;
      }
      if (!typeName) throw new BadRequestException('Tipo de riesgo es obligatorio');

      let levelName = input.level ?? input.riskLevel;
      if (!levelName && input.riskLevelId) {
        const riskLevel = await this.lockActiveListValue(manager, 'RISK_LEVEL', input.riskLevelId);
        levelName = riskLevel.name;
      }
      if (!levelName) throw new BadRequestException('Nivel de riesgo es obligatorio');

      const repository = manager.getRepository(RiskEntity);
      const saved = await repository.save(repository.create({
        processId,
        description: input.description,
        cause: input.cause,
        consequence: input.consequence,
        riskType: typeName,
        riskLevel: levelName
      }));
      await this.audit.record({
        actorUserId: actor.id,
        action: 'PROCESS_RISK_CREATED',
        entityType: 'PROCESS_RISK',
        entityId: String(saved.id),
        afterValue: {
          processId,
          description: saved.description,
          cause: saved.cause,
          consequence: saved.consequence,
          riskType: saved.riskType,
          riskLevel: saved.riskLevel
        }
      }, manager);
      return {
        id: saved.id,
        processId: saved.processId,
        description: saved.description,
        cause: saved.cause,
        consequence: saved.consequence,
        riskType: saved.riskType,
        riskTypeName: saved.riskType,
        riskTypeId: input.riskTypeId ?? null,
        riskLevel: saved.riskLevel,
        riskLevelName: saved.riskLevel,
        riskLevelId: input.riskLevelId ?? null,
        createdAt: saved.createdAt
      };
    });
  }

  async listTypes(actor: AuthenticatedUser): Promise<{ items: RiskListValue[] }> {
    return { items: await this.listValues('RISK_TYPE', actor.profiles.includes('ADMIN')) };
  }

  async listLevels(actor: AuthenticatedUser): Promise<{ items: RiskListValue[] }> {
    return { items: await this.listValues('RISK_LEVEL', actor.profiles.includes('ADMIN')) };
  }

  async createType(actor: AuthenticatedUser, input: CreateRiskListValueDto): Promise<RiskListValue> {
    return this.createListValue('RISK_TYPE', actor, input);
  }

  async createLevel(actor: AuthenticatedUser, input: CreateRiskListValueDto): Promise<RiskListValue> {
    return this.createListValue('RISK_LEVEL', actor, input);
  }

  async deactivateType(actor: AuthenticatedUser, id: number): Promise<void> {
    await this.deactivateListValue('RISK_TYPE', id, actor);
  }

  async deactivateLevel(actor: AuthenticatedUser, id: number): Promise<void> {
    await this.deactivateListValue('RISK_LEVEL', id, actor);
  }

  private async assertCanReadProcessRisks(processId: number, actor: AuthenticatedUser): Promise<void> {
    const rows: Array<{ id: number | string }> = await this.dataSource.query(
      `SELECT ID AS "id" FROM ${qualifiedTable('PROCESS')}
       WHERE ID = :1 AND IS_ACTIVE = 1`,
      [processId]
    );
    if (!rows.length) throw new NotFoundException('Process not found');
    if (actor.profiles.includes('ADMIN') || actor.profiles.includes('PROCESS_OWNER') || actor.profiles.includes('RISK_MANAGER')) return;
    throw new ForbiddenException();
  }

  private async lockActiveListValue(
    manager: EntityManager,
    table: 'RISK_TYPE' | 'RISK_LEVEL',
    id: number
  ): Promise<{ name: string }> {
    const rows: Array<{ name: string; isActive: number | string }> = await manager.query(
      `SELECT NAME AS "name", IS_ACTIVE AS "isActive"
       FROM ${qualifiedTable(table)} WHERE ID = :1 FOR UPDATE`,
      [id]
    );
    if (!rows.length) throw new BadRequestException('Risk type or level is invalid');
    if (Number(rows[0].isActive) !== 1) throw new ConflictException('Risk type or level is inactive');
    return { name: rows[0].name };
  }

  private async listValues(
    table: 'RISK_TYPE' | 'RISK_LEVEL',
    includeInactive: boolean
  ): Promise<RiskListValue[]> {
    const rows: RiskListValue[] = await this.dataSource.query(
      `SELECT ID AS "id", NAME AS "name", IS_ACTIVE AS "isActive"
       FROM ${qualifiedTable(table)}
       ${includeInactive ? '' : 'WHERE IS_ACTIVE = 1'}
       ORDER BY NAME, ID`
    );
    return rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      isActive: Number(row.isActive)
    }));
  }

  private async createListValue(
    table: 'RISK_TYPE' | 'RISK_LEVEL',
    actor: AuthenticatedUser,
    input: CreateRiskListValueDto
  ): Promise<RiskListValue> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(table === 'RISK_TYPE' ? RiskTypeEntity : RiskLevelEntity);
      const duplicate = await repository.findOneBy({ name: input.name });
      if (duplicate) throw new ConflictException('Risk list value already exists');
      const saved = await repository.save(repository.create({ name: input.name, isActive: 1 }));
      await this.audit.record({
        actorUserId: actor.id,
        action: `${table}_CREATED`,
        entityType: table,
        entityId: String(saved.id),
        afterValue: { id: saved.id, name: saved.name, isActive: saved.isActive }
      }, manager);
      return {
        id: saved.id,
        name: saved.name,
        isActive: saved.isActive
      };
    });
  }

  private async deactivateListValue(
    table: 'RISK_TYPE' | 'RISK_LEVEL',
    id: number,
    actor: AuthenticatedUser
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const rows: Array<{ id: number | string; name: string; isActive: number | string }> =
        await manager.query(
          `SELECT ID AS "id", NAME AS "name", IS_ACTIVE AS "isActive"
           FROM ${qualifiedTable(table)} WHERE ID = :1 FOR UPDATE`,
          [id]
        );
      if (!rows.length) throw new NotFoundException('Risk list value not found');
      if (Number(rows[0].isActive) !== 1) throw new ConflictException('Risk list value is already inactive');
      await manager.query(
        `UPDATE ${qualifiedTable(table)} SET IS_ACTIVE = 0 WHERE ID = :1`,
        [id]
      );
      await this.audit.record({
        actorUserId: actor.id,
        action: `${table}_DEACTIVATED`,
        entityType: table,
        entityId: String(id),
        beforeValue: { id, name: rows[0].name, isActive: 1 },
        afterValue: { id, name: rows[0].name, isActive: 0 }
      }, manager);
    });
  }

  private validatePagination(query: ListRisksQueryDto): void {
    if (!Number.isSafeInteger(query.page) || query.page < 1 ||
      !Number.isSafeInteger(query.limit) || query.limit < 1 || query.limit > 100) {
      throw new BadRequestException('Invalid pagination values');
    }
  }
}
