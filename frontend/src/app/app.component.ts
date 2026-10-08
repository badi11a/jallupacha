import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { Router, RouterOutlet } from '@angular/router';
import { UiAppShellComponent, UiDialogService, UiMessageComponent, UiPanelComponent } from './shared/ui';

interface DemoIdentity {
  id: number;
  displayName: string;
}

interface CurrentUser {
  userId: number;
  displayName: string;
  email: string;
  profiles: string[];
}

interface Macroprocess {
  id: number;
  code: string;
  name: string;
  description: string | null;
  order: number;
  isActive: number;
}

interface ProcessType {
  id: number;
  name: string;
  isActive: number;
}

interface AppUser {
  id: number;
  displayName: string;
  email: string;
  isActive: number;
  profiles: string;
}

interface AuditEntry {
  id: number;
  createdAt: string;
  actorUserId: number | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeValue: string | null;
  afterValue: string | null;
}

const PROFILE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  PROCESS_OWNER: 'Dueño de proceso',
  RISK_MANAGER: 'Gestor de riesgos',
  CONSULTATION: 'Consulta'
};
const PROFILE_CODES = Object.keys(PROFILE_LABELS);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterOutlet, UiAppShellComponent, UiMessageComponent, UiPanelComponent],
  template: `
    <ui-app-shell appName="Sistema de Procesos Institucionales" brandMark="J"
      footerText="Jallupacha · Gestión interna de procesos"
      [accountLabel]="user ? user.displayName + ' · ' + profileNames(user.profiles) : ''"
      [environmentNotice]="environment.demoMode && user ? 'Entorno local: acceso de prueba.' : ''"
      (logout)="logout()">
      @if (environment.demoMode && !user) {
        <section class="login-panel" aria-labelledby="login-title">
          <p class="eyebrow">ENTORNO LOCAL</p>
          <h1 id="login-title">Administración de procesos</h1>
          <p>Acceda con una identidad disponible para utilizar datos de prueba en el entorno local. Este acceso no sustituye la autenticación institucional.</p>
          @if (error) { <ui-message kind="error">{{ error }}</ui-message> }
          @if (identities.length) {
            <label for="identity">Usuario de prueba</label>
            <select id="identity" [(ngModel)]="selectedIdentityId">
              <option [ngValue]="null" disabled>Seleccione un usuario</option>
              @for (identity of identities; track identity.id) {
                <option [ngValue]="identity.id">{{ identity.displayName }}</option>
              }
            </select>
            <button class="primary-button" type="button" [disabled]="!selectedIdentityId || busy" (click)="login()">Ingresar</button>
          }
        </section>
      } @else if (!user) {
        <ui-message>El acceso institucional estará disponible cuando exista configuración autorizada.</ui-message>
      } @else {
        @if (error) { <ui-message kind="error">{{ error }}</ui-message> }
        @if (notice) { <ui-message kind="success">{{ notice }}</ui-message> }
        <section class="welcome">
          <p class="eyebrow">ADMINISTRACIÓN INTERNA</p>
          <h1>Hola, {{ user.displayName }}</h1>
          <p>Catálogos iniciales y perfiles para preparar la gestión de procesos.</p>
        </section>
        <router-outlet [routerOutletData]="{ userId: user.userId, profiles: user.profiles }" />
        <div class="catalog-grid">
          <ui-panel eyebrow="ESTRUCTURA" heading="Macroprocesos" headingId="macro-title">
            @if (isAdmin) {
              <form (ngSubmit)="createMacroprocess()" class="inline-form">
                <label for="macro-name">Nombre</label>
                <input id="macro-name" name="macroName" [(ngModel)]="macroName" maxlength="120" required>
                <label for="macro-order">Orden</label>
                <input id="macro-order" name="macroOrder" type="number" min="0" max="999999" [(ngModel)]="macroOrder" required>
                <button class="primary-button" [disabled]="busy">Agregar macroproceso</button>
              </form>
            }
            <ul class="catalog-list">
              @for (macro of macroprocesses; track macro.id) {
                <li>
                  <div><strong>{{ macro.name }}</strong><small>{{ macro.code }} · orden {{ macro.order }}</small></div>
                  @if (isAdmin && macro.isActive) {
                    <button class="text-button" type="button" (click)="editMacroprocess(macro)">Editar</button>
                    <button class="text-button" type="button" (click)="deactivateMacroprocess(macro)">Desactivar</button>
                  } @else if (!macro.isActive) { <span class="status">Inactivo</span> }
                </li>
              } @empty { <li>No hay macroprocesos cargados.</li> }
            </ul>
          </ui-panel>
          <ui-panel eyebrow="CLASIFICACIÓN" heading="Tipos de proceso" headingId="types-title">
            @if (isAdmin) {
              <form (ngSubmit)="createProcessType()" class="inline-form">
                <label for="type-name">Nombre</label>
                <input id="type-name" name="typeName" [(ngModel)]="processTypeName" maxlength="120" required>
                <button class="primary-button" [disabled]="busy">Agregar tipo</button>
              </form>
            }
            <ul class="catalog-list">
              @for (type of processTypes; track type.id) {
                <li>
                  <div><strong>{{ type.name }}</strong></div>
                  @if (isAdmin && type.isActive) {
                    <button class="text-button" type="button" (click)="editProcessType(type)">Editar</button>
                    <button class="text-button" type="button" (click)="deactivateProcessType(type)">Desactivar</button>
                  } @else if (!type.isActive) { <span class="status">Inactivo</span> }
                </li>
              } @empty { <li>Aún no hay tipos de proceso.</li> }
            </ul>
          </ui-panel>
        </div>

        @if (isAdmin) {
          <ui-panel class="admin-panel" eyebrow="ACCESO" heading="Perfiles de usuario" headingId="users-title">
            <p class="helper">Las asignaciones se validan en el servidor. No se permite modificar el propio perfil ni retirar el último Administrador.</p>
            @for (account of users; track account.id) {
              <div class="user-row">
                <div><strong>{{ account.displayName }}</strong><small>{{ account.email }} · ID {{ account.id }}</small></div>
                <fieldset>
                  <legend class="visually-hidden">Perfiles para {{ account.displayName }}</legend>
                  @for (profile of profileCodes; track profile) {
                    <label class="check-label"><input type="checkbox" [checked]="hasProfile(account, profile)" [disabled]="account.id === user.userId || busy" (change)="toggleProfile(account, profile, $event)"> {{ profileLabels[profile] }}</label>
                  }
                </fieldset>
              </div>
            }
          </ui-panel>
          <ui-panel class="admin-panel" eyebrow="TRAZABILIDAD" heading="Auditoría reciente" headingId="audit-title">
            <button panelActions class="text-button" type="button" (click)="loadAudit()">Actualizar</button>
            <div class="table-scroll">
              <table>
                <thead><tr><th>Fecha (UTC)</th><th>Actor ID</th><th>Acción</th><th>Elemento</th><th>Antes / después</th></tr></thead>
                <tbody>
                  @for (entry of auditEntries; track entry.id) {
                    <tr>
                      <td>{{ entry.createdAt | date:'yyyy-MM-dd HH:mm:ss':'UTC' }}</td>
                      <td>{{ entry.actorUserId ?? 'Sistema' }}</td>
                      <td>{{ entry.action }}</td><td>{{ entry.entityType }} · {{ entry.entityId }}</td>
                      <td><code>{{ entry.beforeValue || '—' }}</code><br><code>{{ entry.afterValue || '—' }}</code></td>
                    </tr>
                  } @empty { <tr><td colspan="5">No hay cambios auditados.</td></tr> }
                </tbody>
              </table>
            </div>
          </ui-panel>
        }
      }
    </ui-app-shell>
  `
})
export class AppComponent implements OnInit {
  readonly environment = environment;
  readonly profileLabels = PROFILE_LABELS;
  readonly profileCodes = PROFILE_CODES;
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly dialogs = inject(UiDialogService);
  private readonly router = inject(Router);
  identities: DemoIdentity[] = [];
  user: CurrentUser | null = null;
  macroprocesses: Macroprocess[] = [];
  processTypes: ProcessType[] = [];
  users: AppUser[] = [];
  auditEntries: AuditEntry[] = [];
  selectedIdentityId: number | null = null;
  macroName = '';
  macroOrder = 4;
  processTypeName = '';
  error = '';
  notice = '';
  busy = false;

  get isAdmin(): boolean {
    return this.user?.profiles.includes('ADMIN') ?? false;
  }

  async ngOnInit(): Promise<void> {
    try {
      this.user = await firstValueFrom(this.http.get<CurrentUser>('/api/auth/me'));
      await this.loadData();
    } catch (error: unknown) {
      if (this.isUnauthorized(error) && environment.demoMode) {
        try {
          this.identities = await firstValueFrom(this.http.get<DemoIdentity[]>('/api/auth/demo/identities'));
        } catch {
          this.error = 'No se pudo conectar con la API local. Verifique la configuración del backend y Oracle.';
        }
      } else if (!this.isUnauthorized(error)) {
        this.error = 'No se pudo cargar la información. Intente nuevamente.';
      }
    } finally {
      this.changeDetector.detectChanges();
    }
  }

  profileNames(profiles: string[]): string {
    return profiles.map((profile) => PROFILE_LABELS[profile] ?? profile).join(', ');
  }

  async login(): Promise<void> {
    if (!this.selectedIdentityId) return;
    await this.perform(async () => {
      await firstValueFrom(this.http.post('/api/auth/demo/session', { identityId: this.selectedIdentityId }));
      this.user = await firstValueFrom(this.http.get<CurrentUser>('/api/auth/me'));
      await this.loadData();
      this.notice = 'Sesión iniciada.';
    });
  }

  async logout(): Promise<void> {
    // Salir pasa por las guardas de ruta: protege los cambios sin guardar.
    // Navegar a la misma dirección se omite y resuelve false, por eso solo se navega si cambia.
    if (this.router.url !== '/procesos' && !(await this.router.navigateByUrl('/procesos'))) return;
    await this.perform(async () => {
      await firstValueFrom(this.http.post('/api/auth/logout', {}));
      this.user = null;
      this.identities = environment.demoMode
        ? await firstValueFrom(this.http.get<DemoIdentity[]>('/api/auth/demo/identities'))
        : [];
      this.notice = '';
    });
  }

  async createMacroprocess(): Promise<void> {
    await this.perform(async () => {
      await firstValueFrom(this.http.post('/api/macroprocesses', {
        name: this.macroName,
        description: null,
        order: Number(this.macroOrder)
      }));
      this.macroName = '';
      this.notice = 'Macroproceso creado y auditado.';
      await this.reloadCatalogs();
    });
  }

  async deactivateMacroprocess(row: Macroprocess): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: 'Desactivar macroproceso',
      message: `¿Desactivar el macroproceso «${row.name}»?`,
      confirmLabel: 'Desactivar',
      tone: 'danger'
    });
    if (!confirmed) return;
    await this.perform(async () => {
      await firstValueFrom(this.http.post(`/api/macroprocesses/${row.id}/deactivate`, {}));
      this.notice = 'Macroproceso desactivado y auditado.';
      await this.reloadCatalogs();
    });
  }

  async editMacroprocess(row: Macroprocess): Promise<void> {
    const values = await this.dialogs.form({
      title: 'Editar macroproceso',
      fields: [
        { key: 'name', label: 'Nombre', value: row.name, required: true, maxLength: 120 },
        { key: 'order', label: 'Orden', type: 'number', value: row.order, required: true, min: 0, max: 999999 }
      ]
    });
    if (!values) return;
    await this.perform(async () => {
      await firstValueFrom(this.http.patch(`/api/macroprocesses/${row.id}`, {
        name: values['name'],
        description: row.description,
        order: values['order']
      }));
      this.notice = 'Macroproceso actualizado y auditado.';
      await this.reloadCatalogs();
    });
  }

  async createProcessType(): Promise<void> {
    await this.perform(async () => {
      await firstValueFrom(this.http.post('/api/process-types', { name: this.processTypeName }));
      this.processTypeName = '';
      this.notice = 'Tipo creado y auditado.';
      await this.reloadCatalogs();
    });
  }

  async deactivateProcessType(row: ProcessType): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: 'Desactivar tipo de proceso',
      message: `¿Desactivar el tipo «${row.name}»?`,
      confirmLabel: 'Desactivar',
      tone: 'danger'
    });
    if (!confirmed) return;
    await this.perform(async () => {
      await firstValueFrom(this.http.post(`/api/process-types/${row.id}/deactivate`, {}));
      this.notice = 'Tipo de proceso desactivado y auditado.';
      await this.reloadCatalogs();
    });
  }

  async editProcessType(row: ProcessType): Promise<void> {
    const values = await this.dialogs.form({
      title: 'Editar tipo de proceso',
      fields: [{ key: 'name', label: 'Nombre', value: row.name, required: true, maxLength: 120 }]
    });
    if (!values) return;
    await this.perform(async () => {
      await firstValueFrom(this.http.patch(`/api/process-types/${row.id}`, { name: values['name'] }));
      this.notice = 'Tipo de proceso actualizado y auditado.';
      await this.reloadCatalogs();
    });
  }

  hasProfile(user: AppUser, profile: string): boolean {
    return user.profiles.split(',').filter(Boolean).includes(profile);
  }

  async toggleProfile(user: AppUser, profile: string, event: Event): Promise<void> {
    const checkbox = event.target as HTMLInputElement;
    const next = new Set(user.profiles.split(',').filter(Boolean));
    if (checkbox.checked) next.add(profile);
    else next.delete(profile);
    await this.perform(async () => {
      await firstValueFrom(this.http.put(`/api/users/${user.id}/profiles`, { profiles: [...next] }));
      this.notice = 'Perfiles actualizados y auditados.';
      await this.loadUsers();
      if (this.user) {
        this.user = await firstValueFrom(this.http.get<CurrentUser>('/api/auth/me'));
      }
    });
  }

  async loadAudit(): Promise<void> {
    await this.perform(async () => {
      const result = await firstValueFrom(this.http.get<{ items: AuditEntry[] }>('/api/audit?page=1&limit=50'));
      this.auditEntries = result.items;
    });
  }

  private async loadData(): Promise<void> {
    await this.reloadCatalogs();
    if (this.isAdmin) {
      await Promise.all([this.loadUsers(), this.loadAudit()]);
    }
  }

  private async reloadCatalogs(): Promise<void> {
    const [macroprocesses, processTypes] = await Promise.all([
      firstValueFrom(this.http.get<Macroprocess[]>('/api/macroprocesses')),
      firstValueFrom(this.http.get<ProcessType[]>('/api/process-types'))
    ]);
    this.macroprocesses = macroprocesses;
    this.processTypes = processTypes;
  }

  private async loadUsers(): Promise<void> {
    this.users = await firstValueFrom(this.http.get<AppUser[]>('/api/users'));
  }

  private async perform(action: () => Promise<void>): Promise<void> {
    this.busy = true;
    this.error = '';
    this.notice = '';
    try {
      await action();
    } catch (error: unknown) {
      this.error = error instanceof HttpErrorResponse && error.status === 403
        ? 'La acción no está autorizada para este perfil.'
        : error instanceof HttpErrorResponse && error.status === 409
          ? 'El cambio entra en conflicto con el estado actual.'
          : 'No fue posible completar la acción.';
    } finally {
      this.busy = false;
      this.changeDetector.detectChanges();
    }
  }

  private isUnauthorized(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 401;
  }
}
