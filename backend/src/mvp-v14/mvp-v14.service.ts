import {
  BadRequestException, ConflictException, ForbiddenException, HttpException, Inject, Injectable, NotFoundException, Optional
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/auth.types';
import { qualifiedTable as table } from '../common/database';
import {
  asBody, asId, Body, foldText, oneOf, optionalId, optionalText, RELATION_TYPES, rejectUnknownKeys,
  requiredId, requiredText, RISK_LEVELS, SQL_FOLD_FROM, SQL_FOLD_TO
} from './mvp-v14.validation';

type Row = Record<string, unknown>;

/** Campos de la ficha (REQ-06): clave de API, columna, máximo de caracteres y etiqueta para mensajes. */
const FICHA_FIELDS = [
  ['elaborator', 'ELABORATOR', 250, 'Elaborador'],
  ['responsible', 'RESPONSIBLE', 250, 'Responsable'],
  ['name', 'NAME', 250, 'Nombre'],
  ['alias', 'ALIAS', 250, 'Alias'],
  ['businessArea', 'BUSINESS_AREA', 250, 'Área de negocio'],
  ['subprocessType', 'SUBPROCESS_TYPE', 250, 'Tipo de subproceso'],
  ['criticality', 'CRITICALITY', 250, 'Criticidad'],
  ['automationLevel', 'AUTOMATION_LEVEL', 250, 'Grado de automatización'],
  ['periodicity', 'PERIODICITY', 250, 'Periodicidad'],
  ['description', 'DESCRIPTION', 4000, 'Descripción'],
  ['objective', 'OBJECTIVE', 4000, 'Objetivo'],
  ['scope', 'SCOPE', 4000, 'Alcance'],
  ['inputs', 'INPUTS', 4000, 'Entradas'],
  ['outputs', 'OUTPUTS', 4000, 'Salidas'],
  ['suppliers', 'SUPPLIERS', 4000, 'Proveedores'],
  ['clients', 'CLIENTS', 4000, 'Clientes'],
  ['involvedParties', 'INVOLVED_PARTIES', 4000, 'Involucrados'],
  ['documents', 'DOCUMENTS', 4000, 'Documentos'],
  ['systemsUsed', 'SYSTEMS_USED', 4000, 'Sistemas utilizados'],
  ['indicators', 'INDICATORS', 4000, 'Indicadores'],
  ['improvementOpportunities', 'IMPROVEMENT_OPPORTUNITIES', 4000, 'Oportunidades de mejora'],
  ['startsWhen', 'STARTS_WHEN', 4000, 'Cuándo inicia'],
  ['endsWhen', 'ENDS_WHEN', 4000, 'Cuándo termina'],
  ['developmentPlan', 'DEVELOPMENT_PLAN', 4000, 'Plan de desarrollo'],
  ['operation', 'OPERATION', 4000, 'Operación del proceso'],
  ['design', 'DESIGN', 4000, 'Diseño del proceso'],
  ['validation', 'VALIDATION', 4000, 'Validación del proceso'],
  ['bpmnModelReference', 'BPMN_MODEL_REFERENCE', 4000, 'Modelo del proceso (BPMN)']
] as const;

const PROCESS_KEYS = [
  'macroprocessId', 'processTypeId', 'parentProcessId', 'responsibleUnitId', 'participants', 'risks',
  ...FICHA_FIELDS.map(([key]) => key)
];

const fold = (expression: string): string => `TRANSLATE(LOWER(${expression}), '${SQL_FOLD_FROM}', '${SQL_FOLD_TO}')`;
const bool = (value: unknown): boolean => Number(value) === 1;

interface UnitAssociation { unitId: number; role: 'RESPONSABLE' | 'PARTICIPANTE'; unitFunction: string | null }

@Injectable()
export class MvpV14Service {
  constructor(private readonly dataSource: DataSource, @Optional() @Inject(AuditService) private readonly audit?: AuditService) {}

  // ---------- Tipos de proceso (REQ-51) ----------

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
    return this.run(() => this.dataSource.transaction(async (manager) => {
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
    return this.run(() => this.dataSource.transaction(async (manager) => {
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
    return this.run(() => this.dataSource.transaction(async (manager) => {
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

  // ---------- Unidades internas (REQ-54) ----------

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
    return this.run(() => this.dataSource.transaction(async (manager) => {
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
    return this.run(() => this.dataSource.transaction(async (manager) => {
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
    return this.run(async () => {
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

  // ---------- Procesos (REQ-05, 06, 19, 55) ----------

  async listProcesses(query: Record<string, unknown>): Promise<unknown[]> {
    const params: unknown[] = [];
    const conditions = ['P.IS_ACTIVE = 1'];
    const bind = (value: unknown): string => { params.push(value); return `:${params.length}`; };
    const numericFilter = (key: string, column: string): void => {
      if (typeof query[key] !== 'string' || query[key] === '') return;
      const value = Number(query[key]);
      if (!Number.isInteger(value) || value <= 0) throw new BadRequestException('Filtro no válido.');
      conditions.push(`${column} = ${bind(value)}`);
    };
    numericFilter('macroprocessId', 'V.MACROPROCESS_ID');
    numericFilter('processTypeId', 'V.PROCESS_TYPE_ID');
    if (typeof query.unitId === 'string' && query.unitId !== '') {
      const unitId = Number(query.unitId);
      if (!Number.isInteger(unitId) || unitId <= 0) throw new BadRequestException('Filtro no válido.');
      conditions.push(`EXISTS (SELECT 1 FROM ${table('PROCESS_UNIT')} PU WHERE PU.PROCESS_ID = P.ID AND PU.UNIT_ID = ${bind(unitId)})`);
    }
    if (typeof query.riskLevel === 'string' && query.riskLevel.trim() !== '') {
      conditions.push(`EXISTS (SELECT 1 FROM ${table('PROCESS_RISK')} PR WHERE PR.PROCESS_ID = P.ID AND PR.RISK_LEVEL = ${bind(query.riskLevel.trim())})`);
    }
    if (typeof query.q === 'string' && query.q.trim() !== '') {
      const term = foldText(query.q.slice(0, 100)).replace(/[\\%_]/g, (char) => `\\${char}`);
      const columns = ['P.CODE', 'V.NAME', 'V.ALIAS', 'V.RESPONSIBLE', 'DBMS_LOB.SUBSTR(V.DESCRIPTION, 2000, 1)'];
      conditions.push(`(${columns.map((column) => `${fold(column)} LIKE ${bind(`%${term}%`)} ESCAPE '\\'`).join(' OR ')})`);
    }
    const rows: Row[] = await this.dataSource.query(`
      SELECT * FROM (
        SELECT P.ID AS "id", P.CODE AS "code", V.NAME AS "name", V.ALIAS AS "alias", V.STATUS AS "status",
               V.RESPONSIBLE AS "responsible", MT.NAME AS "macroprocessType", M.NAME AS "macroprocess", PT.NAME AS "processType",
               (SELECT U.NAME FROM ${table('PROCESS_UNIT')} PU JOIN ${table('ORGANIZATIONAL_UNIT')} U ON U.ID = PU.UNIT_ID
                 WHERE PU.PROCESS_ID = P.ID AND PU.ROLE = 'RESPONSABLE') AS "responsibleUnit",
               (SELECT PR.RISK_LEVEL FROM ${table('PROCESS_RISK')} PR WHERE PR.PROCESS_ID = P.ID AND ROWNUM = 1) AS "riskLevel"
        FROM ${table('PROCESS')} P
        JOIN ${table('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID
        JOIN ${table('MACROPROCESS')} M ON M.ID = V.MACROPROCESS_ID
        JOIN ${table('MACROPROCESS_TYPE')} MT ON MT.ID = M.MACROPROCESS_TYPE_ID
        JOIN ${table('PROCESS_TYPE')} PT ON PT.ID = V.PROCESS_TYPE_ID
        WHERE ${conditions.join(' AND ')}
        ORDER BY TO_NUMBER(SUBSTR(P.CODE, 3))
      ) WHERE ROWNUM <= 300
    `, params);
    return rows.map((row) => ({ ...row, id: Number(row.id) }));
  }

  async processDetail(id: number): Promise<unknown> {
    const fichaColumns = FICHA_FIELDS.map(([key, column]) => `V.${column} AS "${key}"`).join(', ');
    const processes: Row[] = await this.dataSource.query(`
      SELECT P.ID AS "id", P.CODE AS "code", V.STATUS AS "status", V.VERSION_NUMBER AS "versionNumber", V.REVISION AS "revision", ${fichaColumns},
             V.MACROPROCESS_ID AS "macroprocessId", V.PROCESS_TYPE_ID AS "processTypeId", V.PARENT_PROCESS_ID AS "parentProcessId",
             MT.NAME AS "macroprocessType", M.NAME AS "macroprocess", PT.NAME AS "processType"
      FROM ${table('PROCESS')} P
      JOIN ${table('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID
      JOIN ${table('MACROPROCESS')} M ON M.ID = V.MACROPROCESS_ID
      JOIN ${table('MACROPROCESS_TYPE')} MT ON MT.ID = M.MACROPROCESS_TYPE_ID
      JOIN ${table('PROCESS_TYPE')} PT ON PT.ID = V.PROCESS_TYPE_ID
      WHERE P.ID = :1 AND P.IS_ACTIVE = 1
    `, [id]);
    if (processes.length !== 1) throw new NotFoundException('Proceso no encontrado.');
    const process = processes[0];
    const risks: Row[] = await this.dataSource.query(`
      SELECT ID AS "id", DESCRIPTION AS "description", CAUSE AS "cause", CONSEQUENCE AS "consequence",
             RISK_TYPE AS "type", RISK_LEVEL AS "level"
      FROM ${table('PROCESS_RISK')} WHERE PROCESS_ID = :1 ORDER BY ID
    `, [id]);
    const units: Row[] = await this.dataSource.query(`
      SELECT U.ID AS "unitId", U.NAME AS "name", U.IS_ACTIVE AS "isActive", PU.ROLE AS "role", PU.PARTICIPANT_FUNCTION AS "function"
      FROM ${table('PROCESS_UNIT')} PU JOIN ${table('ORGANIZATIONAL_UNIT')} U ON U.ID = PU.UNIT_ID
      WHERE PU.PROCESS_ID = :1 ORDER BY PU.ROLE, U.NAME
    `, [id]);
    const relationSelect = (side: 'ORIGIN' | 'DESTINATION', other: 'ORIGIN' | 'DESTINATION') => `
      SELECT R.ID AS "id", R.${other}_PROCESS_ID AS "processId", P2.CODE AS "code", V2.NAME AS "name",
             R.RELATION_TYPE AS "type", R.DESCRIPTION AS "description"
      FROM ${table('PROCESS_RELATION')} R
      JOIN ${table('PROCESS')} P2 ON P2.ID = R.${other}_PROCESS_ID
      LEFT JOIN ${table('PROCESS_VERSION')} V2 ON V2.ID = P2.CURRENT_VERSION_ID
      WHERE R.${side}_PROCESS_ID = :1 ORDER BY R.ID`;
    const outgoing: Row[] = await this.dataSource.query(relationSelect('ORIGIN', 'DESTINATION'), [id]);
    const incoming: Row[] = await this.dataSource.query(relationSelect('DESTINATION', 'ORIGIN'), [id]);
    const parent: Row[] = process.parentProcessId === null ? [] : await this.dataSource.query(`
      SELECT P.ID AS "id", P.CODE AS "code", V.NAME AS "name" FROM ${table('PROCESS')} P
      JOIN ${table('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID WHERE P.ID = :1`, [Number(process.parentProcessId)]);
    const subprocesses: Row[] = await this.dataSource.query(`
      SELECT P.ID AS "id", P.CODE AS "code", V.NAME AS "name" FROM ${table('PROCESS')} P
      JOIN ${table('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID
      WHERE V.PARENT_PROCESS_ID = :1 AND P.IS_ACTIVE = 1 ORDER BY TO_NUMBER(SUBSTR(P.CODE, 3))`, [id]);
    const versionRows: Row[] = await this.dataSource.query(`
      SELECT ID AS "id", VERSION_NUMBER AS "versionNumber", STATUS AS "status", REVISION AS "revision"
      FROM ${table('PROCESS_VERSION')} WHERE PROCESS_ID = :1 ORDER BY VERSION_NUMBER DESC
    `, [id]);

    const normalizedUnits = units.map((unit) => ({ ...unit, unitId: Number(unit.unitId), isActive: bool(unit.isActive) }));
    const normalizedRisks = risks.map((risk) => ({ ...risk, id: Number(risk.id) }));
    const missing = this.missingFields(process, normalizedUnits);
    const possibleDuplicates = await this.possibleDuplicates(process);
    const toId = (row: Row) => ({ ...row, id: Number(row.id), processId: Number(row.processId) });
    return {
      ...process,
      id: Number(process.id),
      macroprocessId: Number(process.macroprocessId),
      processTypeId: Number(process.processTypeId),
      parentProcessId: process.parentProcessId === null ? null : Number(process.parentProcessId),
      risks: normalizedRisks,
      units: normalizedUnits,
      parent: parent.length === 1 ? { ...parent[0], id: Number(parent[0].id) } : null,
      subprocesses: subprocesses.map((row) => ({ ...row, id: Number(row.id) })),
      relations: { outgoing: outgoing.map(toId), incoming: incoming.map(toId) },
      completeness: { complete: missing.length === 0, missing },
      possibleDuplicates,
      versionNumber: Number(process.versionNumber || 1),
      revision: Number(process.revision || 1),
      versions: versionRows.map((v) => ({
        id: Number(v.id),
        versionNumber: Number(v.versionNumber),
        status: String(v.status),
        revision: Number(v.revision)
      }))
    };
  }

  createProcess(raw: unknown): Promise<unknown> {
    const body = asBody(raw);
    rejectUnknownKeys(body, PROCESS_KEYS);
    const macroprocessId = requiredId(body, 'macroprocessId', 'Macroproceso');
    const processTypeId = requiredId(body, 'processTypeId', 'Tipo de proceso');
    const fields = this.readFichaFields(body);
    if (fields.name === undefined || fields.name === null) throw new BadRequestException('Nombre es obligatorio.');
    const parentProcessId = optionalId(body, 'parentProcessId', 'Proceso padre') ?? null;
    const units = this.readUnits(body);
    const risks = Array.isArray(body.risks) ? body.risks.map((risk) => this.readRisk(asBody(risk))) : [];
    if (body.risks !== undefined && !Array.isArray(body.risks)) throw new BadRequestException('Los riesgos deben enviarse como lista.');
    return this.run(() => this.dataSource.transaction(async (manager) => {
      await this.assertClassification(manager, macroprocessId, processTypeId);
      if (parentProcessId !== null) await this.assertProcessExists(manager, parentProcessId, 'El proceso padre');
      const sequence: Row[] = await manager.query(`SELECT ${table('PROCESS_CODE_SEQ')}.NEXTVAL AS "n" FROM DUAL`);
      const code = `PR${Number(sequence[0].n)}`;
      await manager.query(`INSERT INTO ${table('PROCESS')} (CODE, IS_ACTIVE) VALUES (:1, 1)`, [code]);
      const created: Row[] = await manager.query(`SELECT ID AS "id" FROM ${table('PROCESS')} WHERE CODE = :1`, [code]);
      const processId = Number(created[0].id);
      const provided = FICHA_FIELDS.filter(([key]) => fields[key] !== undefined);
      const columns = ['PROCESS_ID', 'VERSION_NUMBER', 'STATUS', 'MACROPROCESS_ID', 'PROCESS_TYPE_ID', 'PARENT_PROCESS_ID', 'REVISION',
        ...provided.map(([, column]) => column)];
      const values: unknown[] = [processId, 1, 'Borrador', macroprocessId, processTypeId, parentProcessId, 1, ...provided.map(([key]) => fields[key])];
      await manager.query(
        `INSERT INTO ${table('PROCESS_VERSION')} (${columns.join(', ')}) VALUES (${values.map((_, index) => `:${index + 1}`).join(', ')})`,
        values
      );
      const versions: Row[] = await manager.query(`SELECT ID AS "id" FROM ${table('PROCESS_VERSION')} WHERE PROCESS_ID = :1`, [processId]);
      await manager.query(`UPDATE ${table('PROCESS')} SET CURRENT_VERSION_ID = :1 WHERE ID = :2`, [Number(versions[0].id), processId]);
      await this.replaceUnits(manager, processId, units.responsibleUnitId, units.participants);
      for (const risk of risks) await this.insertRisk(manager, processId, risk);
      return { id: processId, code };
    }));
  }

  updateProcess(id: number, raw: unknown): Promise<unknown> {
    const body = asBody(raw);
    rejectUnknownKeys(body, PROCESS_KEYS.filter((key) => key !== 'risks'));
    const fields = this.readFichaFields(body);
    if (fields.name === null) throw new BadRequestException('Nombre es obligatorio.');
    const macroprocessId = optionalId(body, 'macroprocessId', 'Macroproceso');
    const processTypeId = optionalId(body, 'processTypeId', 'Tipo de proceso');
    if (macroprocessId === null || processTypeId === null) throw new BadRequestException('La clasificación es obligatoria.');
    const parentProcessId = optionalId(body, 'parentProcessId', 'Proceso padre');
    const units = this.readUnits(body);
    return this.run(() => this.dataSource.transaction(async (manager) => {
      const current: Row[] = await manager.query(`
        SELECT P.CURRENT_VERSION_ID AS "versionId", V.MACROPROCESS_ID AS "macroprocessId", V.PROCESS_TYPE_ID AS "processTypeId"
        FROM ${table('PROCESS')} P JOIN ${table('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID
        WHERE P.ID = :1 AND P.IS_ACTIVE = 1`, [id]);
      if (current.length !== 1) throw new NotFoundException('Proceso no encontrado.');
      const finalMacro = macroprocessId ?? Number(current[0].macroprocessId);
      const finalType = processTypeId ?? Number(current[0].processTypeId);
      if (finalMacro !== Number(current[0].macroprocessId) || finalType !== Number(current[0].processTypeId)) {
        await this.assertClassification(manager, finalMacro, finalType);
      }
      const sets: string[] = ['REVISION = REVISION + 1'];
      const values: unknown[] = [];
      const add = (column: string, value: unknown): void => { values.push(value); sets.push(`${column} = :${values.length}`); };
      if (finalMacro !== Number(current[0].macroprocessId) || finalType !== Number(current[0].processTypeId)) {
        add('MACROPROCESS_ID', finalMacro);
        add('PROCESS_TYPE_ID', finalType);
      }
      if (parentProcessId !== undefined) {
        if (parentProcessId === id) throw new BadRequestException('Un proceso no puede ser su propio padre.');
        if (parentProcessId !== null) await this.assertProcessExists(manager, parentProcessId, 'El proceso padre');
        add('PARENT_PROCESS_ID', parentProcessId);
      }
      for (const [key, column] of FICHA_FIELDS) if (fields[key] !== undefined) add(column, fields[key]);
      values.push(Number(current[0].versionId));
      await manager.query(`UPDATE ${table('PROCESS_VERSION')} SET ${sets.join(', ')} WHERE ID = :${values.length}`, values);
      await this.replaceUnits(manager, id, units.responsibleUnitId, units.participants);
      return { id };
    }));
  }

  // ---------- Riesgos (REQ-10, 11) ----------

  addRisk(processId: number, raw: unknown): Promise<unknown> {
    const risk = this.readRisk(asBody(raw));
    return this.run(() => this.dataSource.transaction(async (manager) => {
      await this.assertProcessExists(manager, processId, 'El proceso');
      await this.insertRisk(manager, processId, risk);
      const rows: Row[] = await manager.query(`SELECT MAX(ID) AS "id" FROM ${table('PROCESS_RISK')} WHERE PROCESS_ID = :1`, [processId]);
      return { id: Number(rows[0].id) };
    }));
  }

  updateRisk(processId: number, riskId: number, raw: unknown): Promise<unknown> {
    const risk = this.readRisk(asBody(raw));
    return this.run(async () => {
      const exists: Row[] = await this.dataSource.query(`SELECT ID FROM ${table('PROCESS_RISK')} WHERE ID = :1 AND PROCESS_ID = :2`, [riskId, processId]);
      if (exists.length !== 1) throw new NotFoundException('Riesgo no encontrado.');
      await this.dataSource.query(
        `UPDATE ${table('PROCESS_RISK')} SET DESCRIPTION = :1, CAUSE = :2, CONSEQUENCE = :3, RISK_TYPE = :4, RISK_LEVEL = :5 WHERE ID = :6`,
        [risk.description, risk.cause, risk.consequence, risk.type, risk.level, riskId]
      );
      return { id: riskId };
    });
  }

  deleteRisk(processId: number, riskId: number): Promise<void> {
    return this.run(async () => {
      const exists: Row[] = await this.dataSource.query(`SELECT ID FROM ${table('PROCESS_RISK')} WHERE ID = :1 AND PROCESS_ID = :2`, [riskId, processId]);
      if (exists.length !== 1) throw new NotFoundException('Riesgo no encontrado.');
      await this.dataSource.query(`DELETE FROM ${table('PROCESS_RISK')} WHERE ID = :1`, [riskId]);
    });
  }

  // ---------- Relaciones (REQ-14, 15) ----------

  addRelation(originId: number, raw: unknown): Promise<unknown> {
    const body = asBody(raw);
    rejectUnknownKeys(body, ['destinationProcessId', 'type', 'description']);
    const destinationId = requiredId(body, 'destinationProcessId', 'Proceso destino');
    const type = oneOf(body.type, RELATION_TYPES, 'El tipo de relación');
    const description = requiredText(body, 'description', 'Descripción', 4000);
    if (destinationId === originId) throw new BadRequestException('No se puede relacionar un proceso consigo mismo.');
    return this.run(() => this.dataSource.transaction(async (manager) => {
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
    return this.run(() => this.dataSource.transaction(async (manager) => {
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
    return this.run(async () => {
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

  // ---------- Utilidades privadas ----------

  private readFichaFields(body: Body): Record<string, string | null | undefined> {
    const fields: Record<string, string | null | undefined> = {};
    for (const [key, , max, label] of FICHA_FIELDS) fields[key] = optionalText(body, key, label, max);
    return fields;
  }

  private readUnits(body: Body): { responsibleUnitId: number | null | undefined; participants: Array<{ unitId: number; unitFunction: string }> | undefined } {
    const responsibleUnitId = optionalId(body, 'responsibleUnitId', 'Unidad responsable');
    if (body.participants === undefined) return { responsibleUnitId, participants: undefined };
    if (!Array.isArray(body.participants)) throw new BadRequestException('Las unidades participantes deben enviarse como lista.');
    const participants = body.participants.map((item) => {
      const entry = asBody(item);
      rejectUnknownKeys(entry, ['unitId', 'function']);
      return { unitId: asId(entry.unitId, 'Unidad participante'), unitFunction: requiredText(entry, 'function', 'La función de la unidad participante', 500) };
    });
    return { responsibleUnitId, participants };
  }

  private readRisk(body: Body): { description: string; cause: string; consequence: string; type: string; level: string } {
    rejectUnknownKeys(body, ['description', 'cause', 'consequence', 'type', 'level']);
    if (body.level === undefined || body.level === null || body.level === '') throw new BadRequestException('El nivel de riesgo es obligatorio.');
    return {
      description: requiredText(body, 'description', 'Descripción del riesgo', 4000),
      cause: requiredText(body, 'cause', 'Causa', 4000),
      consequence: requiredText(body, 'consequence', 'Consecuencia', 4000),
      type: requiredText(body, 'type', 'Tipo de riesgo', 120),
      level: oneOf(body.level, RISK_LEVELS, 'El nivel de riesgo')
    };
  }

  private async insertRisk(manager: EntityManager, processId: number, risk: { description: string; cause: string; consequence: string; type: string; level: string }): Promise<void> {
    await manager.query(
      `INSERT INTO ${table('PROCESS_RISK')} (PROCESS_ID, DESCRIPTION, CAUSE, CONSEQUENCE, RISK_TYPE, RISK_LEVEL) VALUES (:1, :2, :3, :4, :5, :6)`,
      [processId, risk.description, risk.cause, risk.consequence, risk.type, risk.level]
    );
  }

  private async assertClassification(manager: EntityManager, macroprocessId: number, processTypeId: number): Promise<void> {
    const rows: Row[] = await manager.query(`
      SELECT PT.IS_ACTIVE AS "typeActive", M.IS_ACTIVE AS "macroActive"
      FROM ${table('PROCESS_TYPE')} PT JOIN ${table('MACROPROCESS')} M ON M.ID = PT.MACROPROCESS_ID
      WHERE PT.ID = :1 AND PT.MACROPROCESS_ID = :2`, [processTypeId, macroprocessId]);
    if (rows.length !== 1) throw new BadRequestException('El tipo de proceso no pertenece al macroproceso seleccionado.');
    if (!bool(rows[0].typeActive) || !bool(rows[0].macroActive)) throw new BadRequestException('El tipo de proceso o el macroproceso está inactivo.');
  }

  private async assertProcessExists(manager: EntityManager, processId: number, label: string): Promise<void> {
    const rows: Row[] = await manager.query(`SELECT ID FROM ${table('PROCESS')} WHERE ID = :1 AND IS_ACTIVE = 1`, [processId]);
    if (rows.length !== 1) throw new BadRequestException(`${label} no existe.`);
  }

  private async replaceUnits(
    manager: EntityManager, processId: number,
    responsibleUnitId: number | null | undefined, participants: Array<{ unitId: number; unitFunction: string }> | undefined
  ): Promise<void> {
    if (responsibleUnitId === undefined && participants === undefined) return;
    const existing: Array<{ unitId: number; role: string; unitFunction: string | null }> = (await manager.query(
      `SELECT UNIT_ID AS "unitId", ROLE AS "role", PARTICIPANT_FUNCTION AS "unitFunction" FROM ${table('PROCESS_UNIT')} WHERE PROCESS_ID = :1`, [processId]
    )).map((row: Row) => ({ unitId: Number(row.unitId), role: String(row.role), unitFunction: row.unitFunction as string | null }));
    const responsible = responsibleUnitId !== undefined ? responsibleUnitId : (existing.find((unit) => unit.role === 'RESPONSABLE')?.unitId ?? null);
    const finalParticipants = participants ?? existing.filter((unit) => unit.role === 'PARTICIPANTE')
      .map((unit) => ({ unitId: unit.unitId, unitFunction: unit.unitFunction ?? '' }));
    const ids = [...(responsible === null ? [] : [responsible]), ...finalParticipants.map((unit) => unit.unitId)];
    if (new Set(ids).size !== ids.length) throw new BadRequestException('No se puede asociar dos veces la misma unidad a un proceso.');
    const already = new Set(existing.map((unit) => unit.unitId));
    for (const unitId of ids.filter((value) => !already.has(value))) await this.assertActiveUnit(manager, unitId, 'La unidad');
    await manager.query(`DELETE FROM ${table('PROCESS_UNIT')} WHERE PROCESS_ID = :1`, [processId]);
    const associations: UnitAssociation[] = [
      ...(responsible === null ? [] : [{ unitId: responsible, role: 'RESPONSABLE' as const, unitFunction: null }]),
      ...finalParticipants.map((unit) => ({ unitId: unit.unitId, role: 'PARTICIPANTE' as const, unitFunction: unit.unitFunction }))
    ];
    for (const association of associations) {
      await manager.query(
        `INSERT INTO ${table('PROCESS_UNIT')} (PROCESS_ID, UNIT_ID, ROLE, PARTICIPANT_FUNCTION) VALUES (:1, :2, :3, :4)`,
        [processId, association.unitId, association.role, association.unitFunction]
      );
    }
  }

  // ---------- Ciclo de vida y validación (REQ-07, REQ-09, REQ-56) ----------

  async submitProcess(id: number, actor?: AuthenticatedUser): Promise<{ id: number; status: string }> {
    return this.run(() => this.dataSource.transaction(async (manager) => {
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

      const detail = (await this.processDetail(id)) as { completeness: { complete: boolean; missing: string[] } };
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
    return this.run(() => this.dataSource.transaction(async (manager) => {
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
    return this.run(() => this.dataSource.transaction(async (manager) => {
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
    return this.run(() => this.dataSource.transaction(async (manager) => {
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
    return this.run(() => this.dataSource.transaction(async (manager) => {
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

  private missingFields(process: Row, units: Row[]): string[] {
    const required: Array<[string, string]> = [
      ['elaborator', 'Elaborador'], ['name', 'Nombre'], ['description', 'Descripción'], ['objective', 'Objetivo'],
      ['scope', 'Alcance'], ['startsWhen', 'Cuándo inicia'], ['endsWhen', 'Cuándo termina'],
      ['responsible', 'Responsable (persona o cargo)'], ['inputs', 'Entradas'], ['outputs', 'Salidas']
    ];
    const missing = required.filter(([key]) => process[key] === null || process[key] === undefined || String(process[key]).trim() === '').map(([, label]) => label);
    if (!units.some((unit) => unit.role === 'RESPONSABLE' && unit.isActive)) missing.push('Unidad responsable activa');
    return missing;
  }

  private async possibleDuplicates(process: Row): Promise<unknown[]> {
    const names = [process.name, process.alias].filter((value): value is string => typeof value === 'string' && value.trim() !== '').map(foldText);
    if (names.length === 0) return [];
    const rows: Row[] = await this.dataSource.query(`
      SELECT P.ID AS "id", P.CODE AS "code", V.NAME AS "name" FROM ${table('PROCESS')} P
      JOIN ${table('PROCESS_VERSION')} V ON V.ID = P.CURRENT_VERSION_ID
      WHERE P.IS_ACTIVE = 1 AND P.ID <> :1 AND V.MACROPROCESS_ID = :2 AND V.PROCESS_TYPE_ID = :3
        AND (${fold('V.NAME')} IN (${names.map((_, index) => `:${index + 4}`).join(', ')})
          OR ${fold('V.ALIAS')} IN (${names.map((_, index) => `:${index + 4 + names.length}`).join(', ')}))
    `, [Number(process.id), Number(process.macroprocessId), Number(process.processTypeId), ...names, ...names]);
    return rows.map((row) => ({ ...row, id: Number(row.id) }));
  }

  /** Traduce errores del modelo a respuestas de negocio sin exponer detalles internos (PT-10). */
  private async run<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : '';
      if (message.includes('ORA-00001')) throw new ConflictException('Ya existe un registro con esos datos.');
      if (/ORA-0229[012]/.test(message)) throw new BadRequestException('Los datos no cumplen las reglas de integridad del modelo.');
      throw error;
    }
  }
}
