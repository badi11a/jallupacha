import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MvpV14Api, UnitItem, errorMessage } from './mvp-v14-api.service';
import { UiBadgeComponent, UiMessageComponent, UiPanelComponent } from './shared/ui';

@Component({
  selector: 'app-units',
  imports: [FormsModule, UiBadgeComponent, UiMessageComponent, UiPanelComponent],
  styles: [`
    .inline-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: .75rem; align-items: end; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); padding: .9rem; margin-bottom: 1rem; }
    label { display: grid; gap: .25rem; font-weight: 600; }
    input, select { min-height: 2.5rem; padding: 0 .6rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); font: inherit; }
    .row-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
  `],
  template: `
    <ui-panel headingId="units-title" eyebrow="CATÁLOGO" heading="Unidades internas">
      <button panelActions class="primary-button" type="button" (click)="startCreate()">Nueva unidad</button>
      @if (error()) { <ui-message kind="error">{{ error() }}</ui-message> }
      @if (notice()) { <ui-message kind="success">{{ notice() }}</ui-message> }
      @if (editing() !== null) {
        <form class="inline-form" (ngSubmit)="save()" [attr.aria-label]="editing() === 0 ? 'Nueva unidad' : 'Editar unidad'">
          <label>Nombre<input name="name" maxlength="250" [(ngModel)]="name" required /></label>
          <label>Unidad superior
            <select name="parent" [(ngModel)]="parentUnitId">
              <option [ngValue]="null">Sin unidad superior</option>
              @for (unit of parentOptions(); track unit.id) { <option [ngValue]="unit.id">{{ unit.name }}</option> }
            </select>
          </label>
          <div class="row-actions">
            <button class="primary-button" type="submit">Guardar unidad</button>
            <button class="quiet-button" type="button" (click)="editing.set(null)">Cancelar</button>
          </div>
        </form>
      }
      @if (loading()) { <p class="helper" role="status">Cargando información…</p> }
      @else {
        <div class="table-scroll">
          <table>
            <caption class="visually-hidden">Unidades internas</caption>
            <thead><tr><th scope="col">Unidad</th><th scope="col">Unidad superior</th><th scope="col">Procesos</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
            <tbody>
              @for (row of rows(); track row.unit.id) {
                <tr>
                  <td [style.padding-left.rem]="0.75 + row.depth * 1.5">{{ row.unit.name }}</td>
                  <td>{{ parentName(row.unit) }}</td>
                  <td>{{ row.unit.processCount }}</td>
                  <td><ui-badge [tone]="row.unit.isActive ? 'success' : 'neutral'">{{ row.unit.isActive ? 'Activa' : 'Inactiva' }}</ui-badge></td>
                  <td class="row-actions">
                    <button class="quiet-button" type="button" (click)="startEdit(row.unit)">Editar</button>
                    @if (row.unit.isActive) { <button class="danger-button" type="button" (click)="deactivate(row.unit)">Desactivar</button> }
                  </td>
                </tr>
              } @empty { <tr><td colspan="5">No hay unidades registradas.</td></tr> }
            </tbody>
          </table>
        </div>
      }
    </ui-panel>
  `
})
export class UnitsComponent implements OnInit {
  private readonly api = inject(MvpV14Api);
  readonly units = signal<UnitItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly notice = signal('');
  readonly editing = signal<number | null>(null);
  name = '';
  parentUnitId: number | null = null;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.units().subscribe({
      next: (units) => { this.units.set(units); this.loading.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); }
    });
  }

  rows(): Array<{ unit: UnitItem; depth: number }> {
    const all = this.units();
    const byParent = new Map<number | null, UnitItem[]>();
    for (const unit of all) byParent.set(unit.parentUnitId, [...(byParent.get(unit.parentUnitId) ?? []), unit]);
    const result: Array<{ unit: UnitItem; depth: number }> = [];
    const visited = new Set<number>();
    const walk = (parent: number | null, depth: number): void => {
      for (const unit of (byParent.get(parent) ?? []).sort((a, b) => a.name.localeCompare(b.name, 'es'))) {
        if (visited.has(unit.id)) continue;
        visited.add(unit.id);
        result.push({ unit, depth });
        walk(unit.id, depth + 1);
      }
    };
    walk(null, 0);
    return result;
  }

  parentName(unit: UnitItem): string { return this.units().find((item) => item.id === unit.parentUnitId)?.name ?? '—'; }

  parentOptions(): UnitItem[] { return this.units().filter((unit) => unit.isActive && unit.id !== this.editing()); }

  startCreate(): void { this.name = ''; this.parentUnitId = null; this.notice.set(''); this.editing.set(0); }
  startEdit(unit: UnitItem): void { this.name = unit.name; this.parentUnitId = unit.parentUnitId; this.notice.set(''); this.editing.set(unit.id); }

  save(): void {
    const target = this.editing();
    const body = { name: this.name.trim(), parentUnitId: this.parentUnitId };
    const request = target === 0 ? this.api.createUnit(body) : this.api.updateUnit(target as number, body);
    request.subscribe({
      next: () => { this.error.set(''); this.notice.set('Unidad guardada.'); this.editing.set(null); this.load(); },
      error: (e) => this.error.set(errorMessage(e))
    });
  }

  deactivate(unit: UnitItem): void {
    if (!confirm(`¿Desactivar la unidad "${unit.name}"? Las asociaciones existentes se conservan.`)) return;
    this.api.deactivateUnit(unit.id).subscribe({
      next: () => { this.error.set(''); this.notice.set('Unidad desactivada.'); this.load(); },
      error: (e) => this.error.set(errorMessage(e))
    });
  }
}
