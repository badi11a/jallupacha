import { Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MvpV14Api, UnitItem, errorMessage } from './mvp-v14-api.service';

import { UiBadgeComponent, UiBreadcrumbsComponent, UiDialogService, UiMessageComponent, UiPanelComponent, focusFirstInvalid } from './shared/ui';
import { LeavesWithConfirmation } from './unsaved-changes.guard';

@Component({
  selector: 'app-units',
  imports: [FormsModule, UiBadgeComponent, UiBreadcrumbsComponent, UiMessageComponent, UiPanelComponent],
  styles: [`
    .inline-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); gap: .75rem; align-items: end; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); padding: .9rem; margin-bottom: 1rem; }
    label { display: grid; gap: .25rem; font-weight: 600; }
    input, select { min-height: 2.5rem; padding: 0 .6rem; border: 1px solid var(--ui-color-border-strong); border-radius: var(--ui-radius-lg); font: inherit; }
    .row-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
  `],
  template: `
    <ui-breadcrumbs [items]="[{ label: 'Unidades internas' }]" />
    <ui-panel headingId="units-title" eyebrow="CATÁLOGO" heading="Unidades internas">
      <button panelActions class="primary-button" type="button" [disabled]="saving()" (click)="startCreate()">Nueva unidad</button>
      @if (error()) { <ui-message kind="error">{{ error() }}</ui-message> }
      @if (notice()) { <ui-message kind="success">{{ notice() }}</ui-message> }
      @if (saving()) { <p class="helper" role="status">Guardando cambios…</p> }
      @if (editing() !== null) {
        <form novalidate class="inline-form" (ngSubmit)="save()" [attr.aria-busy]="saving()" [attr.aria-label]="editing() === 0 ? 'Nueva unidad' : 'Editar unidad'">
          <label>Nombre (obligatorio)<input id="catalog-name" name="name" maxlength="200" [(ngModel)]="name" (ngModelChange)="fieldErrors.set({})" [attr.aria-invalid]="fieldErrors()['name'] ? true : null" [attr.aria-describedby]="fieldErrors()['name'] ? 'catalog-error-name' : null" [disabled]="saving()" required />@if (fieldErrors()['name']) { <span id="catalog-error-name" class="field-error" role="alert">{{ fieldErrors()['name'] }}</span> }</label>
          <label>Unidad superior
            <select name="parent" [(ngModel)]="parentUnitId" [disabled]="saving()">
              <option [ngValue]="null">Sin unidad superior</option>
              @for (unit of parentOptions(); track unit.id) { <option [ngValue]="unit.id">{{ unit.name }}</option> }
            </select>
          </label>
          <div class="row-actions">
            <button class="primary-button" type="submit" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar unidad' }}</button>
            <button class="quiet-button" type="button" [disabled]="saving()" (click)="cancel()">Cancelar</button>
          </div>
        </form>
      }
      @if (loading()) { <p class="helper" role="status">Cargando información…</p> }
      @else if (loadFailed()) { <button type="button" class="quiet-button" (click)="load()">Reintentar carga</button> }
      @else {
        <div class="table-scroll" tabindex="0" role="region" aria-label="Unidades internas">
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
                    <button class="quiet-button" type="button" [disabled]="saving()" (click)="startEdit(row.unit)">Editar</button>
                    @if (row.unit.isActive) { <button class="quiet-button" type="button" [disabled]="saving()" (click)="deactivate(row.unit)">Desactivar</button> }
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
export class UnitsComponent implements OnInit, LeavesWithConfirmation {
  private readonly api = inject(MvpV14Api);
  private readonly dialogs = inject(UiDialogService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly units = signal<UnitItem[]>([]);
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly fieldErrors = signal<Record<string, string>>({});
  readonly error = signal('');
  readonly notice = signal('');
  readonly editing = signal<number | null>(null);
  readonly saving = signal(false);
  name = '';
  parentUnitId: number | null = null;
  private initialSnapshot = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true); this.loadFailed.set(false); this.error.set('');
    this.api.units().subscribe({
      next: (units) => { this.units.set(units); this.loading.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.loadFailed.set(true); this.loading.set(false); }
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

  async startCreate(): Promise<void> {
    if (this.saving() || this.editing() === 0) return;
    if (this.isDirty() && !await this.confirmLeave()) return;
    this.name = '';
    this.parentUnitId = null;
    this.notice.set(''); this.fieldErrors.set({});
    this.initialSnapshot = JSON.stringify({ name: '', parentUnitId: null });
    this.editing.set(0);
  }

  async startEdit(unit: UnitItem): Promise<void> {
    if (this.saving() || this.editing() === unit.id) return;
    if (this.isDirty() && !await this.confirmLeave()) return;
    this.name = unit.name;
    this.parentUnitId = unit.parentUnitId;
    this.notice.set(''); this.fieldErrors.set({});
    this.initialSnapshot = JSON.stringify({ name: unit.name, parentUnitId: unit.parentUnitId });
    this.editing.set(unit.id);
  }

  isDirty(): boolean {
    if (this.editing() === null) return false;
    return JSON.stringify({ name: this.name.trim(), parentUnitId: this.parentUnitId }) !== this.initialSnapshot;
  }

  async cancel(): Promise<void> {
    if (this.saving()) return;
    if (this.isDirty()) {
      const confirmed = await this.dialogs.confirm({
        title: 'Descartar cambios',
        message: 'Hay cambios sin guardar en la unidad. ¿Deseas descartarlos?',
        confirmLabel: 'Descartar cambios',
        cancelLabel: 'Continuar editando',
        tone: 'danger'
      });
      if (!confirmed) return;
    }
    this.editing.set(null);
  }

  async confirmLeave(): Promise<boolean> {
    if (this.saving()) return false;
    if (!this.isDirty()) return true;
    return await this.dialogs.confirm({
      title: 'Cambios no guardados',
      message: 'Hay cambios sin guardar en la unidad. Si sales ahora, se perderán los cambios ingresados.',
      confirmLabel: 'Descartar cambios',
      cancelLabel: 'Continuar editando',
      tone: 'danger'
    });
  }

  save(): void {
    if (this.saving() || this.editing() === null) return;
    const errors: Record<string, string> = {};
    if (!this.name.trim()) errors['name'] = 'El nombre es obligatorio.';
    else if (this.name.trim().length > 200) errors['name'] = 'El nombre admite hasta 200 caracteres.';
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) { focusFirstInvalid(this.element.nativeElement); return; }
    const target = this.editing();
    const body = { name: this.name.trim(), parentUnitId: this.parentUnitId };
    const request = target === 0 ? this.api.createUnit(body) : this.api.updateUnit(target as number, body);
    this.saving.set(true);
    request.subscribe({
      next: () => { this.saving.set(false); this.error.set(''); this.notice.set('Unidad guardada.'); this.editing.set(null); this.load(); },
      error: (e) => { this.saving.set(false); this.error.set(errorMessage(e)); }
    });
  }

  async deactivate(unit: UnitItem): Promise<void> {
    if (this.saving()) return;
    const confirmed = await this.dialogs.confirm({
      title: 'Desactivar unidad',
      message: `¿Desactivar la unidad "${unit.name}"? Las asociaciones existentes se conservan.`,
      confirmLabel: 'Desactivar',
      cancelLabel: 'Cancelar',
      tone: 'default'
    });
    if (!confirmed || this.saving()) return;
    this.saving.set(true);
    this.api.deactivateUnit(unit.id).subscribe({
      next: () => { this.saving.set(false); this.error.set(''); this.notice.set('Unidad desactivada.'); this.load(); },
      error: (e) => { this.saving.set(false); this.error.set(errorMessage(e)); }
    });
  }
}
