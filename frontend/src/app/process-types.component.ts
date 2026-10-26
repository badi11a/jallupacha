import { Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProcessApi, ProcessTypeItem, errorMessage } from './process-api.service';

import { UiBadgeComponent, UiBreadcrumbsComponent, UiDialogService, UiMessageComponent, UiPanelComponent, focusFirstInvalid } from './shared/ui';
import { LeavesWithConfirmation } from './unsaved-changes.guard';

@Component({
  selector: 'app-process-types',
  imports: [FormsModule, UiBadgeComponent, UiBreadcrumbsComponent, UiMessageComponent, UiPanelComponent],
  styles: [`
    .inline-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); gap: .75rem; align-items: end; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); padding: .9rem; margin-bottom: 1rem; }
    label { display: grid; gap: .25rem; font-weight: 600; }
    input, select { min-height: 2.5rem; padding: 0 .6rem; border: 1px solid var(--ui-color-border-strong); border-radius: var(--ui-radius-lg); font: inherit; }
    .row-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
  `],
  template: `
    <ui-breadcrumbs [items]="[{ label: 'Tipos de proceso' }]" />
    <ui-panel headingId="types-title" eyebrow="CATÁLOGO" heading="Tipos de proceso">
      <button panelActions class="primary-button" type="button" [disabled]="saving()" (click)="startCreate()">Nuevo tipo de proceso</button>
      <p class="helper">Cada macroproceso puede tener los tipos de proceso que se necesiten.</p>
      @if (error()) { <ui-message kind="error">{{ error() }}</ui-message> }
      @if (notice()) { <ui-message kind="success">{{ notice() }}</ui-message> }
      @if (saving()) { <p class="helper" role="status">Guardando cambios…</p> }
      @if (editing() !== null) {
        <form novalidate class="inline-form" (ngSubmit)="save()" [attr.aria-busy]="saving()" [attr.aria-label]="editing() === 0 ? 'Nuevo tipo de proceso' : 'Editar tipo de proceso'">
          <label>Macroproceso (obligatorio)
            <select id="catalog-macro" name="macro" [(ngModel)]="macroprocessId" (ngModelChange)="fieldErrors.set({})" [attr.aria-invalid]="fieldErrors()['macro'] ? true : null" [attr.aria-describedby]="fieldErrors()['macro'] ? 'catalog-error-macro' : null" [disabled]="saving() || editing() !== 0">
              <option [ngValue]="null">Seleccione…</option>
              @for (macro of macros(); track macro.id) { <option [ngValue]="macro.id">{{ macro.code }} · {{ macro.name }}</option> }
            </select>
            @if (fieldErrors()['macro']) { <span id="catalog-error-macro" class="field-error" role="alert">{{ fieldErrors()['macro'] }}</span> }
          </label>
          <label>Nombre (obligatorio)<input id="catalog-name" name="name" maxlength="120" [(ngModel)]="name" (ngModelChange)="fieldErrors.set({})" [attr.aria-invalid]="fieldErrors()['name'] ? true : null" [attr.aria-describedby]="fieldErrors()['name'] ? 'catalog-error-name' : null" [disabled]="saving()" required />@if (fieldErrors()['name']) { <span id="catalog-error-name" class="field-error" role="alert">{{ fieldErrors()['name'] }}</span> }</label>
          <div class="row-actions">
            <button class="primary-button" type="submit" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar tipo' }}</button>
            <button class="quiet-button" type="button" [disabled]="saving()" (click)="cancel()">Cancelar</button>
          </div>
        </form>
      }
      @if (loading()) { <p class="helper" role="status">Cargando información…</p> }
      @else if (loadFailed()) { <button type="button" class="quiet-button" (click)="load()">Reintentar carga</button> }
      @else {
        <div class="table-scroll" tabindex="0" role="region" aria-label="Tipos de proceso">
          <table>
            <caption class="visually-hidden">Tipos de proceso</caption>
            <thead><tr><th scope="col">Macroproceso</th><th scope="col">Tipo de proceso</th><th scope="col">Procesos activos</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
            <tbody>
              @for (type of types(); track type.id) {
                <tr>
                  <td>{{ type.macroprocessCode }} · {{ type.macroprocessName }}</td>
                  <td>{{ type.name }}</td>
                  <td>{{ type.processCount }}</td>
                  <td><ui-badge [tone]="type.isActive ? 'success' : 'neutral'">{{ type.isActive ? 'Activo' : 'Inactivo' }}</ui-badge></td>
                  <td class="row-actions">
                    <button class="quiet-button" type="button" [disabled]="saving()" (click)="startEdit(type)">Editar</button>
                    @if (type.isActive) { <button class="quiet-button" type="button" [disabled]="saving()" (click)="deactivate(type)">Desactivar</button> }
                  </td>
                </tr>
              } @empty { <tr><td colspan="5">No hay tipos de proceso.</td></tr> }
            </tbody>
          </table>
        </div>
      }
    </ui-panel>
  `
})
export class ProcessTypesComponent implements OnInit, LeavesWithConfirmation {
  private readonly api = inject(ProcessApi);
  private readonly dialogs = inject(UiDialogService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly types = signal<ProcessTypeItem[]>([]);
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly fieldErrors = signal<Record<string, string>>({});
  readonly error = signal('');
  readonly notice = signal('');
  readonly editing = signal<number | null>(null);
  readonly saving = signal(false);
  name = '';
  macroprocessId: number | null = null;
  private initialSnapshot = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true); this.loadFailed.set(false); this.error.set('');
    this.api.processTypes().subscribe({
      next: (types) => { this.types.set(types); this.loading.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.loadFailed.set(true); this.loading.set(false); }
    });
  }

  macros(): Array<{ id: number; code: string; name: string }> {
    const seen = new Map<number, { id: number; code: string; name: string }>();
    for (const type of this.types()) seen.set(type.macroprocessId, { id: type.macroprocessId, code: type.macroprocessCode, name: type.macroprocessName });
    return [...seen.values()];
  }

  async startCreate(): Promise<void> {
    if (this.saving() || this.editing() === 0) return;
    if (this.isDirty() && !await this.confirmLeave()) return;
    this.name = '';
    this.macroprocessId = null;
    this.notice.set(''); this.fieldErrors.set({});
    this.initialSnapshot = JSON.stringify({ macroprocessId: null, name: '' });
    this.editing.set(0);
  }

  async startEdit(type: ProcessTypeItem): Promise<void> {
    if (this.saving() || this.editing() === type.id) return;
    if (this.isDirty() && !await this.confirmLeave()) return;
    this.name = type.name;
    this.macroprocessId = type.macroprocessId;
    this.notice.set(''); this.fieldErrors.set({});
    this.initialSnapshot = JSON.stringify({ macroprocessId: type.macroprocessId, name: type.name });
    this.editing.set(type.id);
  }

  isDirty(): boolean {
    if (this.editing() === null) return false;
    return JSON.stringify({ macroprocessId: this.macroprocessId, name: this.name.trim() }) !== this.initialSnapshot;
  }

  async cancel(): Promise<void> {
    if (this.saving()) return;
    if (this.isDirty()) {
      const confirmed = await this.dialogs.confirm({
        title: 'Descartar cambios',
        message: 'Hay cambios sin guardar en el tipo de proceso. ¿Deseas descartarlos?',
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
      message: 'Hay cambios sin guardar en el tipo de proceso. Si sales ahora, se perderán los cambios ingresados.',
      confirmLabel: 'Descartar cambios',
      cancelLabel: 'Continuar editando',
      tone: 'danger'
    });
  }

  save(): void {
    if (this.saving() || this.editing() === null) return;
    const errors: Record<string, string> = {};
    if (!this.name.trim()) errors['name'] = 'El nombre es obligatorio.';
    else if (this.name.trim().length > 120) errors['name'] = 'El nombre admite hasta 120 caracteres.';
    if (this.macroprocessId === null) errors['macro'] = 'Seleccione el macroproceso.';
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) { focusFirstInvalid(this.element.nativeElement); return; }
    const target = this.editing();
    if (this.macroprocessId === null) { this.error.set('El macroproceso es obligatorio.'); return; }
    const body = { macroprocessId: this.macroprocessId, name: this.name.trim() };
    const request = target === 0 ? this.api.createProcessType(body) : this.api.updateProcessType(target as number, body);
    this.saving.set(true);
    request.subscribe({
      next: () => { this.saving.set(false); this.error.set(''); this.notice.set('Tipo de proceso guardado.'); this.editing.set(null); this.load(); },
      error: (e) => { this.saving.set(false); this.error.set(errorMessage(e)); }
    });
  }

  async deactivate(type: ProcessTypeItem): Promise<void> {
    if (this.saving()) return;
    const confirmed = await this.dialogs.confirm({
      title: 'Desactivar tipo de proceso',
      message: `¿Desactivar el tipo de proceso "${type.name}"?`,
      confirmLabel: 'Desactivar',
      cancelLabel: 'Cancelar',
      tone: 'default'
    });
    if (!confirmed || this.saving()) return;
    this.saving.set(true);
    this.api.deactivateProcessType(type.id).subscribe({
      next: () => { this.saving.set(false); this.error.set(''); this.notice.set('Tipo de proceso desactivado.'); this.load(); },
      error: (e) => { this.saving.set(false); this.error.set(errorMessage(e)); }
    });
  }
}
