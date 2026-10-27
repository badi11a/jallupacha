import { Component, DestroyRef, ElementRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FICHA_FIELDS, FichaKey, ProcessApi, ProcessDetail, ProcessInput, ProcessListItem, ProcessTypeItem, UnitItem, errorMessage
} from './process-api.service';
import { UiBreadcrumbsComponent, UiCharCounterComponent, UiDialogService, UiMessageComponent, UiPanelComponent, UiSectionComponent, focusFirstInvalid } from '../../shared/ui';
import { ProcessNavigation } from './process-navigation.service';
import { LeavesWithConfirmation } from '../../core/auth/unsaved-changes.guard';
import { PendingChanges } from '../../core/platform';

interface ParticipantRow { unitId: number | null; function: string; }

@Component({
  selector: 'app-process-form',
  imports: [FormsModule, UiBreadcrumbsComponent, UiCharCounterComponent, UiMessageComponent, UiPanelComponent, UiSectionComponent],
  styleUrl: './process-form.component.css',
  templateUrl: './process-form.component.html'
})
export class ProcessFormComponent implements OnInit, LeavesWithConfirmation {
  private readonly api = inject(ProcessApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(UiDialogService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly navigation = inject(ProcessNavigation);
  private readonly destroyRef = inject(DestroyRef);
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
  values: Partial<Record<FichaKey, string>> = {};
  readonly shortFields = FICHA_FIELDS.filter((field) => !field.long);
  readonly longGroups = [...new Set(FICHA_FIELDS.filter((field) => field.long).map((field) => field.group))];

  private formReady = false;
  private readonly pendingChanges = new PendingChanges(() => this.readState());
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

  private readState() {
    return {
      macroprocessId: this.macroprocessId,
      processTypeId: this.processTypeId,
      parentProcessId: this.parentProcessId,
      responsibleUnitId: this.responsibleUnitId,
      participants: this.participants,
      values: this.values
    };
  }

  private takeSnapshot(): void {
    this.pendingChanges.reset();
    this.formReady = true;
  }

  isDirty(): boolean {
    if (this.savedSuccessfully || !this.formReady) return false;
    return this.pendingChanges.isDirty();
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
    this.formReady = false;
    this.loading.set(true); this.loadFailed.set(false); this.error.set('');
    this.returnUrl = this.navigation.resultsUrl(this.route.snapshot.queryParamMap.get('returnTo'));
    const id = this.route.snapshot.paramMap.get('id');
    this.editingId = id === null ? null : Number(id);
    forkJoin({ types: this.api.processTypes(), units: this.api.units(), processes: this.api.listProcesses({}),
      detail: this.editingId === null ? of(null) : this.api.process(this.editingId) })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ types, units, processes, detail }) => {
        this.types.set(types);
        this.units.set(units.filter(unit => unit.isActive));
        this.processes.set(processes);
        if (detail) this.applyExisting(detail, units);
        this.loading.set(false);
        this.takeSnapshot();
      },
      error: (e) => this.failLoad(e)
    });
  }

  private failLoad(e: unknown): void { this.formReady = false; this.error.set(errorMessage(e)); this.loadFailed.set(true); this.loading.set(false); }

  private applyExisting(detail: ProcessDetail, allUnits: UnitItem[]): void {
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
  }

  save(): void {
    if (this.saving() || this.loading() || !this.formReady) return;
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
