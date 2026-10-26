import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { qualifiedTable as table } from '../common/database';
import { runDatabaseOperation } from '../common/database-operation';
import { asBody, asId, Body, foldText, oneOf, optionalId, optionalText, rejectUnknownKeys, requiredId, requiredText, RISK_LEVELS } from '../common/input-validation';
import { Row, fold, bool } from '../common/database-values';
import { FICHA_FIELDS, PROCESS_KEYS, UnitAssociation } from '../process/process-record.fields';

@Injectable()
export class ProcessRecordsService {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) { }

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
    return runDatabaseOperation(() => this.dataSource.transaction(async (manager) => {
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
    return runDatabaseOperation(() => this.dataSource.transaction(async (manager) => {
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

  private async assertActiveUnit(manager: EntityManager, unitId: number, label: string): Promise<void> {
    const rows: Row[] = await manager.query(`SELECT IS_ACTIVE AS "isActive" FROM ${table('ORGANIZATIONAL_UNIT')} WHERE ID = :1`, [unitId]);
    if (rows.length !== 1 || !bool(rows[0].isActive)) throw new BadRequestException(`${label} no existe o está inactiva.`);
  }
}
