import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

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
export interface MapMacroprocess { id: number; code: string; name: string; processTypes: MapProcessType[]; }
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
} & Record<FichaKey, string | null>;

export interface RiskInput { description: string; cause: string; consequence: string; type: string; level: string; }
export interface RelationInput { destinationProcessId?: number; type: string; description: string; }

export interface ProcessInput extends Partial<Record<FichaKey, string | null>> {
  macroprocessId: number; processTypeId: number; parentProcessId?: number | null;
  responsibleUnitId?: number | null; participants?: Array<{ unitId: number; function: string }>;
}

/** Mensaje de negocio devuelto por la API (sin detalles internos). */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const message = (error.error as { message?: string | string[] } | null)?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string') return message;
    if (error.status === 0) return 'No hay conexión con el servidor.';
  }
  return 'No se pudo completar la operación.';
}

@Injectable({ providedIn: 'root' })
export class MvpV14Api {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/mvp-v14';

  map(): Observable<ProcessMap> { return this.http.get<ProcessMap>(`${this.base}/map`); }
  listProcesses(filters: Record<string, string>): Observable<ProcessListItem[]> {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
    return this.http.get<ProcessListItem[]>(`${this.base}/processes`, { params });
  }
  process(id: number): Observable<ProcessDetail> { return this.http.get<ProcessDetail>(`${this.base}/processes/${id}`); }
  createProcess(body: ProcessInput): Observable<{ id: number; code: string }> { return this.http.post<{ id: number; code: string }>(`${this.base}/processes`, body); }
  updateProcess(id: number, body: ProcessInput): Observable<unknown> { return this.http.patch(`${this.base}/processes/${id}`, body); }

  addRisk(processId: number, body: RiskInput): Observable<unknown> { return this.http.post(`${this.base}/processes/${processId}/risks`, body); }
  updateRisk(processId: number, riskId: number, body: RiskInput): Observable<unknown> { return this.http.patch(`${this.base}/processes/${processId}/risks/${riskId}`, body); }
  deleteRisk(processId: number, riskId: number): Observable<unknown> { return this.http.delete(`${this.base}/processes/${processId}/risks/${riskId}`); }

  addRelation(processId: number, body: RelationInput): Observable<unknown> { return this.http.post(`${this.base}/processes/${processId}/relations`, body); }
  updateRelation(processId: number, relationId: number, body: RelationInput): Observable<unknown> { return this.http.patch(`${this.base}/processes/${processId}/relations/${relationId}`, body); }
  deleteRelation(processId: number, relationId: number): Observable<unknown> { return this.http.delete(`${this.base}/processes/${processId}/relations/${relationId}`); }

  processTypes(): Observable<ProcessTypeItem[]> { return this.http.get<ProcessTypeItem[]>(`${this.base}/process-types`); }
  createProcessType(body: { macroprocessId: number; name: string }): Observable<unknown> { return this.http.post(`${this.base}/process-types`, body); }
  updateProcessType(id: number, body: { macroprocessId: number; name: string }): Observable<unknown> { return this.http.patch(`${this.base}/process-types/${id}`, body); }
  deactivateProcessType(id: number): Observable<unknown> { return this.http.patch(`${this.base}/process-types/${id}/deactivate`, {}); }

  units(): Observable<UnitItem[]> { return this.http.get<UnitItem[]>(`${this.base}/units`); }
  createUnit(body: { name: string; parentUnitId: number | null }): Observable<unknown> { return this.http.post(`${this.base}/units`, body); }
  updateUnit(id: number, body: { name: string; parentUnitId: number | null }): Observable<unknown> { return this.http.patch(`${this.base}/units/${id}`, body); }
  deactivateUnit(id: number): Observable<unknown> { return this.http.patch(`${this.base}/units/${id}/deactivate`, {}); }
}
