import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ProcessMap, ProcessListItem, ProcessDetail, ProcessInput, RiskInput, RelationInput, ProcessTypeItem, UnitItem } from './process.models';
export * from './process.models';
export { errorMessage } from '../../core/platform';

@Injectable({ providedIn: 'root' })
export class ProcessApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/management';

  map(): Observable<ProcessMap> { return this.http.get<ProcessMap>(`${this.base}/map`); }
  listProcesses(filters: Record<string, string>): Observable<ProcessListItem[]> {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
    return this.http.get<ProcessListItem[]>(`${this.base}/processes`, { params });
  }
  process(id: number): Observable<ProcessDetail> { return this.http.get<ProcessDetail>(`${this.base}/processes/${id}`); }
  createProcess(body: ProcessInput): Observable<{ id: number; code: string }> { return this.http.post<{ id: number; code: string }>(`${this.base}/processes`, body); }
  updateProcess(id: number, body: ProcessInput): Observable<unknown> { return this.http.patch(`${this.base}/processes/${id}`, body); }
  submitProcess(id: number): Observable<{ id: number; status: string }> { return this.http.post<{ id: number; status: string }>(`${this.base}/processes/${id}/submit`, {}); }
  approveProcess(id: number): Observable<{ id: number; status: string }> { return this.http.post<{ id: number; status: string }>(`${this.base}/processes/${id}/approve`, {}); }
  rejectProcess(id: number, reason: string): Observable<{ id: number; status: string; reason: string }> { return this.http.post<{ id: number; status: string; reason: string }>(`${this.base}/processes/${id}/reject`, { reason }); }
  newVersion(id: number): Observable<{ id: number; status: string; versionNumber: number }> { return this.http.post<{ id: number; status: string; versionNumber: number }>(`${this.base}/processes/${id}/new-version`, {}); }
  retireProcess(id: number): Observable<{ id: number; status: string }> { return this.http.post<{ id: number; status: string }>(`${this.base}/processes/${id}/retire`, {}); }

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
