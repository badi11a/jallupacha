import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ProfileCode } from './auth.service';

export interface UserItem {
  id: number;
  displayName: string;
  email: string;
  isActive: number;
  profiles: string | null;
}

export interface ProfileDefinition {
  code: ProfileCode;
  name: string;
  description: string;
}

export const SYSTEM_PROFILES: ReadonlyArray<ProfileDefinition> = [
  { code: 'ADMIN', name: 'Administrador', description: 'Gestión integral de configuración, usuarios y perfiles.' },
  { code: 'PROCESS_OWNER', name: 'Dueño de proceso', description: 'Elaboración y edición de fichas de proceso.' },
  { code: 'VALIDATOR', name: 'Revisor / Validador', description: 'Revisión técnica y aprobación o rechazo de procesos.' },
  { code: 'RISK_MANAGER', name: 'Gestor de riesgos', description: 'Identificación y mantenimiento de riesgos asociados.' },
  { code: 'CONSULTATION', name: 'Consulta', description: 'Visualización y consulta íntegra de mapa y fichas vigentes.' }
];

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/users';

  list(): Observable<UserItem[]> {
    return this.http.get<UserItem[]>(this.base, { withCredentials: true });
  }

  updateProfiles(id: number, profiles: ProfileCode[]): Observable<{ userId: number; profiles: ProfileCode[] }> {
    return this.http.put<{ userId: number; profiles: ProfileCode[] }>(`${this.base}/${id}/profiles`, { profiles }, { withCredentials: true });
  }
}
