import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import {
  FICHA_FIELDS, ProcessApi, ProcessDetail, ProcessListItem, ProcessUnit,
  RELATION_TYPES, RISK_LEVELS, RiskInput, errorMessage
} from './process-api.service';
import {
  UiBadgeComponent, UiBreadcrumbsComponent, UiCharCounterComponent, UiDialogService,
  UiMessageComponent, UiSectionComponent, type UiBadgeTone
} from '../../shared/ui';
import { LeavesWithConfirmation } from '../../core/auth/unsaved-changes.guard';
import { ProcessGovernanceComponent } from './process-governance.component';
import { ProcessNavigation } from './process-navigation.service';

const emptyRisk = (): RiskInput => ({ description: '', cause: '', consequence: '', type: '', level: '' });
const emptyRelation = (): { destinationProcessId: number | null; type: string; description: string } => ({ destinationProcessId: null, type: 'FLUJO', description: '' });

@Component({
  selector: 'app-process-detail',
  imports: [FormsModule, NgTemplateOutlet, RouterLink, UiBadgeComponent, UiBreadcrumbsComponent, UiCharCounterComponent, UiMessageComponent, UiSectionComponent, ProcessGovernanceComponent],
  styleUrl: './process-detail.component.css',
  templateUrl: './process-detail.component.html'
})
export class ProcessDetailComponent implements OnInit, LeavesWithConfirmation {
  private readonly api = inject(ProcessApi);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogs = inject(UiDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private loadGeneration = 0;
  readonly navigation = inject(ProcessNavigation);
  get returnUrl(): string | null { return this.navigation.resultsUrl(this.route.snapshot.queryParamMap.get('returnTo')); }
  readonly auth = inject(AuthService);
  readonly detail = signal<ProcessDetail | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly editingRisk = signal<number | null>(null);
  readonly editingRelation = signal<number | null>(null);
  readonly destinations = signal<ProcessListItem[]>([]);
  readonly groups = [...new Set(FICHA_FIELDS.map((field) => field.group))];
  readonly levels = RISK_LEVELS;
  readonly relationTypes = RELATION_TYPES;
  risk: RiskInput = emptyRisk();
  relation = emptyRelation();

  fieldsOf(group: string) { return FICHA_FIELDS.filter((field) => field.group === group && !['responsible', 'elaborator', 'objective'].includes(field.key)); }
  relationLabel(type: string): string { return RELATION_TYPES.find((item) => item.value === type)?.label ?? type; }
  riskTone(level: string): UiBadgeTone { return ({ Bajo: 'success', Medio: 'warning', Alto: 'danger', 'Crítico': 'critical' } as Record<string, UiBadgeTone>)[level] ?? 'neutral'; }

  currentRiskLevel(): string {
    const risks = this.detail()?.risks;
    if (!risks || risks.length === 0) return 'Sin clasificar';
    const order = ['Crítico', 'Alto', 'Medio', 'Bajo'];
    for (const lvl of order) {
      if (risks.some((r) => r.level === lvl)) return lvl;
    }
    return risks[0].level || 'Sin clasificar';
  }

  currentRiskTone(): UiBadgeTone {
    const level = this.currentRiskLevel();
    return this.riskTone(level);
  }

  responsibleUnit(): ProcessUnit | null {
    return this.detail()?.units?.find((u) => u.role === 'RESPONSABLE') ?? null;
  }

  participantUnits(): ProcessUnit[] {
    return this.detail()?.units?.filter((u) => u.role === 'PARTICIPANTE') ?? [];
  }

  responsibleUnitName(): string {
    const unit = this.responsibleUnit();
    if (unit) return unit.name;
    return this.detail()?.responsible || 'Sin información';
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => this.load(Number(params.get('id'))));
  }

  private load(id: number, keepNotice = false, silent = false): void {
    const generation = ++this.loadGeneration;
    if (!silent) this.loading.set(true);
    if (!keepNotice) this.notice.set('');
    this.api.process(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (detail) => {
        if (generation !== this.loadGeneration) return;
        this.saving.set(false);
        this.detail.set(detail);
        this.error.set('');
        this.loading.set(false);
      },
      error: (e) => {
        if (generation !== this.loadGeneration) return;
        this.saving.set(false);
        if (!silent) this.detail.set(null);
        this.error.set(errorMessage(e));
        this.loading.set(false);
      }
    });
  }

  private initialRiskSnapshot = '';
  private initialRelationSnapshot = '';

  private afterChange(id: number, message: string): void {
    this.error.set('');
    this.notice.set(message);
    this.load(id, true);
  }

  private fail(e: unknown): void { this.notice.set(''); this.error.set(errorMessage(e)); }

  async newRisk(): Promise<void> {
    if (this.saving()) return;
    if (this.isRiskDirty()) {
      const ok = await this.dialogs.confirm({
        title: 'Descartar cambios',
        message: 'Hay cambios sin guardar en el riesgo. ¿Deseas descartarlos?',
        confirmLabel: 'Descartar cambios',
        cancelLabel: 'Continuar editando',
        tone: 'danger'
      });
      if (!ok) return;
    }
    this.risk = emptyRisk();
    this.initialRiskSnapshot = JSON.stringify(this.risk);
    this.editingRisk.set(0);
  }

  async editRisk(item: RiskInput & { id: number }): Promise<void> {
    if (this.saving()) return;
    if (this.isRiskDirty() && this.editingRisk() !== item.id) {
      const ok = await this.dialogs.confirm({
        title: 'Descartar cambios',
        message: 'Hay cambios sin guardar en el riesgo. ¿Deseas descartarlos?',
        confirmLabel: 'Descartar cambios',
        cancelLabel: 'Continuar editando',
        tone: 'danger'
      });
      if (!ok) return;
    }
    this.risk = { description: item.description, cause: item.cause, consequence: item.consequence, type: item.type, level: item.level };
    this.initialRiskSnapshot = JSON.stringify(this.risk);
    this.editingRisk.set(item.id);
  }

  isRiskDirty(): boolean {
    if (this.editingRisk() === null) return false;
    return JSON.stringify(this.risk) !== this.initialRiskSnapshot;
  }

  async cancelRisk(): Promise<void> {
    if (this.saving()) return;
    if (this.isRiskDirty()) {
      const confirmed = await this.dialogs.confirm({
        title: 'Descartar riesgo',
        message: 'Hay cambios sin guardar en el riesgo. ¿Deseas descartarlos?',
        confirmLabel: 'Descartar cambios',
        cancelLabel: 'Continuar editando',
        tone: 'danger'
      });
      if (!confirmed) return;
    }
    this.editingRisk.set(null);
  }

  saveRisk(processId: number): void {
    if (this.saving()) return;
    const target = this.editingRisk();
    this.saving.set(true);
    const request = target === 0 ? this.api.addRisk(processId, this.risk) : this.api.updateRisk(processId, target as number, this.risk);
    request.subscribe({
      next: () => {
        this.editingRisk.set(null);
        this.error.set('');
        this.notice.set('Riesgo guardado.');
        this.load(processId, true, true);
      },
      error: (e) => {
        this.saving.set(false);
        this.fail(e);
      }
    });
  }

  async removeRisk(processId: number, riskId: number): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: 'Eliminar riesgo',
      message: '¿Confirmas la eliminación definitiva de este riesgo?',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      tone: 'danger'
    });
    if (!confirmed) return;
    this.api.deleteRisk(processId, riskId).subscribe({
      next: () => {
        this.editingRisk.set(null);
        this.afterChange(processId, 'Riesgo eliminado.');
      },
      error: (e) => this.fail(e)
    });
  }

  async newRelation(processId: number): Promise<void> {
    if (this.saving()) return;
    if (this.isRelationDirty()) {
      const ok = await this.dialogs.confirm({
        title: 'Descartar cambios',
        message: 'Hay cambios sin guardar en la relación. ¿Deseas descartarlos?',
        confirmLabel: 'Descartar cambios',
        cancelLabel: 'Continuar editando',
        tone: 'danger'
      });
      if (!ok) return;
    }
    this.relation = emptyRelation();
    this.initialRelationSnapshot = JSON.stringify(this.relation);
    this.editingRelation.set(0);
    if (this.destinations().length === 0) {
      this.api.listProcesses({}).subscribe({
        next: (items) => this.destinations.set(items.filter((item) => item.id !== processId)),
        error: (e) => this.fail(e)
      });
    }
  }

  async editRelation(id: number, type: string, description: string): Promise<void> {
    if (this.saving()) return;
    if (this.isRelationDirty() && this.editingRelation() !== id) {
      const ok = await this.dialogs.confirm({
        title: 'Descartar cambios',
        message: 'Hay cambios sin guardar en la relación. ¿Deseas descartarlos?',
        confirmLabel: 'Descartar cambios',
        cancelLabel: 'Continuar editando',
        tone: 'danger'
      });
      if (!ok) return;
    }
    this.relation = { destinationProcessId: null, type, description };
    this.initialRelationSnapshot = JSON.stringify(this.relation);
    this.editingRelation.set(id);
  }

  isRelationDirty(): boolean {
    if (this.editingRelation() === null) return false;
    return JSON.stringify(this.relation) !== this.initialRelationSnapshot;
  }

  async cancelRelation(): Promise<void> {
    if (this.saving()) return;
    if (this.isRelationDirty()) {
      const confirmed = await this.dialogs.confirm({
        title: 'Descartar relación',
        message: 'Hay cambios sin guardar en la relación. ¿Deseas descartarlos?',
        confirmLabel: 'Descartar cambios',
        cancelLabel: 'Continuar editando',
        tone: 'danger'
      });
      if (!confirmed) return;
    }
    this.editingRelation.set(null);
  }

  saveRelation(processId: number): void {
    if (this.saving()) return;
    const target = this.editingRelation();
    const { destinationProcessId, type, description } = this.relation;
    this.saving.set(true);
    const request = target === 0
      ? this.api.addRelation(processId, { destinationProcessId: destinationProcessId ?? undefined, type, description })
      : this.api.updateRelation(processId, target as number, { type, description });
    request.subscribe({
      next: () => {
        this.editingRelation.set(null);
        this.error.set('');
        this.notice.set('Relación guardada.');
        this.load(processId, true, true);
      },
      error: (e) => {
        this.saving.set(false);
        this.fail(e);
      }
    });
  }

  async removeRelation(processId: number, relationId: number): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: 'Eliminar relación',
      message: '¿Confirmas la eliminación definitiva de esta relación entre procesos?',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      tone: 'danger'
    });
    if (!confirmed) return;
    this.api.deleteRelation(processId, relationId).subscribe({
      next: () => {
        this.editingRelation.set(null);
        this.afterChange(processId, 'Relación eliminada.');
      },
      error: (e) => this.fail(e)
    });
  }

  readonly submitting = signal(false);
  readonly rejecting = signal(false);
  rejectionReason = '';

  statusTone(status: string): UiBadgeTone {
    switch (status) {
      case 'Vigente': return 'success';
      case 'En revisión': return 'info';
      case 'Borrador': return 'warning';
      case 'Obsoleto': return 'neutral';
      default: return 'neutral';
    }
  }

  async submitForReview(id: number): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Enviar a revisión',
      message: '¿Desea enviar este proceso a revisión técnica por el Validador? La ficha no podrá modificarse mientras permanezca en revisión.',
      confirmLabel: 'Enviar a revisión',
      cancelLabel: 'Volver a la ficha'
    });
    if (!ok) return;
    this.submitting.set(true);
    this.api.submitProcess(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notice.set('Proceso enviado a revisión exitosamente.');
        this.load(id, true);
      },
      error: (e) => {
        this.submitting.set(false);
        this.error.set(errorMessage(e));
      }
    });
  }

  async approveProcess(id: number): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Aprobar proceso',
      message: '¿Está seguro de aprobar este proceso y declararlo como versión Vigente institucional?',
      confirmLabel: 'Aprobar y publicar',
      cancelLabel: 'Cancelar'
    });
    if (!ok) return;
    this.submitting.set(true);
    this.api.approveProcess(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notice.set('El proceso ha sido aprobado y publicado como versión Vigente.');
        this.load(id, true);
      },
      error: (e) => {
        this.submitting.set(false);
        this.error.set(errorMessage(e));
      }
    });
  }

  startReject(): void {
    if (!this.rejecting()) {
      this.rejectionReason = '';
    }
    this.rejecting.set(true);
  }

  async cancelReject(): Promise<void> {
    if (this.rejectionReason.trim()) {
      const ok = await this.dialogs.confirm({
        title: 'Descartar observaciones',
        message: 'Hay observaciones ingresadas. ¿Deseas descartarlas?',
        confirmLabel: 'Descartar cambios',
        cancelLabel: 'Continuar editando',
        tone: 'danger'
      });
      if (!ok) return;
    }
    this.rejecting.set(false);
    this.rejectionReason = '';
  }

  submitReject(id: number): void {
    if (!this.rejectionReason.trim()) return;
    this.submitting.set(true);
    this.api.rejectProcess(id, this.rejectionReason.trim()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.rejecting.set(false);
        this.rejectionReason = '';
        this.notice.set('El proceso fue devuelto a estado Borrador con las observaciones técnicas registradas.');
        this.load(id, true);
      },
      error: (e) => {
        this.submitting.set(false);
        this.error.set(errorMessage(e));
      }
    });
  }

  async createNewVersion(id: number): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Crear nueva versión',
      message: 'Se creará un nuevo borrador como siguiente versión del proceso, conservando los datos de la versión vigente. ¿Desea continuar?',
      confirmLabel: 'Crear nueva versión',
      cancelLabel: 'Cancelar'
    });
    if (!ok) return;
    this.submitting.set(true);
    this.api.newVersion(id).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.notice.set(`Nueva versión ${res.versionNumber} creada en estado Borrador.`);
        this.load(id, true);
      },
      error: (e) => {
        this.submitting.set(false);
        this.error.set(errorMessage(e));
      }
    });
  }

  async retireProcess(id: number): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Retirar proceso',
      message: '¿Está seguro de retirar este proceso? La versión vigente pasará a estado Obsoleto.',
      confirmLabel: 'Retirar proceso',
      cancelLabel: 'Cancelar',
      tone: 'danger'
    });
    if (!ok) return;
    this.submitting.set(true);
    this.api.retireProcess(id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notice.set('El proceso ha sido formalmente retirado a estado Obsoleto.');
        this.load(id, true);
      },
      error: (e) => {
        this.submitting.set(false);
        this.error.set(errorMessage(e));
      }
    });
  }

  isDirty(): boolean {
    return this.saving() || this.submitting() || this.isRiskDirty() || this.isRelationDirty() || (this.rejecting() && this.rejectionReason.trim() !== '');
  }

  async confirmLeave(): Promise<boolean> {
    if (this.saving() || this.submitting()) return false;
    if (!this.isDirty()) return true;
    return await this.dialogs.confirm({
      title: 'Cambios no guardados',
      message: 'Hay modificaciones pendientes en el formulario de la ficha. Si sales ahora, se perderán los cambios ingresados.',
      confirmLabel: 'Descartar cambios',
      cancelLabel: 'Continuar editando',
      tone: 'danger'
    });
  }
}
