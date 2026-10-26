import { Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FICHA_FIELDS, FichaKey, ProcessApi, ProcessInput, ProcessListItem, ProcessTypeItem, UnitItem, errorMessage
} from './process-api.service';
import { UiBreadcrumbsComponent, UiDialogService, UiMessageComponent, UiPanelComponent, UiSectionComponent, focusFirstInvalid } from './shared/ui';
import { ProcessNavigation } from './process-navigation.service';
import { LeavesWithConfirmation } from './unsaved-changes.guard';

interface ParticipantRow { unitId: number | null; function: string; }

@Component({
  selector: 'app-process-form',
  imports: [FormsModule, UiBreadcrumbsComponent, UiMessageComponent, UiPanelComponent, UiSectionComponent],
  styles: [`
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); gap: .9rem 1.5rem; }
    label { display: grid; gap: .25rem; font-weight: 600; }
    input, select, textarea { padding: .45rem .6rem; border: 1px solid var(--ui-color-border-strong); border-radius: var(--ui-radius-lg); font: inherit; }
    input, select { min-height: 2.5rem; }
    .wide { grid-column: 1 / -1; }
    .participant { display: grid; grid-template-columns: minmax(12rem, 1fr) minmax(12rem, 2fr) auto; gap: .6rem; align-items: end; margin-bottom: .6rem; }
    .actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1rem; }
    .form-fields { display: block; }
    @media (max-width: 640px) { .participant { grid-template-columns: minmax(0, 1fr); } }
  `],
  template: `
    <ui-breadcrumbs [items]="[{ label: 'Procesos', link: '/procesos' }, { label: editingId ? 'Editar proceso' : 'Nuevo proceso' }]" />
    <ui-panel headingId="form-title" eyebrow="PROCESO" [heading]="editingId ? 'Editar ficha del proceso' : 'Nuevo proceso'">
      <p class="helper">El nombre y la clasificación son obligatorios. El proceso se guarda como borrador; los campos mínimos faltantes se informan en la ficha.</p>
      @if (error()) { <ui-message kind="error">{{ error() }}</ui-message> }
      @if (loading()) { <p class="helper" role="status">Cargando información…</p> }
      @else if (loadFailed()) { <button type="button" class="quiet-button" (click)="ngOnInit()">Reintentar carga del formulario</button> }
      @else {
        @if (saving()) { <p class="helper" role="status">Guardando proceso…</p> }
        <form novalidate (ngSubmit)="save()" [attr.aria-busy]="saving()">
          <fieldset class="form-fields" [disabled]="saving()">
          <legend class="visually-hidden">Ficha del proceso</legend>
          <ui-section heading="Clasificación">
            <div class="form-grid">
              <label for="field-macro">Macroproceso (obligatorio)
                <select id="field-macro" name="macro" [(ngModel)]="macroprocessId" (ngModelChange)="processTypeId = null; clearFieldError('macro')" [attr.aria-invalid]="fieldErrors()['macro'] ? true : null" [attr.aria-describedby]="fieldErrors()['macro'] ? 'error-macro' : null">
                  <option [ngValue]="null">Seleccione…</option>
                  @for (macro of macros(); track macro.id) { <option [ngValue]="macro.id">{{ macro.code }} · {{ macro.name }}</option> }
                </select>
                @if (fieldErrors()['macro']) {
                  <p id="error-macro" class="field-error" role="alert">{{ fieldErrors()['macro'] }}</p>
                }
              </label>
              <label for="field-type">Tipo de proceso (obligatorio)
                <select id="field-type" name="type" [(ngModel)]="processTypeId" (ngModelChange)="clearFieldError('type')" [disabled]="macroprocessId === null" [attr.aria-invalid]="fieldErrors()['type'] ? true : null" [attr.aria-describedby]="fieldErrors()['type'] ? 'error-type' : null">
                  <option [ngValue]="null">Seleccione…</option>
                  @for (type of typeOptions(); track type.id) { <option [ngValue]="type.id">{{ type.name }}</option> }
                </select>
                @if (fieldErrors()['type']) {
                  <p id="error-type" class="field-error" role="alert">{{ fieldErrors()['type'] }}</p>
                }
              </label>
              <label for="field-parent">Proceso padre (opcional)
                <select id="field-parent" name="parent" [(ngModel)]="parentProcessId">
                  <option [ngValue]="null">Sin proceso padre</option>
                  @for (option of parentOptions(); track option.id) { <option [ngValue]="option.id">{{ option.code }} · {{ option.name }}</option> }
                </select>
              </label>
            </div>
          </ui-section>

          <ui-section heading="Identificación">
            <div class="form-grid">
              <label for="field-name" class="wide">Nombre (obligatorio)
                <input id="field-name" name="name" maxlength="250" [(ngModel)]="values['name']" (input)="clearFieldError('name')" [attr.aria-invalid]="fieldErrors()['name'] ? true : null" [attr.aria-describedby]="fieldErrors()['name'] ? 'error-name' : null" required />
                @if (fieldErrors()['name']) {
                  <p id="error-name" class="field-error" role="alert">{{ fieldErrors()['name'] }}</p>
                }
              </label>
              @for (field of shortFields; track field.key) {
                <label [for]="'field-' + field.key">{{ field.label }}<input [id]="'field-' + field.key" [name]="field.key" maxlength="250" [(ngModel)]="values[field.key]" /></label>
              }
            </div>
          </ui-section>

          <ui-section heading="Unidades internas">
            <div class="form-grid">
              <label for="field-resp-unit">Unidad responsable
                <select id="field-resp-unit" name="responsibleUnit" [(ngModel)]="responsibleUnitId">
                  <option [ngValue]="null">Sin unidad responsable</option>
                  @for (unit of units(); track unit.id) { <option [ngValue]="unit.id">{{ unit.name }}{{ unit.isActive ? '' : ' (inactiva)' }}</option> }
                </select>
              </label>
            </div>
            <h3>Unidades participantes</h3>
            @for (row of participants; track $index) {
              <div class="participant">
                <label [for]="'pu' + $index">Unidad (obligatorio)
                  <select [id]="'pu' + $index" [name]="'pu' + $index" [(ngModel)]="row.unitId" (ngModelChange)="clearFieldError('pu_' + $index)" [attr.aria-invalid]="fieldErrors()['pu_' + $index] ? true : null" [attr.aria-describedby]="fieldErrors()['pu_' + $index] ? 'error-pu-' + $index : null">
                    <option [ngValue]="null">Seleccione…</option>
                    @for (unit of units(); track unit.id) { <option [ngValue]="unit.id">{{ unit.name }}{{ unit.isActive ? '' : ' (inactiva)' }}</option> }
                  </select>
                  @if (fieldErrors()['pu_' + $index]) {
                    <p [id]="'error-pu-' + $index" class="field-error" role="alert">{{ fieldErrors()['pu_' + $index] }}</p>
                  }
                </label>
                <label [for]="'pf' + $index">Función en el proceso (obligatorio)
                  <input [id]="'pf' + $index" [name]="'pf' + $index" maxlength="500" [(ngModel)]="row.function" (input)="clearFieldError('pf_' + $index)" [attr.aria-invalid]="fieldErrors()['pf_' + $index] ? true : null" [attr.aria-describedby]="fieldErrors()['pf_' + $index] ? 'error-pf-' + $index : null" />
                  @if (fieldErrors()['pf_' + $index]) {
                    <p [id]="'error-pf-' + $index" class="field-error" role="alert">{{ fieldErrors()['pf_' + $index] }}</p>
                  }
                </label>
                <button class="quiet-button" type="button" (click)="removeParticipant($index)">Quitar</button>
              </div>
            }
            <button class="quiet-button" type="button" (click)="addParticipant()">Agregar unidad participante</button>
          </ui-section>

          @for (group of longGroups; track group) {
            <ui-section [heading]="group">
              <div class="form-grid">
                @for (field of longFieldsOf(group); track field.key) {
                  <label [for]="'field-' + field.key" class="wide">{{ field.label }}<textarea [id]="'field-' + field.key" [name]="field.key" rows="3" maxlength="4000" [(ngModel)]="values[field.key]"></textarea></label>
                }
              </div>
            </ui-section>
          }

          <div class="actions">
            <button class="primary-button" type="submit" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar proceso' }}</button>
            <button class="text-button" type="button" (click)="cancel()">Cancelar</button>
          </div>
          </fieldset>
        </form>
      }
    </ui-panel>
  `
})
export class ProcessFormComponent implements OnInit, LeavesWithConfirmation {
  private readonly api = inject(ProcessApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(UiDialogService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly navigation = inject(ProcessNavigation);
  private returnUrl: string | null = null;

  readonly types = signal<ProcessTypeItem[]>([]);
  readonly units = signal<Array<UnitItem | { id: number; name: string; isActive: boolean }>>([]);
  readonly processes = signal<ProcessListItem[]>([]);
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly fieldErrors = signal<Record<string, string>>({});

  editingId: number | null = null;
  macroprocessId: number | null = null;
  processTypeId: number | null = null;
  parentProcessId: number | null = null;
  responsibleUnitId: number | null = null;
  participants: ParticipantRow[] = [];
  values: Record<string, string> = {};
  readonly shortFields = FICHA_FIELDS.filter((field) => !field.long);
  readonly longGroups = [...new Set(FICHA_FIELDS.filter((field) => field.long).map((field) => field.group))];

  private initialSnapshot = '';
  private savedSuccessfully = false;

  longFieldsOf(group: string) { return FICHA_FIELDS.filter((field) => field.long && field.group === group); }

  macros(): Array<{ id: number; code: string; name: string }> {
    const seen = new Map<number, { id: number; code: string; name: string }>();
    for (const type of this.types()) seen.set(type.macroprocessId, { id: type.macroprocessId, code: type.macroprocessCode, name: type.macroprocessName });
    return [...seen.values()];
  }

  typeOptions(): ProcessTypeItem[] {
    return this.types().filter((type) => type.macroprocessId === this.macroprocessId && (type.isActive || type.id === this.processTypeId));
  }

  parentOptions(): ProcessListItem[] { return this.processes().filter((item) => item.id !== this.editingId); }

  addParticipant(): void { this.participants = [...this.participants, { unitId: null, function: '' }]; }
  removeParticipant(index: number): void { this.participants = this.participants.filter((_, position) => position !== index); }

  clearFieldError(key: string): void {
    if (this.fieldErrors()[key]) {
      const updated = { ...this.fieldErrors() };
      delete updated[key];
      this.fieldErrors.set(updated);
    }
  }

  private serializeState(): string {
    return JSON.stringify({
      macroprocessId: this.macroprocessId,
      processTypeId: this.processTypeId,
      parentProcessId: this.parentProcessId,
      responsibleUnitId: this.responsibleUnitId,
      participants: this.participants,
      values: this.values
    });
  }

  private takeSnapshot(): void {
    this.initialSnapshot = this.serializeState();
  }

  private isDirty(): boolean {
    if (this.savedSuccessfully || !this.initialSnapshot) return false;
    return this.serializeState() !== this.initialSnapshot;
  }

  async confirmLeave(): Promise<boolean> {
    if (this.saving() && !this.savedSuccessfully) return false;
    if (!this.isDirty()) return true;
    return await this.dialogs.confirm({
      title: 'Cambios no guardados',
      message: 'Hay modificaciones pendientes en el formulario. Si sales ahora, se perderán los cambios ingresados.',
      confirmLabel: 'Descartar cambios',
      cancelLabel: 'Continuar editando',
      tone: 'danger'
    });
  }

  async cancel(): Promise<void> {
    if (this.saving()) return;
    if (await this.confirmLeave()) {
      this.savedSuccessfully = true;
      const target = this.editingId ? ['/procesos', this.editingId] : ['/procesos'];
      try { await this.router.navigate(target, { queryParams: { returnTo: this.returnUrl } }); }
      finally { this.savedSuccessfully = false; }
    }
  }

  ngOnInit(): void {
    this.loading.set(true); this.loadFailed.set(false); this.error.set('');
    this.returnUrl = this.navigation.resultsUrl(this.route.snapshot.queryParamMap.get('returnTo'));
    const id = this.route.snapshot.paramMap.get('id');
    this.editingId = id === null ? null : Number(id);
    this.api.processTypes().subscribe({
      next: (types) => {
        this.types.set(types);
        this.api.units().subscribe({
          next: (units) => {
            this.units.set(units.filter((unit) => unit.isActive));
            this.api.listProcesses({}).subscribe({
              next: (processes) => { this.processes.set(processes); this.loadExisting(units); },
              error: (e) => this.failLoad(e)
            });
          },
          error: (e) => this.failLoad(e)
        });
      },
      error: (e) => this.failLoad(e)
    });
  }

  private failLoad(e: unknown): void { this.error.set(errorMessage(e)); this.loadFailed.set(true); this.loading.set(false); }

  private loadExisting(allUnits: UnitItem[]): void {
    if (this.editingId === null) {
      this.loading.set(false);
      this.takeSnapshot();
      return;
    }
    this.api.process(this.editingId).subscribe({
      next: (detail) => {
        this.macroprocessId = detail.macroprocessId;
        this.processTypeId = detail.processTypeId;
        this.parentProcessId = detail.parentProcessId;
        for (const field of [{ key: 'name' as FichaKey }, ...FICHA_FIELDS]) this.values[field.key] = detail[field.key] ?? '';
        const responsible = detail.units.find((unit) => unit.role === 'RESPONSABLE');
        this.responsibleUnitId = responsible?.unitId ?? null;
        this.participants = detail.units.filter((unit) => unit.role === 'PARTICIPANTE').map((unit) => ({ unitId: unit.unitId, function: unit.function ?? '' }));
        const known = new Set(this.units().map((unit) => unit.id));
        const inactive = allUnits.filter((unit) => !unit.isActive && detail.units.some((item) => item.unitId === unit.id) && !known.has(unit.id));
        this.units.set([...this.units(), ...inactive]);
        this.loading.set(false);
        this.takeSnapshot();
      },
      error: (e) => this.failLoad(e)
    });
  }

  save(): void {
    if (this.saving() || this.loading() || !this.initialSnapshot) return;
    const errors: Record<string, string> = {};
    if (!(this.values['name'] ?? '').trim()) {
      errors['name'] = 'El nombre es obligatorio.';
    }
    if (this.macroprocessId === null) {
      errors['macro'] = 'El macroproceso es obligatorio.';
    }
    if (this.processTypeId === null) {
      errors['type'] = 'El tipo de proceso es obligatorio.';
    }
    for (let i = 0; i < this.participants.length; i++) {
      const row = this.participants[i];
      if (row.unitId === null) errors[`pu_${i}`] = 'Seleccione una unidad.';
      if (!row.function.trim()) errors[`pf_${i}`] = 'La función es obligatoria.';
    }

    if (Object.keys(errors).length > 0) {
      this.fieldErrors.set(errors);
      this.error.set('Por favor completa los campos obligatorios indicados.');
      focusFirstInvalid(this.element.nativeElement);
      return;
    }

    this.fieldErrors.set({});
    this.error.set('');

    const body: ProcessInput = {
      macroprocessId: this.macroprocessId!,
      processTypeId: this.processTypeId!,
      parentProcessId: this.parentProcessId,
      responsibleUnitId: this.responsibleUnitId,
      participants: this.participants.map((row) => ({ unitId: row.unitId as number, function: row.function }))
    };
    for (const field of [{ key: 'name' as FichaKey }, ...FICHA_FIELDS]) body[field.key] = (this.values[field.key] ?? '').trim();
    this.saving.set(true);
    const request = this.editingId === null ? this.api.createProcess(body) : this.api.updateProcess(this.editingId, body);
    request.subscribe({
      next: (result) => {
        this.takeSnapshot();
        this.savedSuccessfully = true;
        const id = this.editingId ?? (result as { id: number }).id;
        const finish = (): void => { this.savedSuccessfully = false; this.saving.set(false); };
        void this.router.navigate(['/procesos', id], { queryParams: { returnTo: this.returnUrl } }).then(
          (navigated) => {
            finish();
            if (!navigated) this.error.set('El proceso se guardó, pero no fue posible abrir su ficha.');
          },
          () => { finish(); this.error.set('El proceso se guardó, pero no fue posible abrir su ficha.'); }
        );
      },
      error: (e) => { this.error.set(errorMessage(e)); this.saving.set(false); }
    });
  }
}
