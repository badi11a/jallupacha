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
import { CreateProcessDto, ListProcessesQueryDto, ProcessFieldsDto, ReassignProcessOwnerDto, UpdateProcessDto } from './process.dto';
import { ProcessEntity } from './process.entity';
import { ProcessVersionEntity } from './process-version.entity';

const PROCESS_FIELDS: Array<keyof ProcessFieldsDto> = [
  'name',
  'alias',
  'description',
  'objective',
  'scope',
  'inputs',
  'outputs',
  'suppliers',
  'clients',
  'involvedParties',
  'startsWhen',
  'endsWhen',
  'developmentPlan',
  'operation',
  'design',
  'validation',
  'businessArea',
  'subprocessType',
  'criticality',
  'automationLevel',
  'periodicity'
];

@Injectable()
export class ProcessService {
  constructor(
    @Inject(DataSource) private readonly dataSource: DataSource,
    @Inject(AuditService) private readonly audit: AuditService
  ) {}

  async list(query: ListProcessesQueryDto): Promise<{ items: unknown[]; total: number; page: number; limit: number }> {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    if (!Number.isSafeInteger(page) || page < 1 ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('Invalid pagination values');
    }
    const offset = (page - 1) * limit;
    if (!Number.isSafeInteger(offset)) throw new BadRequestException('Invalid pagination values');

    const [items, count] = await Promise.all([
      this.dataSource.query(
        `SELECT P.ID AS "id", P.CODE AS "code", COALESCE(V.NAME, 'Sin nombre') AS "name",
                M.ID AS "macroprocessId", M.NAME AS "macroprocessName",
                T.ID AS "processTypeId", T.NAME AS "processTypeName",
                P.OWNER_USER_ID AS "ownerUserId", I.DISPLAY_NAME AS "ownerDisplayName",
                V.STATUS AS "status", V.REVISION AS "revision"
         FROM ${qualifiedTable('PROCESS')} P
         JOIN ${qualifiedTable('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID
         JOIN ${qualifiedTable('MACROPROCESS')} M ON M.ID = V.MACROPROCESS_ID
         JOIN ${qualifiedTable('PROCESS_TYPE')} T ON T.ID = V.PROCESS_TYPE_ID
         JOIN ${qualifiedTable('USER_IDENTITY')} I ON I.USER_ID = P.OWNER_USER_ID
         WHERE P.IS_ACTIVE = 1
         ORDER BY P.ID DESC OFFSET :1 ROWS FETCH NEXT :2 ROWS ONLY`,
        [offset, limit]
      ),
      this.dataSource.query(
        `SELECT COUNT(*) AS "total" FROM ${qualifiedTable('PROCESS')} WHERE IS_ACTIVE = 1`
      )
    ]);
    return { items, total: Number(count[0].total), page, limit };
  }

  async get(id: number): Promise<Record<string, unknown>> {
    const rows = await this.dataSource.query(
      `${this.detailSelect()}
       WHERE P.ID = :1 AND P.IS_ACTIVE = 1`,
      [id]
    );
    if (!rows.length) throw new NotFoundException('Process not found');
    return rows[0];
  }

  async create(actor: AuthenticatedUser, input: CreateProcessDto): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      await this.lockCatalog(manager, 'MACROPROCESS', input.macroprocessId);
      await this.lockCatalog(manager, 'PROCESS_TYPE', input.processTypeId);
      if (input.parentProcessId !== undefined && input.parentProcessId !== null) {
        await this.assertParentExists(manager, input.parentProcessId);
      }

      const sequence = await manager.query(
        `SELECT ${qualifiedTable('PROCESS_CODE_SEQ')}.NEXTVAL AS "codeNumber" FROM DUAL`
      );
      const processRepository = manager.getRepository(ProcessEntity);
      const process = await processRepository.save(processRepository.create({
        code: `PR${Number(sequence[0].codeNumber)}`,
        ownerUserId: actor.id,
        currentVersionId: null,
        isActive: 1
      }));
      const versionRepository = manager.getRepository(ProcessVersionEntity);
      const version = await versionRepository.save(versionRepository.create({
        processId: process.id,
        versionNumber: 1,
        status: 'Borrador',
        macroprocessId: input.macroprocessId,
        processTypeId: input.processTypeId,
        parentProcessId: input.parentProcessId ?? null,
        revision: 1,
        ...nullableFields(input)
      }));
      process.currentVersionId = version.id;
      await processRepository.save(process);
      await this.audit.record({
        actorUserId: actor.id,
        action: 'PROCESS_CREATED',
        entityType: 'PROCESS',
        entityId: String(process.id),
        afterValue: processSnapshot(process, version)
      }, manager);
      return this.getWithManager(manager, process.id);
    });
  }

  async update(
    id: number,
    actor: AuthenticatedUser,
    input: UpdateProcessDto
  ): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      if (input.parentProcessId !== undefined) {
        await manager.query(`SELECT ID FROM ${qualifiedTable('ADMIN_CONTROL')} WHERE ID = 1 FOR UPDATE`);
      }
      const process = await this.lockProcess(manager, id);
      this.ensureCanEdit(process, actor);
      const version = await this.getCurrentVersion(manager, process);
      this.ensureDraftAndRevision(version, input.revision);

      const macroprocessId = input.macroprocessId ?? version.macroprocessId;
      const processTypeId = input.processTypeId ?? version.processTypeId;
      await this.lockCatalog(manager, 'MACROPROCESS', macroprocessId);
      await this.lockCatalog(manager, 'PROCESS_TYPE', processTypeId);

      const parentProcessId = input.parentProcessId === undefined
        ? version.parentProcessId
        : input.parentProcessId;
      if (parentProcessId !== null) {
        await this.assertParentExists(manager, parentProcessId);
      }
      if (parentProcessId !== null &&
        input.parentProcessId !== undefined &&
        parentProcessId !== version.parentProcessId) {
        await this.assertNoParentCycle(manager, id, parentProcessId);
      }

      const before = processSnapshot(process, version);
      version.macroprocessId = macroprocessId;
      version.processTypeId = processTypeId;
      version.parentProcessId = parentProcessId;
      for (const field of PROCESS_FIELDS) {
        if (input[field] !== undefined) version[field] = input[field] ?? null;
      }
      version.revision += 1;
      const savedVersion = await manager.getRepository(ProcessVersionEntity).save(version);
      await this.audit.record({
        actorUserId: actor.id,
        action: 'PROCESS_UPDATED',
        entityType: 'PROCESS',
        entityId: String(process.id),
        beforeValue: before,
        afterValue: processSnapshot(process, savedVersion)
      }, manager);
      return this.getWithManager(manager, process.id);
    });
  }

  async reassignOwner(
    id: number,
    actor: AuthenticatedUser,
    input: ReassignProcessOwnerDto
  ): Promise<Record<string, unknown>> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(`SELECT ID FROM ${qualifiedTable('ADMIN_CONTROL')} WHERE ID = 1 FOR UPDATE`);
      const process = await this.lockProcess(manager, id);
      const version = await this.getCurrentVersion(manager, process);
      this.ensureDraftAndRevision(version, input.revision);
      if (process.ownerUserId === input.ownerUserId) {
        throw new ConflictException('Process already has this owner');
      }

      const target = await manager.query(
        `SELECT ID FROM ${qualifiedTable('APP_USER')} WHERE ID = :1 AND IS_ACTIVE = 1 FOR UPDATE`,
        [input.ownerUserId]
      );
      const ownerProfile = await manager.query(
        `SELECT USER_ID FROM ${qualifiedTable('USER_PROFILE')}
         WHERE USER_ID = :1 AND PROFILE_CODE = 'PROCESS_OWNER' FOR UPDATE`,
        [input.ownerUserId]
      );
      if (!target.length || !ownerProfile.length) {
        throw new BadRequestException('Owner must be an active user with the process-owner profile');
      }

      const before = processSnapshot(process, version);
      process.ownerUserId = input.ownerUserId;
      await manager.getRepository(ProcessEntity).save(process);
      version.revision += 1;
      const savedVersion = await manager.getRepository(ProcessVersionEntity).save(version);
      await this.audit.record({
        actorUserId: actor.id,
        action: 'PROCESS_OWNER_REASSIGNED',
        entityType: 'PROCESS',
        entityId: String(process.id),
        beforeValue: before,
        afterValue: processSnapshot(process, savedVersion)
      }, manager);
      return this.getWithManager(manager, process.id);
    });
  }

  private async lockCatalog(manager: EntityManager, name: 'MACROPROCESS' | 'PROCESS_TYPE', id: number): Promise<void> {
    const rows: Array<{ id: number | string; isActive: number | string }> = await manager.query(
      `SELECT ID AS "id", IS_ACTIVE AS "isActive"
       FROM ${qualifiedTable(name)} WHERE ID = :1 FOR UPDATE`,
      [id]
    );
    if (!rows.length) throw new NotFoundException(`${name} not found`);
    if (Number(rows[0].isActive) !== 1) throw new ConflictException(`${name} is inactive`);
  }

  private async lockProcess(manager: EntityManager, id: number): Promise<ProcessEntity> {
    const rows: Array<{ parentProcessId: number | string | null }> = await manager.query(
      `SELECT ID AS "id" FROM ${qualifiedTable('PROCESS')}
       WHERE ID = :1 AND IS_ACTIVE = 1 FOR UPDATE`,
      [id]
    );
    if (!rows.length) throw new NotFoundException('Process not found');
    const process = await manager.getRepository(ProcessEntity).findOneBy({ id });
    if (!process) throw new NotFoundException('Process not found');
    return process;
  }

  private ensureCanEdit(process: ProcessEntity, actor: AuthenticatedUser): void {
    if (actor.profiles.includes('ADMIN')) return;
    if (process.ownerUserId !== actor.id || !actor.profiles.includes('PROCESS_OWNER')) {
      throw new ForbiddenException();
    }
  }

  private async getCurrentVersion(manager: EntityManager, process: ProcessEntity): Promise<ProcessVersionEntity> {
    if (process.currentVersionId === null) {
      throw new ConflictException('Process has no current version');
    }
    const version = await manager.getRepository(ProcessVersionEntity).findOneBy({ id: process.currentVersionId });
    if (!version || version.processId !== process.id) {
      throw new ConflictException('Process current version is inconsistent');
    }
    return version;
  }

  private ensureDraftAndRevision(version: ProcessVersionEntity, expectedRevision: number): void {
    if (version.status !== 'Borrador') throw new ConflictException('Only drafts can be changed');
    if (version.revision !== expectedRevision) {
      throw new ConflictException('Process was changed by another request; reload before editing');
    }
  }

  private async assertParentExists(manager: EntityManager, parentId: number): Promise<void> {
    const rows = await manager.query(
      `SELECT ID FROM ${qualifiedTable('PROCESS')} WHERE ID = :1 AND IS_ACTIVE = 1`,
      [parentId]
    );
    if (!rows.length) throw new NotFoundException('Parent process not found');
  }

  private async assertNoParentCycle(manager: EntityManager, processId: number, parentId: number): Promise<void> {
    const visited = new Set<number>();
    let currentId: number | null = parentId;
    while (currentId !== null) {
      if (currentId === processId || visited.has(currentId)) {
        throw new BadRequestException('Parent process would create a cycle');
      }
      visited.add(currentId);
      const rows: Array<{ parentProcessId: number | string | null }> = await manager.query(
        `SELECT V.PARENT_PROCESS_ID AS "parentProcessId"
         FROM ${qualifiedTable('PROCESS')} P
         JOIN ${qualifiedTable('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID
         WHERE P.ID = :1 AND P.IS_ACTIVE = 1`,
        [currentId]
      );
      if (!rows.length) throw new NotFoundException('Parent process not found');
      currentId = rows[0].parentProcessId === null ? null : Number(rows[0].parentProcessId);
    }
  }

  private async getWithManager(manager: EntityManager, id: number): Promise<Record<string, unknown>> {
    const rows = await manager.query(
      `${this.detailSelect()}
       WHERE P.ID = :1 AND P.IS_ACTIVE = 1`,
      [id]
    );
    if (!rows.length) throw new NotFoundException('Process not found');
    return rows[0];
  }

  private detailSelect(): string {
    return `SELECT P.ID AS "id", P.CODE AS "code", P.OWNER_USER_ID AS "ownerUserId",
                   I.DISPLAY_NAME AS "ownerDisplayName", V.VERSION_NUMBER AS "versionNumber",
                   V.REVISION AS "revision", V.STATUS AS "status",
                   V.MACROPROCESS_ID AS "macroprocessId", M.NAME AS "macroprocessName",
                   V.PROCESS_TYPE_ID AS "processTypeId", T.NAME AS "processTypeName",
                   V.PARENT_PROCESS_ID AS "parentProcessId",
                   V.NAME AS "name", V.ALIAS AS "alias", V.DESCRIPTION AS "description",
                   V.OBJECTIVE AS "objective", V.SCOPE AS "scope", V.INPUTS AS "inputs",
                   V.OUTPUTS AS "outputs", V.SUPPLIERS AS "suppliers", V.CLIENTS AS "clients",
                   V.INVOLVED_PARTIES AS "involvedParties", V.STARTS_WHEN AS "startsWhen",
                   V.ENDS_WHEN AS "endsWhen", V.DEVELOPMENT_PLAN AS "developmentPlan",
                   V.OPERATION AS "operation", V.DESIGN AS "design", V.VALIDATION AS "validation",
                   V.BUSINESS_AREA AS "businessArea", V.SUBPROCESS_TYPE AS "subprocessType",
                   V.CRITICALITY AS "criticality", V.AUTOMATION_LEVEL AS "automationLevel",
                   V.PERIODICITY AS "periodicity",
                   CAST(NULL AS VARCHAR2(1 CHAR)) AS "internalUnits",
                   CAST(NULL AS VARCHAR2(1 CHAR)) AS "bpmnModel"
            FROM ${qualifiedTable('PROCESS')} P
            JOIN ${qualifiedTable('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID
            JOIN ${qualifiedTable('MACROPROCESS')} M ON M.ID = V.MACROPROCESS_ID
            JOIN ${qualifiedTable('PROCESS_TYPE')} T ON T.ID = V.PROCESS_TYPE_ID
            JOIN ${qualifiedTable('USER_IDENTITY')} I ON I.USER_ID = P.OWNER_USER_ID`;
  }
}

function nullableFields(input: ProcessFieldsDto): Record<string, string | null> {
  return Object.fromEntries(PROCESS_FIELDS.map((field) => [field, input[field] ?? null]));
}

function processSnapshot(process: ProcessEntity, version: ProcessVersionEntity): Record<string, unknown> {
  const fields = Object.fromEntries(PROCESS_FIELDS.map((field) => [field, version[field]]));
  return {
    code: process.code,
    ownerUserId: process.ownerUserId,
    versionNumber: version.versionNumber,
    status: version.status,
    revision: version.revision,
    macroprocessId: version.macroprocessId,
    processTypeId: version.processTypeId,
    parentProcessId: version.parentProcessId,
    ...fields
  };
}
