import { Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProcessApi, UnitItem, errorMessage } from '../processes/process-api.service';

import { UiBadgeComponent, UiBreadcrumbsComponent, UiDialogService, UiMessageComponent, UiPanelComponent, focusFirstInvalid } from '../../shared/ui';
import { LeavesWithConfirmation } from '../../core/auth/unsaved-changes.guard';

@Component({
  selector: 'app-units',
  imports: [FormsModule, UiBadgeComponent, UiBreadcrumbsComponent, UiMessageComponent, UiPanelComponent],
  styleUrl: './units.component.css',
  templateUrl: './units.component.html'
})
export class UnitsComponent implements OnInit, LeavesWithConfirmation {
  private readonly api = inject(ProcessApi);
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
