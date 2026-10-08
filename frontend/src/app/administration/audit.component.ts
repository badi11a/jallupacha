import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, Signal, inject } from '@angular/core';
import { ROUTER_OUTLET_DATA } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProcessOutletData, administrationErrorMessage, isAdmin } from '../access';
import { UiMessageComponent, UiPanelComponent } from '../shared/ui';

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

/** Auditoría reciente (C-008): solo Administrador, con la misma consulta limitada que antes. */
@Component({
  selector: 'app-audit',
  imports: [DatePipe, UiMessageComponent, UiPanelComponent],
  template: `
    <ui-panel class="admin-panel" eyebrow="TRAZABILIDAD" heading="Auditoría reciente" headingId="audit-title">
      @if (admin) {
        <button panelActions class="text-button" type="button" [disabled]="busy" (click)="loadAudit()">Actualizar</button>
      }
      @if (error) { <ui-message kind="error">{{ error }}</ui-message> }
      @if (admin) {
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
              } @empty { <tr><td colspan="5">{{ busy ? 'Cargando…' : 'No hay cambios auditados.' }}</td></tr> }
            </tbody>
          </table>
        </div>
      }
    </ui-panel>
  `
})
export class AuditComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly session = inject(ROUTER_OUTLET_DATA) as Signal<ProcessOutletData>;
  private destroyed = false;
  auditEntries: AuditEntry[] = [];
  error = '';
  busy = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.destroyed = true));
  }

  get admin(): boolean {
    return isAdmin(this.session());
  }

  async ngOnInit(): Promise<void> {
    // Sin perfil Administrador no se solicita la auditoría: el servidor la rechazaría con 403.
    if (!this.admin) {
      this.error = 'La acción no está autorizada para este perfil.';
      return;
    }
    await this.loadAudit();
  }

  async loadAudit(): Promise<void> {
    this.busy = true;
    this.error = '';
    try {
      const result = await firstValueFrom(this.http.get<{ items: AuditEntry[] }>('/api/audit?page=1&limit=50'));
      this.auditEntries = result.items;
    } catch (error: unknown) {
      this.error = administrationErrorMessage(error);
    } finally {
      this.busy = false;
      if (!this.destroyed) this.changeDetector.detectChanges();
    }
  }
}
