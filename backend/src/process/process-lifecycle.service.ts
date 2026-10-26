import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/auth.types';
import { qualifiedTable as table } from '../common/database';
import { runDatabaseOperation } from '../common/database-operation';

import { Row } from '../common/database-values';

import { ProcessRecordsService } from './process-records.service';

@Injectable()
export class ProcessLifecycleService {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource, @Inject(AuditService) private readonly audit: AuditService, @Inject(ProcessRecordsService) private readonly records: ProcessRecordsService) { }

  async submitProcess(id: number, actor?: AuthenticatedUser): Promise<{ id: number; status: string }> {
    return runDatabaseOperation(() => this.dataSource.transaction(async (manager) => {
      const rows: Row[] = await manager.query(
        `SELECT P.ID AS "id", P.CURRENT_VERSION_ID AS "versionId", V.STATUS AS "status"
         FROM ${table('PROCESS')} P
         JOIN ${table('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID
         WHERE P.ID = :1 AND P.IS_ACTIVE = 1 FOR UPDATE`,
        [id]
      );
      if (rows.length !== 1) throw new NotFoundException('Proceso no encontrado.');
      if (rows[0].status !== 'Borrador') {
        throw new ConflictException('Solo se pueden enviar a revisión procesos en estado Borrador.');
      }

      const detail = (await this.records.processDetail(id)) as { completeness: { complete: boolean; missing: string[] } };
      if (!detail.completeness.complete) {
        throw new BadRequestException(
          `El proceso no cumple con los campos obligatorios para revisión: ${detail.completeness.missing.join(', ')}`
        );
      }

      await manager.query(
        `UPDATE ${table('PROCESS_VERSION')} SET STATUS = 'En revisión', REVISION = REVISION + 1 WHERE ID = :1`,
        [Number(rows[0].versionId)]
      );

      if (this.audit) {
        await this.audit.record({
          actorUserId: actor?.id ?? null,
          action: 'PROCESS_SUBMITTED',
          entityType: 'PROCESS',
          entityId: String(id),
          afterValue: { status: 'En revisión' }
        }, manager);
      }
      return { id, status: 'En revisión' };
    }));
  }

  async approveProcess(id: number, actor?: AuthenticatedUser): Promise<{ id: number; status: string }> {
    return runDatabaseOperation(() => this.dataSource.transaction(async (manager) => {
      const rows: Row[] = await manager.query(
        `SELECT P.ID AS "id", P.CURRENT_VERSION_ID AS "versionId", V.STATUS AS "status", V.ELABORATOR AS "elaborator"
         FROM ${table('PROCESS')} P
         JOIN ${table('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID
         WHERE P.ID = :1 AND P.IS_ACTIVE = 1 FOR UPDATE`,
        [id]
      );
      if (rows.length !== 1) throw new NotFoundException('Proceso no encontrado.');
      if (rows[0].status !== 'En revisión') {
        throw new ConflictException('Solo se pueden aprobar procesos en estado En revisión.');
      }

      if (actor && !actor.profiles.includes('ADMIN')) {
        const actorNameRows: Row[] = await manager.query(
          `SELECT I.DISPLAY_NAME AS "name" FROM ${table('USER_IDENTITY')} I WHERE I.USER_ID = :1`,
          [actor.id]
        );
        const actorName = actorNameRows.length ? String(actorNameRows[0].name) : '';
        const elaborator = rows[0].elaborator ? String(rows[0].elaborator) : '';
        if (elaborator && (elaborator === actorName || elaborator === `Usuario ${actor.id}`)) {
          throw new ForbiddenException('El validador debe ser una persona distinta de quien elaboró el proceso.');
        }
      }

      await manager.query(
        `UPDATE ${table('PROCESS_VERSION')} SET STATUS = 'Obsoleto' WHERE PROCESS_ID = :1 AND ID <> :2 AND STATUS = 'Vigente'`,
        [id, Number(rows[0].versionId)]
      );

      await manager.query(
        `UPDATE ${table('PROCESS_VERSION')} SET STATUS = 'Vigente', REVISION = REVISION + 1 WHERE ID = :1`,
        [Number(rows[0].versionId)]
      );

      if (this.audit) {
        await this.audit.record({
          actorUserId: actor?.id ?? null,
          action: 'PROCESS_APPROVED',
          entityType: 'PROCESS',
          entityId: String(id),
          afterValue: { status: 'Vigente' }
        }, manager);
      }
      return { id, status: 'Vigente' };
    }));
  }

  async rejectProcess(id: number, reason: string, actor?: AuthenticatedUser): Promise<{ id: number; status: string; reason: string }> {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('El motivo de rechazo es obligatorio.');
    }
    return runDatabaseOperation(() => this.dataSource.transaction(async (manager) => {
      const rows: Row[] = await manager.query(
        `SELECT P.ID AS "id", P.CURRENT_VERSION_ID AS "versionId", V.STATUS AS "status", V.ELABORATOR AS "elaborator", V.VALIDATION AS "validation"
         FROM ${table('PROCESS')} P
         JOIN ${table('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID
         WHERE P.ID = :1 AND P.IS_ACTIVE = 1 FOR UPDATE`,
        [id]
      );
      if (rows.length !== 1) throw new NotFoundException('Proceso no encontrado.');
      if (rows[0].status !== 'En revisión') {
        throw new ConflictException('Solo se pueden rechazar procesos en estado En revisión.');
      }

      if (actor && !actor.profiles.includes('ADMIN')) {
        const actorNameRows: Row[] = await manager.query(
          `SELECT I.DISPLAY_NAME AS "name" FROM ${table('USER_IDENTITY')} I WHERE I.USER_ID = :1`,
          [actor.id]
        );
        const actorName = actorNameRows.length ? String(actorNameRows[0].name) : '';
        const elaborator = rows[0].elaborator ? String(rows[0].elaborator) : '';
        if (elaborator && (elaborator === actorName || elaborator === `Usuario ${actor.id}`)) {
          throw new ForbiddenException('El validador debe ser una persona distinta de quien elaboró el proceso.');
        }
      }

      const prevValidation = rows[0].validation ? String(rows[0].validation) + '\n\n' : '';
      const feedback = `${prevValidation}[Revisión rechazada]: ${reason.trim()}`;

      await manager.query(
        `UPDATE ${table('PROCESS_VERSION')} SET STATUS = 'Borrador', VALIDATION = :1, REVISION = REVISION + 1 WHERE ID = :2`,
        [feedback, Number(rows[0].versionId)]
      );

      if (this.audit) {
        await this.audit.record({
          actorUserId: actor?.id ?? null,
          action: 'PROCESS_REVISION_REJECTED',
          entityType: 'PROCESS',
          entityId: String(id),
          afterValue: { status: 'Borrador', reason: reason.trim() }
        }, manager);
      }
      return { id, status: 'Borrador', reason: reason.trim() };
    }));
  }

  async newVersion(id: number, actor?: AuthenticatedUser): Promise<{ id: number; status: string; versionNumber: number }> {
    return runDatabaseOperation(() => this.dataSource.transaction(async (manager) => {
      const rows: Row[] = await manager.query(
        `SELECT P.ID AS "id", P.CURRENT_VERSION_ID AS "versionId", V.*
         FROM ${table('PROCESS')} P
         JOIN ${table('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID
         WHERE P.ID = :1 AND P.IS_ACTIVE = 1 FOR UPDATE`,
        [id]
      );
      if (rows.length !== 1) throw new NotFoundException('Proceso no encontrado.');
      const current = rows[0];
      if (current.STATUS !== 'Vigente') {
        throw new ConflictException('Solo se puede crear una nueva versión de un proceso Vigente.');
      }

      const nextVersionNumber = Number(current.VERSION_NUMBER || 1) + 1;
      let elaborator = current.ELABORATOR;
      if (actor) {
        const actorRows: Row[] = await manager.query(
          `SELECT I.DISPLAY_NAME AS "name" FROM ${table('USER_IDENTITY')} I WHERE I.USER_ID = :1`,
          [actor.id]
        );
        if (actorRows.length) elaborator = String(actorRows[0].name);
      }

      const insertSql = `
        INSERT INTO ${table('PROCESS_VERSION')} (
          PROCESS_ID, VERSION_NUMBER, STATUS, MACROPROCESS_ID, PROCESS_TYPE_ID, PARENT_PROCESS_ID,
          ELABORATOR, RESPONSIBLE, NAME, ALIAS, DESCRIPTION, OBJECTIVE, SCOPE,
          INPUTS, OUTPUTS, SUPPLIERS, CLIENTS, INVOLVED_PARTIES, STARTS_WHEN, ENDS_WHEN,
          DEVELOPMENT_PLAN, OPERATION, DESIGN, VALIDATION, BUSINESS_AREA, SUBPROCESS_TYPE,
          CRITICALITY, AUTOMATION_LEVEL, PERIODICITY, DOCUMENTS, SYSTEMS_USED, INDICATORS,
          IMPROVEMENT_OPPORTUNITIES, BPMN_MODEL_REFERENCE, REVISION
        ) VALUES (
          :1, :2, 'Borrador', :3, :4, :5,
          :6, :7, :8, :9, :10, :11, :12,
          :13, :14, :15, :16, :17, :18, :19,
          :20, :21, :22, :23, :24, :25,
          :26, :27, :28, :29, :30, :31,
          :32, :33, 1
        )
      `;
      await manager.query(insertSql, [
        id, nextVersionNumber, current.MACROPROCESS_ID, current.PROCESS_TYPE_ID, current.PARENT_PROCESS_ID,
        elaborator, current.RESPONSIBLE, current.NAME, current.ALIAS, current.DESCRIPTION, current.OBJECTIVE, current.SCOPE,
        current.INPUTS, current.OUTPUTS, current.SUPPLIERS, current.CLIENTS, current.INVOLVED_PARTIES, current.STARTS_WHEN, current.ENDS_WHEN,
        current.DEVELOPMENT_PLAN, current.OPERATION, current.DESIGN, null, current.BUSINESS_AREA, current.SUBPROCESS_TYPE,
        current.CRITICALITY, current.AUTOMATION_LEVEL, current.PERIODICITY, current.DOCUMENTS, current.SYSTEMS_USED, current.INDICATORS,
        current.IMPROVEMENT_OPPORTUNITIES, current.BPMN_MODEL_REFERENCE
      ]);

      const created: Row[] = await manager.query(
        `SELECT MAX(ID) AS "id" FROM ${table('PROCESS_VERSION')} WHERE PROCESS_ID = :1`,
        [id]
      );
      const newVersionId = Number(created[0].id);

      await manager.query(
        `UPDATE ${table('PROCESS')} SET CURRENT_VERSION_ID = :1 WHERE ID = :2`,
        [newVersionId, id]
      );

      if (this.audit) {
        await this.audit.record({
          actorUserId: actor?.id ?? null,
          action: 'PROCESS_NEW_VERSION_CREATED',
          entityType: 'PROCESS',
          entityId: String(id),
          afterValue: { versionNumber: nextVersionNumber, status: 'Borrador' }
        }, manager);
      }

      return { id, status: 'Borrador', versionNumber: nextVersionNumber };
    }));
  }

  async retireProcess(id: number, actor?: AuthenticatedUser): Promise<{ id: number; status: string }> {
    return runDatabaseOperation(() => this.dataSource.transaction(async (manager) => {
      const rows: Row[] = await manager.query(
        `SELECT P.ID AS "id", P.CURRENT_VERSION_ID AS "versionId", V.STATUS AS "status"
         FROM ${table('PROCESS')} P
         JOIN ${table('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID
         WHERE P.ID = :1 AND P.IS_ACTIVE = 1 FOR UPDATE`,
        [id]
      );
      if (rows.length !== 1) throw new NotFoundException('Proceso no encontrado.');
      if (rows[0].status !== 'Vigente') {
        throw new ConflictException('Solo se pueden retirar procesos en estado Vigente.');
      }

      await manager.query(
        `UPDATE ${table('PROCESS_VERSION')} SET STATUS = 'Obsoleto', REVISION = REVISION + 1 WHERE ID = :1`,
        [Number(rows[0].versionId)]
      );

      if (this.audit) {
        await this.audit.record({
          actorUserId: actor?.id ?? null,
          action: 'PROCESS_RETIRED',
          entityType: 'PROCESS',
          entityId: String(id),
          afterValue: { status: 'Obsoleto' }
        }, manager);
      }
      return { id, status: 'Obsoleto' };
    }));
  }
}
