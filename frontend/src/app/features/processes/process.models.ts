export const RISK_LEVELS = ['Bajo', 'Medio', 'Alto', 'Crítico'] as const;
export const RELATION_TYPES = [
  { value: 'FLUJO', label: 'Flujo' },
  { value: 'DEPENDENCIA', label: 'Dependencia' },
  { value: 'COORDINACION', label: 'Coordinación' }
] as const;

export interface ProcessListItem {
  id: number; code: string; name: string; alias: string | null; status: string; responsible: string | null;
  macroprocessType: string; macroprocess: string; processType: string; responsibleUnit: string | null;
  riskLevel?: string | null;
}
export interface ProcessTypeItem {
  id: number; name: string; isActive: boolean; macroprocessId: number; macroprocessCode: string;
  macroprocessName: string; macroprocessTypeName: string; processCount: number;
}
export interface UnitItem { id: number; code: string; name: string; parentUnitId: number | null; isActive: boolean; processCount: number; }
export interface ProcessUnit { unitId: number; name: string; isActive: boolean; role: 'RESPONSABLE' | 'PARTICIPANTE'; function: string | null; }
export interface RiskItem { id: number; description: string; cause: string; consequence: string; type: string; level: string; }
export interface RelationItem { id: number; processId: number; code: string; name: string | null; type: string; description: string; }
export interface ProcessRef { id: number; code: string; name: string; }
export interface MapProcess extends ProcessRef { status: string; }
export interface MapProcessType { id: number; name: string; processes: MapProcess[]; }
export interface MapMacroprocess { id: number; code: string; name: string; description?: string | null; processTypes: MapProcessType[]; }
export interface MapFamily { id: number; name: string; macroprocesses: MapMacroprocess[]; }
export interface ProcessMap { macroprocessTypes: MapFamily[]; }

export type FichaKey =
  | 'elaborator' | 'responsible' | 'name' | 'alias' | 'businessArea' | 'subprocessType' | 'criticality' | 'automationLevel'
  | 'periodicity' | 'description' | 'objective' | 'scope' | 'inputs' | 'outputs' | 'suppliers' | 'clients' | 'involvedParties'
  | 'documents' | 'systemsUsed' | 'indicators' | 'improvementOpportunities' | 'startsWhen' | 'endsWhen' | 'developmentPlan'
  | 'operation' | 'design' | 'validation' | 'bpmnModelReference';

/** Campos de la ficha (REQ-06). `long` indica texto largo. */
export const FICHA_FIELDS: ReadonlyArray<{ key: FichaKey; label: string; long: boolean; group: string }> = [
  { key: 'alias', label: 'Alias', long: false, group: 'Identificación' },
  { key: 'elaborator', label: 'Elaborador', long: false, group: 'Identificación' },
  { key: 'responsible', label: 'Responsable (persona o cargo)', long: false, group: 'Identificación' },
  { key: 'businessArea', label: 'Área de negocio', long: false, group: 'Identificación' },
  { key: 'subprocessType', label: 'Tipo de subproceso', long: false, group: 'Identificación' },
  { key: 'criticality', label: 'Criticidad', long: false, group: 'Identificación' },
  { key: 'automationLevel', label: 'Grado de automatización', long: false, group: 'Identificación' },
  { key: 'periodicity', label: 'Periodicidad', long: false, group: 'Identificación' },
  { key: 'description', label: 'Descripción', long: true, group: 'Descripción y propósito' },
  { key: 'objective', label: 'Objetivo', long: true, group: 'Descripción y propósito' },
  { key: 'scope', label: 'Alcance', long: true, group: 'Descripción y propósito' },
  { key: 'startsWhen', label: 'Cuándo inicia', long: true, group: 'Descripción y propósito' },
  { key: 'endsWhen', label: 'Cuándo termina', long: true, group: 'Descripción y propósito' },
  { key: 'inputs', label: 'Entradas', long: true, group: 'Contexto operativo' },
  { key: 'outputs', label: 'Salidas', long: true, group: 'Contexto operativo' },
  { key: 'suppliers', label: 'Proveedores', long: true, group: 'Contexto operativo' },
  { key: 'clients', label: 'Clientes', long: true, group: 'Contexto operativo' },
  { key: 'involvedParties', label: 'Involucrados', long: true, group: 'Contexto operativo' },
  { key: 'documents', label: 'Documentos', long: true, group: 'Contexto operativo' },
  { key: 'systemsUsed', label: 'Sistemas utilizados', long: true, group: 'Contexto operativo' },
  { key: 'indicators', label: 'Indicadores', long: true, group: 'Gestión y mejora' },
  { key: 'improvementOpportunities', label: 'Oportunidades de mejora', long: true, group: 'Gestión y mejora' },
  { key: 'developmentPlan', label: 'Plan de desarrollo', long: true, group: 'Gestión y mejora' },
  { key: 'operation', label: 'Operación del proceso', long: true, group: 'Gestión y mejora' },
  { key: 'design', label: 'Diseño del proceso', long: true, group: 'Gestión y mejora' },
  { key: 'validation', label: 'Validación del proceso', long: true, group: 'Gestión y mejora' },
  { key: 'bpmnModelReference', label: 'Modelo del proceso (BPMN)', long: true, group: 'Gestión y mejora' }
];

export type ProcessDetail = {
  id: number; code: string; status: string; name: string;
  macroprocessId: number; processTypeId: number; parentProcessId: number | null;
  macroprocessType: string; macroprocess: string; processType: string;
  risks: RiskItem[]; units: ProcessUnit[]; parent: ProcessRef | null; subprocesses: ProcessRef[];
  relations: { outgoing: RelationItem[]; incoming: RelationItem[] };
  completeness: { complete: boolean; missing: string[] };
  possibleDuplicates: ProcessRef[];
  versionNumber?: number;
  revision?: number;
  versions?: Array<{ id: number; versionNumber: number; status: string; revision: number }>;
} & Record<FichaKey, string | null>;

export interface RiskInput { description: string; cause: string; consequence: string; type: string; level: string; }
export interface RelationInput { destinationProcessId?: number; type: string; description: string; }

export interface ProcessInput extends Partial<Record<FichaKey, string | null>> {
  macroprocessId: number; processTypeId: number; parentProcessId?: number | null;
  responsibleUnitId?: number | null; participants?: Array<{ unitId: number; function: string }>;
}
