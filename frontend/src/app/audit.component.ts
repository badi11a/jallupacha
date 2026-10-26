import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, catchError, of, startWith, switchMap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuditApiService, AuditItem } from './audit.service';
import { AuthService } from './auth.service';
import { errorMessage } from './process-api.service';
import {
  UiBadgeComponent,
  UiBadgeTone,
  UiBreadcrumbsComponent,
  UiMessageComponent,
  UiPanelComponent
} from './shared/ui';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    UiBadgeComponent,
    UiBreadcrumbsComponent,
    UiMessageComponent,
    UiPanelComponent
  ],
  styles: [`
    .audit-filters {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
      gap: .75rem;
      align-items: end;
      margin-bottom: 1.25rem;
    }
    .audit-filters label {
      display: grid;
      gap: .25rem;
      font-weight: 600;
    }
    .audit-filters input, .audit-filters select {
      min-height: 2.5rem;
      padding: 0 .6rem;
      border: 1px solid var(--ui-color-border-strong);
      border-radius: var(--ui-radius-lg);
      font: inherit;
    }
    .diff-box {
      margin-top: .6rem;
      padding: .75rem;
      background: var(--ui-color-surface-subtle, #f9fafb);
      border: 1px solid var(--ui-color-border);
      border-radius: var(--ui-radius-md);
      font-size: .85rem;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
      gap: .75rem;
    }
    .diff-col pre {
      background: #fff;
      border: 1px solid var(--ui-color-border);
      border-radius: 4px;
      padding: .5rem;
      overflow-x: auto;
      max-height: 14rem;
      font-family: monospace;
      font-size: .8rem;
    }
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
      flex-wrap: wrap;
      gap: .75rem;
    }
    .page-controls {
      display: flex;
      gap: .5rem;
    }
  `],
  template: `
    <ui-breadcrumbs [items]="[{ label: 'Auditoría' }]" />
    <ui-panel headingId="audit-title" eyebrow="SEGURIDAD Y CONTROL" heading="Bitácora de auditoría inmutable">

      @if (error()) { <ui-message kind="error">{{ error() }}</ui-message> }
      @if (error()) { <button type="button" class="quiet-button" (click)="load()">Reintentar consulta</button> }

      <form class="audit-filters" (ngSubmit)="search()" role="search" aria-label="Filtrar eventos de auditoría">
        <label>Tipo de entidad
          <select name="entityType" [(ngModel)]="entityType">
            <option value="">Todas las entidades</option>
            <option value="PROCESS">Proceso (PROCESS)</option>
            <option value="USER">Usuario (USER)</option>
            <option value="PROCESS_TYPE">Tipo de proceso</option>
            <option value="ORGANIZATIONAL_UNIT">Unidad interna</option>
          </select>
        </label>
        <label>Acción registrada
          <input name="action" type="search" placeholder="Ej: PROCESS_APPROVED, USER_PROFILES_UPDATED" [(ngModel)]="action" />
        </label>
        <div>
          <button class="primary-button" type="submit">Filtrar</button>
          <button class="quiet-button" type="button" (click)="clear()">Limpiar</button>
        </div>
      </form>

      @if (loading()) {
        <p class="helper" role="status">Cargando bitácora de auditoría…</p>
      } @else if (!error()) {
        <p class="helper" role="status">{{ total() }} evento(s) coincidente(s) con la consulta ejecutada; {{ items().length }} en esta página.</p>
        <div class="table-scroll" tabindex="0" role="region" aria-label="Resultados de auditoría">
          <table>
            <caption class="visually-hidden">Registro histórico inmutable de eventos de auditoría</caption>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Fecha y hora (UTC)</th>
                <th scope="col">Usuario actor</th>
                <th scope="col">Acción</th>
                <th scope="col">Entidad afectada</th>
                <th scope="col">Valores registrados</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of items(); track entry.id) {
                <tr>
                  <td>{{ entry.id }}</td>
                  <td>{{ formatDate(entry.createdAt) }}</td>
                  <td>
                    @if (entry.actorDisplayName) {
                      <strong>{{ entry.actorDisplayName }}</strong>
                      <div class="helper">{{ entry.actorEmail }}</div>
                    } @else if (entry.actorUserId) {
                      <span>Usuario ID {{ entry.actorUserId }}</span>
                    } @else {
                      <span class="helper">Sistema / Proceso</span>
                    }
                  </td>
                  <td>
                    <ui-badge [tone]="getActionTone(entry.action)">{{ entry.action }}</ui-badge>
                  </td>
                  <td>
                    <strong>{{ entry.entityType }}</strong> #{{ entry.entityId }}
                  </td>
                  <td>
                    @if (entry.beforeValue || entry.afterValue) {
                      <button
                        type="button"
                        class="text-button"
                        (click)="toggleDetail(entry.id)"
                        [attr.aria-expanded]="isExpanded(entry.id)"
                      >
                        {{ isExpanded(entry.id) ? 'Ocultar cambios' : 'Ver cambios' }}
                      </button>
                      @if (isExpanded(entry.id)) {
                        <div class="diff-box">
                          @if (entry.beforeValue) {
                            <div class="diff-col">
                              <strong>Valores anteriores:</strong>
                              <pre>{{ formatJson(entry.beforeValue) }}</pre>
                            </div>
                          }
                          @if (entry.afterValue) {
                            <div class="diff-col">
                              <strong>Valores posteriores:</strong>
                              <pre>{{ formatJson(entry.afterValue) }}</pre>
                            </div>
                          }
                        </div>
                      }
                    } @else {
                      <span class="helper">Sin modificaciones de valor</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6">No se encontraron registros de auditoría coincidentes.</td></tr>
              }
            </tbody>
          </table>
        </div>

        <div class="pagination-bar" aria-label="Navegación de páginas">
          <span class="helper">Página {{ page() }} de {{ totalPages() }}</span>
          <div class="page-controls">
            <button
              type="button"
              class="quiet-button"
              [disabled]="page() <= 1"
              (click)="goToPage(page() - 1)"
            >
              Anterior
            </button>
            <button
              type="button"
              class="quiet-button"
              [disabled]="page() >= totalPages()"
              (click)="goToPage(page() + 1)"
            >
              Siguiente
            </button>
          </div>
        </div>
      }
    </ui-panel>
  `
})
export class AuditComponent implements OnInit {
  private readonly auditApi = inject(AuditApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retryLoad = new Subject<void>();
  readonly auth = inject(AuthService);

  readonly items = signal<AuditItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(25);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly expandedIds = signal<Set<number>>(new Set());

  entityType = '';
  action = '';

  ngOnInit(): void {
    this.route.queryParamMap.pipe(switchMap(params => this.retryLoad.pipe(startWith(undefined), switchMap(() => {
      this.entityType = params.get('entityType') ?? '';
      this.action = params.get('action') ?? '';
      const page = Number(params.get('page'));
      this.page.set(Number.isSafeInteger(page) && page > 0 ? page : 1);
      this.loading.set(true); this.error.set(null); this.expandedIds.set(new Set());
      return this.auditApi.list(this.page(), this.limit(), this.entityType, this.action).pipe(
        catchError(err => { this.error.set(errorMessage(err)); return of(null); })
      );
    }))), takeUntilDestroyed(this.destroyRef)).subscribe(res => {
      if (res) { this.items.set(res.items); this.total.set(res.total); }
      this.loading.set(false);
    });
  }

  load(): void {
    const url = this.router.createUrlTree(['/auditoria'], { queryParams: { entityType: this.entityType || null, action: this.action || null, page: this.page() === 1 ? null : this.page() } });
    if (this.router.serializeUrl(url) === this.router.url) this.retryLoad.next();
    else void this.router.navigateByUrl(url);
  }

  search(): void {
    this.page.set(1);
    this.load();
  }

  clear(): void {
    this.entityType = '';
    this.action = '';
    this.page.set(1);
    this.load();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.load();
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit()));
  }

  isExpanded(id: number): boolean {
    return this.expandedIds().has(id);
  }

  toggleDetail(id: number): void {
    const current = new Set(this.expandedIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.expandedIds.set(current);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('es-CL', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + ' UTC';
    } catch {
      return dateStr;
    }
  }

  formatJson(val: string | null): string {
    if (!val) return '';
    try {
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return val;
    }
  }

  getActionTone(action: string): UiBadgeTone {
    if (action.includes('APPROVED')) return 'success';
    if (action.includes('REJECTED')) return 'danger';
    if (action.includes('SUBMITTED') || action.includes('CREATED') || action.includes('NEW_VERSION')) return 'info';
    if (action.includes('UPDATED') || action.includes('CHANGE')) return 'warning';
    return 'neutral';
  }
}
