import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FICHA_FIELDS, FichaKey, MvpV14Api, ProcessInput, ProcessListItem, ProcessTypeItem, UnitItem, errorMessage
} from './mvp-v14-api.service';
import { UiBreadcrumbsComponent, UiMessageComponent, UiPanelComponent, UiSectionComponent } from './shared/ui';

interface ParticipantRow { unitId: number | null; function: string; }

@Component({
  selector: 'app-process-form',
  imports: [FormsModule, RouterLink, UiBreadcrumbsComponent, UiMessageComponent, UiPanelComponent, UiSectionComponent],
  styles: [`
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: .9rem 1.5rem; }
    label { display: grid; gap: .25rem; font-weight: 600; }
    input, select, textarea { padding: .45rem .6rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); font: inherit; }
    input, select { min-height: 2.5rem; }
    .wide { grid-column: 1 / -1; }
    .participant { display: grid; grid-template-columns: minmax(12rem, 1fr) minmax(12rem, 2fr) auto; gap: .6rem; align-items: end; margin-bottom: .6rem; }
    .actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1rem; }
  `],
  template: `
    <ui-breadcrumbs [items]="[{ label: 'Procesos', link: '/procesos' }, { label: editingId ? 'Editar proceso' : 'Nuevo proceso' }]" />
    <ui-panel headingId="form-title" eyebrow="PROCESO" [heading]="editingId ? 'Editar ficha del proceso' : 'Nuevo proceso'">
      <p class="helper">El nombre y la clasificación son obligatorios. El proceso se guarda como borrador; los campos mínimos faltantes se informan en la ficha.</p>
      @if (error()) { <ui-message kind="error">{{ error() }}</ui-message> }
      @if (loading()) { <p class="helper" role="status">Cargando información…</p> }
      @else {
        <form (ngSubmit)="save()">
          <ui-section heading="Clasificación">
            <div class="form-grid">
              <label>Macroproceso (obligatorio)
                <select name="macro" [(ngModel)]="macroprocessId" (ngModelChange)="processTypeId = null">
                  <option [ngValue]="null">Seleccione…</option>
                  @for (macro of macros(); track macro.id) { <option [ngValue]="macro.id">{{ macro.code }} · {{ macro.name }}</option> }
                </select>
              </label>
              <label>Tipo de proceso (obligatorio)
                <select name="type" [(ngModel)]="processTypeId" [disabled]="macroprocessId === null">
                  <option [ngValue]="null">Seleccione…</option>
                  @for (type of typeOptions(); track type.id) { <option [ngValue]="type.id">{{ type.name }}</option> }
                </select>
              </label>
              <label>Proceso padre (opcional)
                <select name="parent" [(ngModel)]="parentProcessId">
                  <option [ngValue]="null">Sin proceso padre</option>
                  @for (option of parentOptions(); track option.id) { <option [ngValue]="option.id">{{ option.code }} · {{ option.name }}</option> }
                </select>
              </label>
            </div>
          </ui-section>

          <ui-section heading="Identificación">
            <div class="form-grid">
              <label class="wide">Nombre (obligatorio)<input name="name" maxlength="250" [(ngModel)]="values['name']" required /></label>
              @for (field of shortFields; track field.key) {
                <label>{{ field.label }}<input [name]="field.key" maxlength="250" [(ngModel)]="values[field.key]" /></label>
              }
            </div>
          </ui-section>

          <ui-section heading="Unidades internas">
            <div class="form-grid">
              <label>Unidad responsable
                <select name="responsibleUnit" [(ngModel)]="responsibleUnitId">
                  <option [ngValue]="null">Sin unidad responsable</option>
                  @for (unit of units(); track unit.id) { <option [ngValue]="unit.id">{{ unit.name }}{{ unit.isActive ? '' : ' (inactiva)' }}</option> }
                </select>
              </label>
            </div>
            <h3>Unidades participantes</h3>
            @for (row of participants; track $index) {
              <div class="participant">
                <label>Unidad
                  <select [name]="'pu' + $index" [(ngModel)]="row.unitId">
                    <option [ngValue]="null">Seleccione…</option>
                    @for (unit of units(); track unit.id) { <option [ngValue]="unit.id">{{ unit.name }}{{ unit.isActive ? '' : ' (inactiva)' }}</option> }
                  </select>
                </label>
                <label>Función en el proceso<input [name]="'pf' + $index" maxlength="500" [(ngModel)]="row.function" /></label>
                <button class="quiet-button" type="button" (click)="removeParticipant($index)">Quitar</button>
              </div>
            }
            <button class="quiet-button" type="button" (click)="addParticipant()">Agregar unidad participante</button>
          </ui-section>

          @for (group of longGroups; track group) {
            <ui-section [heading]="group">
              <div class="form-grid">
                @for (field of longFieldsOf(group); track field.key) {
                  <label class="wide">{{ field.label }}<textarea [name]="field.key" rows="3" maxlength="4000" [(ngModel)]="values[field.key]"></textarea></label>
                }
              </div>
            </ui-section>
          }

          <div class="actions">
            <button class="primary-button" type="submit" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar proceso' }}</button>
            <a class="text-button" [routerLink]="editingId ? ['/procesos', editingId] : ['/procesos']">Cancelar</a>
          </div>
        </form>
      }
    </ui-panel>
  `
})
export class ProcessFormComponent implements OnInit {
  private readonly api = inject(MvpV14Api);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly types = signal<ProcessTypeItem[]>([]);
  readonly units = signal<Array<UnitItem | { id: number; name: string; isActive: boolean }>>([]);
  readonly processes = signal<ProcessListItem[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  editingId: number | null = null;
  macroprocessId: number | null = null;
  processTypeId: number | null = null;
  parentProcessId: number | null = null;
  responsibleUnitId: number | null = null;
  participants: ParticipantRow[] = [];
  values: Record<string, string> = {};
  readonly shortFields = FICHA_FIELDS.filter((field) => !field.long);
  readonly longGroups = [...new Set(FICHA_FIELDS.filter((field) => field.long).map((field) => field.group))];

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

  ngOnInit(): void {
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

  private failLoad(e: unknown): void { this.error.set(errorMessage(e)); this.loading.set(false); }

  private loadExisting(allUnits: UnitItem[]): void {
    if (this.editingId === null) { this.loading.set(false); return; }
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
      },
      error: (e) => this.failLoad(e)
    });
  }

  save(): void {
    if (!(this.values['name'] ?? '').trim()) { this.error.set('El nombre es obligatorio.'); return; }
    if (this.macroprocessId === null || this.processTypeId === null) { this.error.set('El macroproceso y el tipo de proceso son obligatorios.'); return; }
    if (this.participants.some((row) => row.unitId === null || !row.function.trim())) {
      this.error.set('Cada unidad participante requiere unidad y función.'); return;
    }
    const body: ProcessInput = {
      macroprocessId: this.macroprocessId,
      processTypeId: this.processTypeId,
      parentProcessId: this.parentProcessId,
      responsibleUnitId: this.responsibleUnitId,
      participants: this.participants.map((row) => ({ unitId: row.unitId as number, function: row.function }))
    };
    for (const field of [{ key: 'name' as FichaKey }, ...FICHA_FIELDS]) body[field.key] = (this.values[field.key] ?? '').trim();
    this.saving.set(true);
    const request = this.editingId === null ? this.api.createProcess(body) : this.api.updateProcess(this.editingId, body);
    request.subscribe({
      next: (result) => {
        const id = this.editingId ?? (result as { id: number }).id;
        void this.router.navigate(['/procesos', id]);
      },
      error: (e) => { this.error.set(errorMessage(e)); this.saving.set(false); }
    });
  }
}
