import { Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProcessApi, ProcessTypeItem, errorMessage } from '../processes/process-api.service';

import { UiBadgeComponent, UiBreadcrumbsComponent, UiDialogService, UiMessageComponent, UiPanelComponent, focusFirstInvalid } from '../../shared/ui';
import { LeavesWithConfirmation } from '../../core/auth/unsaved-changes.guard';

@Component({
  selector: 'app-process-types',
  imports: [FormsModule, UiBadgeComponent, UiBreadcrumbsComponent, UiMessageComponent, UiPanelComponent],
  styleUrl: './process-types.component.css',
  templateUrl: './process-types.component.html'
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
