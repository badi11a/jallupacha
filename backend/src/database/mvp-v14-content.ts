import { readFileSync } from 'fs';
import { join } from 'path';

export const MVP_V14_MACROPROCESS_TYPES = [
  { code: 'ESTRATEGICOS', name: 'Estratégicos', sortOrder: 1 },
  { code: 'MISIONALES', name: 'Misionales', sortOrder: 2 },
  { code: 'APOYO', name: 'De apoyo', sortOrder: 3 }
] as const;

export interface MvpV14RiskContent {
  description: string;
  cause: string;
  consequence: string;
  type: string;
  level: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
}

export interface MvpV14ProcessContent {
  code: string;
  type: string;
  name: string;
  description: string;
  objective: string;
  scope: string;
  responsibleUnit: string;
  participantUnits: string[];
  risk: MvpV14RiskContent;
}

export interface MvpV14MacroprocessContent {
  typeCode: (typeof MVP_V14_MACROPROCESS_TYPES)[number]['code'];
  name: string;
  processes: MvpV14ProcessContent[];
}

interface LegacyMacroprocessContent {
  name: string;
  processes: MvpV14ProcessContent[];
}

interface LegacyContentPackage {
  schemaVersion: number;
  macroprocesses: LegacyMacroprocessContent[];
}

const TYPE_CODE_BY_MACROPROCESS_NAME: Record<string, MvpV14MacroprocessContent['typeCode']> = {
  'Estratégicos': 'ESTRATEGICOS',
  'Misionales': 'MISIONALES',
  'De apoyo': 'APOYO'
};

export function loadMvpV14Content(): MvpV14MacroprocessContent[] {
  const value = JSON.parse(readFileSync(join(__dirname, 'generic-content.json'), 'utf8')) as unknown;
  if (!isLegacyContentPackage(value)) {
    throw new Error('generic-content.json does not match the supported MVP v14 demonstration content.');
  }

  const macroprocesses = value.macroprocesses.map((macroprocess) => {
    const typeCode = TYPE_CODE_BY_MACROPROCESS_NAME[macroprocess.name];
    if (!typeCode) {
      throw new Error(`MVP v14 has no macroprocess type mapping for: ${macroprocess.name}`);
    }
    for (const process of macroprocess.processes) {
      if (!['Bajo', 'Medio', 'Alto', 'Crítico'].includes(process.risk.level)) {
        throw new Error(`Unsupported MVP v14 risk level in ${process.name}: ${process.risk.level}`);
      }
    }
    return { typeCode, name: macroprocess.name, processes: macroprocess.processes };
  });

  if (macroprocesses.length !== MVP_V14_MACROPROCESS_TYPES.length ||
    new Set(macroprocesses.map((macroprocess) => macroprocess.typeCode)).size !== MVP_V14_MACROPROCESS_TYPES.length) {
    throw new Error('MVP v14 demonstration content must contain exactly one macroprocess for each fixed type.');
  }

  const numbers = macroprocesses.flatMap((macroprocess) => macroprocess.processes)
    .map((process) => Number(process.code.slice(2))).sort((a, b) => a - b);
  if (numbers.some((number, index) => number !== index + 1)) {
    throw new Error('MVP v14 demonstration process codes must be unique and contiguous from PR1.');
  }
  return macroprocesses;
}

function isLegacyContentPackage(value: unknown): value is LegacyContentPackage {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.macroprocesses)) return false;
  return value.macroprocesses.every((macroprocess) =>
    isRecord(macroprocess) && isNonEmptyString(macroprocess.name) && Array.isArray(macroprocess.processes) &&
    macroprocess.processes.every((process) =>
      isRecord(process) && isNonEmptyString(process.code) && /^PR[1-9][0-9]*$/.test(process.code) &&
      isNonEmptyString(process.type) && isNonEmptyString(process.name) &&
      isNonEmptyString(process.description) && isNonEmptyString(process.objective) &&
      isNonEmptyString(process.scope) && isNonEmptyString(process.responsibleUnit) &&
      Array.isArray(process.participantUnits) && process.participantUnits.every(isNonEmptyString) &&
      isRecord(process.risk) &&
      isNonEmptyString(process.risk.description) && isNonEmptyString(process.risk.cause) &&
      isNonEmptyString(process.risk.consequence) && isNonEmptyString(process.risk.type) &&
      isNonEmptyString(process.risk.level)
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
