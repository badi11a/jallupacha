import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface AuditItem {
  id: number;
  createdAt: string;
  actorUserId: number | null;
  actorDisplayName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeValue: string | null;
  afterValue: string | null;
}

export interface AuditResponse {
  items: AuditItem[];
  page: number;
  limit: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class AuditApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/audit';

  list(page = 1, limit = 50, entityType?: string, action?: string): Observable<AuditResponse> {
    const params: Record<string, string> = { page: String(page), limit: String(limit) };
    if (entityType && entityType.trim()) params['entityType'] = entityType.trim();
    if (action && action.trim()) params['action'] = action.trim();
    return this.http.get<AuditResponse>(this.base, { params, withCredentials: true });
  }
}
