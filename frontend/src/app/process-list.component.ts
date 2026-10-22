import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import { MvpV14Api, ProcessListItem, ProcessTypeItem, UnitItem, errorMessage } from './mvp-v14-api.service';
import { UiBadgeComponent, UiBreadcrumbsComponent, UiMessageComponent, UiPanelComponent } from './shared/ui';

@Component({
  selector: 'app-process-list',
  imports: [FormsModule, RouterLink, UiBadgeComponent, UiBreadcrumbsComponent, UiMessageComponent, UiPanelComponent],
  styles: [`
    .filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: .75rem; align-items: end; margin-bottom: 1rem; }
    .filters label { display: grid; gap: .25rem; font-weight: 600; }
    .filters input, .filters select { min-height: 2.5rem; padding: 0 .6rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); font: inherit; }
    td a { font-weight: 600; }
  `],
  template: `
    <ui-breadcrumbs [items]="[{ label: 'Mapa de procesos', link: '/mapa' }, { label: 'Procesos' }]" />
    <ui-panel headingId="processes-title" eyebrow="PROCESOS" heading="Procesos">
      @if (auth.isAdmin()) {
        <a panelActions class="text-button" routerLink="/usuarios">Usuarios</a>
      }
      @if (auth.isAdmin()) {
        <a panelActions class="text-button" routerLink="/unidades">Unidades internas</a>
      }
      @if (auth.isAdmin()) {
        <a panelActions class="text-button" routerLink="/tipos-de-proceso">Tipos de proceso</a>
      }
      @if (auth.hasAnyProfile('ADMIN', 'PROCESS_OWNER')) {
        <a panelActions class="primary-button" routerLink="/procesos/nuevo">Nuevo proceso</a>
      }
      @if (error()) { <ui-message kind="error">{{ error() }}</ui-message> }
      <form class="filters" (ngSubmit)="search()" role="search" aria-label="Buscar procesos">
        <label>Buscar
          <input name="q" type="search" placeholder="Código, nombre, alias, responsable o descripción" [(ngModel)]="q" />
        </label>
        <label>Macroproceso
          <select name="macro" [(ngModel)]="macroprocessId" (ngModelChange)="processTypeId = ''">
            <option value="">Todos</option>
            @for (macro of macroOptions(); track macro.id) { <option [value]="macro.id">{{ macro.code }} · {{ macro.name }}</option> }
          </select>
        </label>
        <label>Tipo de proceso
          <select name="type" [(ngModel)]="processTypeId">
            <option value="">Todos</option>
            @for (type of typeOptions(); track type.id) { <option [value]="type.id">{{ type.name }}</option> }
          </select>
        </label>
        <label>Unidad interna
          <select name="unit" [(ngModel)]="unitId">
            <option value="">Todas</option>
            @for (unit of units(); track unit.id) { <option [value]="unit.id">{{ unit.name }}</option> }
          </select>
        </label>
        <div><button class="primary-button" type="submit">Buscar</button>
          <button class="quiet-button" type="button" (click)="clear()">Limpiar</button></div>
      </form>
      @if (loading()) { <p class="helper" role="status">Cargando información…</p> }
      @else {
        <p class="helper" role="status">{{ items().length }} proceso(s){{ items().length >= 300 ? ' (se muestran los primeros 300; afine la búsqueda)' : '' }}</p>
        <div class="table-scroll">
          <table>
            <caption class="visually-hidden">Procesos</caption>
            <thead><tr><th scope="col">Código</th><th scope="col">Nombre</th><th scope="col">Clasificación</th>
              <th scope="col">Unidad responsable</th><th scope="col">Estado</th></tr></thead>
            <tbody>
              @for (item of items(); track item.id) {
                <tr>
                  <td>{{ item.code }}</td>
                  <td><a [routerLink]="['/procesos', item.id]">{{ item.name }}</a>@if (item.alias) { <span class="helper"> ({{ item.alias }})</span> }</td>
                  <td>{{ item.macroprocess }} › {{ item.processType }}</td>
                  <td>{{ item.responsibleUnit || 'Sin información' }}</td>
                  <td><ui-badge tone="info">{{ item.status }}</ui-badge></td>
                </tr>
              } @empty { <tr><td colspan="5">Ningún proceso coincide con la búsqueda.</td></tr> }
            </tbody>
          </table>
        </div>
      }
    </ui-panel>
  `
})
export class ProcessListComponent implements OnInit {
  private readonly api = inject(MvpV14Api);
  readonly auth = inject(AuthService);
  readonly items = signal<ProcessListItem[]>([]);
  readonly types = signal<ProcessTypeItem[]>([]);
  readonly units = signal<UnitItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  q = '';
  macroprocessId = '';
  processTypeId = '';
  unitId = '';

  macroOptions(): Array<{ id: number; code: string; name: string }> {
    const seen = new Map<number, { id: number; code: string; name: string }>();
    for (const type of this.types()) seen.set(type.macroprocessId, { id: type.macroprocessId, code: type.macroprocessCode, name: type.macroprocessName });
    return [...seen.values()];
  }

  typeOptions(): ProcessTypeItem[] {
    return this.types().filter((type) => type.isActive && (this.macroprocessId === '' || String(type.macroprocessId) === this.macroprocessId));
  }

  ngOnInit(): void {
    this.api.processTypes().subscribe({ next: (types) => this.types.set(types), error: (e) => this.error.set(errorMessage(e)) });
    this.api.units().subscribe({ next: (units) => this.units.set(units.filter((unit) => unit.isActive)), error: (e) => this.error.set(errorMessage(e)) });
    this.search();
  }

  search(): void {
    this.loading.set(true);
    this.api.listProcesses({ q: this.q, macroprocessId: this.macroprocessId, processTypeId: this.processTypeId, unitId: this.unitId }).subscribe({
      next: (items) => { this.items.set(items); this.error.set(''); this.loading.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); }
    });
  }

  clear(): void {
    this.q = this.macroprocessId = this.processTypeId = this.unitId = '';
    this.search();
  }
}
