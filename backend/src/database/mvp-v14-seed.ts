import { EntityManager } from 'typeorm';
import { loadMvpV14Content, MVP_V14_MACROPROCESS_TYPES } from './mvp-v14-content';
import { requiredOracleIdentifier } from './mvp-v14-schema';

interface IdRow {
  id: number | string;
}

export async function seedMvpV14(manager: EntityManager): Promise<void> {
  const schema = requiredOracleIdentifier('ORACLE_SCHEMA');
  const table = (name: string) => `"${schema}"."${name}"`;
  const macroprocesses = loadMvpV14Content();
  const typeIds = new Map<string, number>();
  const macroprocessIds = new Map<string, number>();
  const processTypeIds = new Map<string, number>();

  for (const macroprocessType of MVP_V14_MACROPROCESS_TYPES) {
    await manager.query(
      `INSERT INTO ${table('MACROPROCESS_TYPE')} (CODE, NAME, SORT_ORDER, IS_ACTIVE) VALUES (:1, :2, :3, 1)`,
      [macroprocessType.code, macroprocessType.name, macroprocessType.sortOrder]
    );
    typeIds.set(macroprocessType.code, await idFor(manager, table('MACROPROCESS_TYPE'), 'CODE', macroprocessType.code));
  }

  for (let index = 0; index < macroprocesses.length; index += 1) {
    const macroprocess = macroprocesses[index];
    const macroprocessTypeId = typeIds.get(macroprocess.typeCode);
    if (!macroprocessTypeId) throw new Error(`Missing seeded macroprocess type: ${macroprocess.typeCode}`);
    const code = `MP${index + 1}`;
    await manager.query(
      `INSERT INTO ${table('MACROPROCESS')} (MACROPROCESS_TYPE_ID, CODE, NAME, SORT_ORDER, IS_ACTIVE)
       VALUES (:1, :2, :3, :4, 1)`,
      [macroprocessTypeId, code, macroprocess.name, index + 1]
    );
    const macroprocessId = await idFor(manager, table('MACROPROCESS'), 'CODE', code);
    macroprocessIds.set(macroprocess.name, macroprocessId);

    for (const name of unique(macroprocess.processes.map((process) => process.type))) {
      await manager.query(
        `INSERT INTO ${table('PROCESS_TYPE')} (MACROPROCESS_ID, NAME, IS_ACTIVE) VALUES (:1, :2, 1)`,
        [macroprocessId, name]
      );
      processTypeIds.set(processTypeKey(macroprocess.name, name), await idForProcessType(manager, table('PROCESS_TYPE'), macroprocessId, name));
    }
  }

  const unitIds = new Map<string, number>();
  const unitNames = unique(macroprocesses.flatMap((macroprocess) => macroprocess.processes)
    .flatMap((process) => [process.responsibleUnit, ...process.participantUnits]));
  for (let index = 0; index < unitNames.length; index += 1) {
    const unitCode = `UNIDAD_${String(index + 1).padStart(2, '0')}`;
    await manager.query(
      `INSERT INTO ${table('ORGANIZATIONAL_UNIT')} (CODE, NAME, IS_ACTIVE) VALUES (:1, :2, 1)`,
      [unitCode, unitNames[index]]
    );
    unitIds.set(unitNames[index], await idFor(manager, table('ORGANIZATIONAL_UNIT'), 'CODE', unitCode));
  }

  // Los códigos PRn se consumen de la secuencia en orden numérico para que coincidan con el contenido.
  const ordered = macroprocesses
    .flatMap((macroprocess) => macroprocess.processes.map((processContent) => ({ macroprocess, processContent })))
    .sort((a, b) => Number(a.processContent.code.slice(2)) - Number(b.processContent.code.slice(2)));

  for (const { macroprocess, processContent } of ordered) {
    const macroprocessId = macroprocessIds.get(macroprocess.name);
    if (!macroprocessId) throw new Error(`Missing seeded macroprocess: ${macroprocess.name}`);
    {
      const processTypeId = processTypeIds.get(processTypeKey(macroprocess.name, processContent.type));
      if (!processTypeId) throw new Error(`Missing seeded process type: ${processContent.type}`);
      const sequenceRows: Array<{ codeNumber: number | string }> = await manager.query(
        `SELECT "${schema}"."PROCESS_CODE_SEQ".NEXTVAL AS "codeNumber" FROM DUAL`
      );
      const code = `PR${Number(sequenceRows[0].codeNumber)}`;
      if (code !== processContent.code) {
        throw new Error(`Process code sequence mismatch: expected ${processContent.code}, got ${code}`);
      }
      await manager.query(`INSERT INTO ${table('PROCESS')} (CODE, IS_ACTIVE) VALUES (:1, 1)`, [code]);
      const processId = await idFor(manager, table('PROCESS'), 'CODE', code);
      await manager.query(
        `INSERT INTO ${table('PROCESS_VERSION')} (
          PROCESS_ID, VERSION_NUMBER, STATUS, MACROPROCESS_ID, PROCESS_TYPE_ID, ELABORATOR, RESPONSIBLE,
          NAME, DESCRIPTION, OBJECTIVE, SCOPE, INPUTS, OUTPUTS, REVISION
        ) VALUES (:1, 1, 'Borrador', :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, 1)`,
        [
          processId, macroprocessId, processTypeId, 'Elaborador de demostración', 'Responsable de demostración',
          processContent.name, processContent.description, processContent.objective,
          processContent.scope, 'Información de entrada de demostración',
          'Resultado de demostración'
        ]
      );
      const versionId = await idForProcessVersion(manager, table('PROCESS_VERSION'), processId);
      await manager.query(`UPDATE ${table('PROCESS')} SET CURRENT_VERSION_ID = :1 WHERE ID = :2`, [versionId, processId]);
      const responsibleUnitId = unitIds.get(processContent.responsibleUnit);
      if (!responsibleUnitId) throw new Error(`Missing seeded unit: ${processContent.responsibleUnit}`);
      await manager.query(
        `INSERT INTO ${table('PROCESS_UNIT')} (PROCESS_ID, UNIT_ID, ROLE) VALUES (:1, :2, 'RESPONSABLE')`,
        [processId, responsibleUnitId]
      );
      for (const participant of unique(processContent.participantUnits)) {
        const participantId = unitIds.get(participant);
        if (!participantId) throw new Error(`Missing seeded unit: ${participant}`);
        if (participantId === responsibleUnitId) continue;
        await manager.query(
          `INSERT INTO ${table('PROCESS_UNIT')} (PROCESS_ID, UNIT_ID, ROLE, PARTICIPANT_FUNCTION)
           VALUES (:1, :2, 'PARTICIPANTE', 'Función de demostración por definir')`,
          [processId, participantId]
        );
      }
      await manager.query(
        `INSERT INTO ${table('PROCESS_RISK')} (PROCESS_ID, DESCRIPTION, CAUSE, CONSEQUENCE, RISK_TYPE, RISK_LEVEL)
         VALUES (:1, :2, :3, :4, :5, :6)`,
        [
          processId, processContent.risk.description, processContent.risk.cause,
          processContent.risk.consequence, processContent.risk.type, processContent.risk.level
        ]
      );
    }
  }
}

async function idFor(manager: EntityManager, table: string, field: string, value: string): Promise<number> {
  const rows: IdRow[] = await manager.query(`SELECT ID AS "id" FROM ${table} WHERE ${field} = :1`, [value]);
  if (rows.length !== 1) throw new Error(`Expected exactly one seeded ${field} value: ${value}`);
  return Number(rows[0].id);
}

async function idForProcessType(manager: EntityManager, table: string, macroprocessId: number, name: string): Promise<number> {
  const rows: IdRow[] = await manager.query(
    `SELECT ID AS "id" FROM ${table} WHERE MACROPROCESS_ID = :1 AND NAME = :2`, [macroprocessId, name]
  );
  if (rows.length !== 1) throw new Error(`Expected exactly one seeded process type: ${name}`);
  return Number(rows[0].id);
}

async function idForProcessVersion(manager: EntityManager, table: string, processId: number): Promise<number> {
  const rows: IdRow[] = await manager.query(`SELECT ID AS "id" FROM ${table} WHERE PROCESS_ID = :1`, [processId]);
  if (rows.length !== 1) throw new Error(`Expected exactly one version for process: ${processId}`);
  return Number(rows[0].id);
}

function processTypeKey(macroprocessName: string, processTypeName: string): string {
  return `${macroprocessName}\u0000${processTypeName}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
