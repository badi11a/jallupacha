import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FICHA_FIELDS, MvpV14Api, ProcessDetail, ProcessListItem,   RELATION_TYPES, RISK_LEVELS, RiskInput, errorMessage
} from './mvp-v14-api.service';
import { UiBadgeComponent, UiBreadcrumbsComponent, UiMessageComponent, UiPanelComponent, UiSectionComponent, type UiBadgeTone } from './shared/ui';

const emptyRisk = (): RiskInput => ({ description: '', cause: '', consequence: '', type: '', level: '' });
const emptyRelation = (): { destinationProcessId: number | null; type: string; description: string } => ({ destinationProcessId: null, type: 'FLUJO', description: '' });

@Component({
  selector: 'app-process-detail',
  imports: [FormsModule, NgTemplateOutlet, RouterLink, UiBadgeComponent, UiBreadcrumbsComponent, UiMessageComponent, UiPanelComponent, UiSectionComponent],
  styles: [`
    .field-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: .75rem 1.5rem; margin: 0; }
    .field-grid dt { font-weight: 700; color: var(--ui-color-text-muted); font-size: .85rem; }
    .field-grid dd { margin: 0 0 .5rem; white-space: pre-line; }
    .item { border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); padding: .8rem; margin-bottom: .6rem; }
    .item header { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin-bottom: .4rem; }
    .item-actions { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .5rem; }
    .inline-form { display: grid; gap: .6rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); padding: .8rem; margin: .6rem 0; }
    .inline-form label { display: grid; gap: .25rem; font-weight: 600; }
    .inline-form input, .inline-form select, .inline-form textarea { padding: .45rem .6rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); font: inherit; }
    .row-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
    .links { display: flex; flex-wrap: wrap; gap: .75rem; }
  `],
  template: `
    @if (error()) { <ui-message kind="error">{{ error() }}</ui-message> }
    @if (notice()) { <ui-message kind="success">{{ notice() }}</ui-message> }
    @if (detail(); as d) {
      <ui-breadcrumbs [items]="[{ label: 'Procesos', link: '/procesos' }, { label: d.code }]" />
      <ui-panel headingId="process-title" eyebrow="FICHA DE PROCESO" [heading]="d.code + ' · ' + d.name">
        <span panelActions class="row-actions">
          <a class="primary-button" [routerLink]="['/procesos', d.id, 'editar']">Editar ficha</a>
          <a class="text-button" routerLink="/mapa">Volver al mapa</a>
        </span>
        <p class="helper">{{ d.macroprocessType }} › {{ d.macroprocess }} › {{ d.processType }}
          <ui-badge tone="info">{{ d.status }}</ui-badge></p>
        @if (d.completeness.complete) {
          <ui-message kind="success">La ficha tiene los campos mínimos completos.</ui-message>
        } @else {
          <ui-message kind="info">Faltan campos mínimos: {{ d.completeness.missing.join(', ') }}.</ui-message>
        }
        @if (d.possibleDuplicates.length > 0) {
          <ui-message kind="info">Posibles duplicados en la misma clasificación:
            @for (dup of d.possibleDuplicates; track dup.id) { <a [routerLink]="['/procesos', dup.id]">{{ dup.code }} · {{ dup.name }}</a>{{ $last ? '' : ', ' }} }
          </ui-message>
        }
        @if (d.parent) {
          <p>Proceso padre: <a [routerLink]="['/procesos', d.parent.id]">{{ d.parent.code }} · {{ d.parent.name }}</a></p>
        }
        @if (d.subprocesses.length > 0) {
          <p>Subprocesos:
            @for (sub of d.subprocesses; track sub.id) { <a [routerLink]="['/procesos', sub.id]">{{ sub.code }} · {{ sub.name }}</a>{{ $last ? '' : ', ' }} }
          </p>
        }

        @for (group of groups; track group) {
          <ui-section [heading]="group">
            <dl class="field-grid">
              @for (field of fieldsOf(group); track field.key) {
                <div><dt>{{ field.label }}</dt><dd>{{ d[field.key] || 'Sin información' }}</dd></div>
              }
            </dl>
          </ui-section>
        }

        <ui-section heading="Unidades internas">
          @for (unit of d.units; track unit.unitId) {
            <p><strong>{{ unit.name }}</strong>
              <ui-badge [tone]="unit.role === 'RESPONSABLE' ? 'success' : 'neutral'">{{ unit.role === 'RESPONSABLE' ? 'Responsable' : 'Participante' }}</ui-badge>
              @if (!unit.isActive) { <ui-badge tone="warning">Inactiva</ui-badge> }
              @if (unit.function) { <span class="helper"> · {{ unit.function }}</span> }</p>
          } @empty { <p class="helper">Sin unidades asociadas.</p> }
        </ui-section>

        <ui-section heading="Riesgos">
          @for (risk of d.risks; track risk.id) {
            @if (editingRisk() === risk.id) {
              <form class="inline-form" (ngSubmit)="saveRisk(d.id)" [attr.aria-label]="'Editar riesgo'">
                <ng-container *ngTemplateOutlet="riskFields" />
                <div class="row-actions"><button class="primary-button" type="submit">Guardar riesgo</button>
                  <button class="quiet-button" type="button" (click)="cancelRisk()">Cancelar</button></div>
              </form>
            } @else {
              <article class="item">
                <header><ui-badge [tone]="riskTone(risk.level)">{{ risk.level }}</ui-badge><strong>{{ risk.type }}</strong></header>
                <p>{{ risk.description }}</p>
                <p class="helper"><strong>Causa:</strong> {{ risk.cause }} · <strong>Consecuencia:</strong> {{ risk.consequence }}</p>
                <div class="item-actions">
                  <button class="quiet-button" type="button" (click)="editRisk(risk)">Editar</button>
                  <button class="danger-button" type="button" (click)="removeRisk(d.id, risk.id)">Eliminar</button>
                </div>
              </article>
            }
          } @empty { <p class="helper">Sin riesgos registrados.</p> }
          @if (editingRisk() === 0) {
            <form class="inline-form" (ngSubmit)="saveRisk(d.id)" aria-label="Nuevo riesgo">
              <ng-container *ngTemplateOutlet="riskFields" />
              <div class="row-actions"><button class="primary-button" type="submit">Agregar riesgo</button>
                <button class="quiet-button" type="button" (click)="cancelRisk()">Cancelar</button></div>
            </form>
          } @else if (editingRisk() === null) {
            <button class="quiet-button" type="button" (click)="newRisk()">Agregar riesgo</button>
          }
        </ui-section>

        <ui-section heading="Relaciones con otros procesos">
          <h3>Salientes</h3>
          @for (rel of d.relations.outgoing; track rel.id) {
            @if (editingRelation() === rel.id) {
              <form class="inline-form" (ngSubmit)="saveRelation(d.id)" aria-label="Editar relación">
                <p><strong>{{ rel.code }} · {{ rel.name }}</strong></p>
                <ng-container *ngTemplateOutlet="relationFields; context: { $implicit: false }" />
                <div class="row-actions"><button class="primary-button" type="submit">Guardar relación</button>
                  <button class="quiet-button" type="button" (click)="cancelRelation()">Cancelar</button></div>
              </form>
            } @else {
              <article class="item">
                <header><ui-badge tone="info">{{ relationLabel(rel.type) }}</ui-badge>
                  <a [routerLink]="['/procesos', rel.processId]">{{ rel.code }} · {{ rel.name }}</a></header>
                <p>{{ rel.description }}</p>
                <div class="item-actions">
                  <button class="quiet-button" type="button" (click)="editRelation(rel.id, rel.type, rel.description)">Editar</button>
                  <button class="danger-button" type="button" (click)="removeRelation(d.id, rel.id)">Eliminar</button>
                </div>
              </article>
            }
          } @empty { <p class="helper">Sin relaciones salientes.</p> }
          @if (editingRelation() === 0) {
            <form class="inline-form" (ngSubmit)="saveRelation(d.id)" aria-label="Nueva relación">
              <ng-container *ngTemplateOutlet="relationFields; context: { $implicit: true }" />
              <div class="row-actions"><button class="primary-button" type="submit">Agregar relación</button>
                <button class="quiet-button" type="button" (click)="cancelRelation()">Cancelar</button></div>
            </form>
          } @else if (editingRelation() === null) {
            <button class="quiet-button" type="button" (click)="newRelation(d.id)">Agregar relación</button>
          }
          <h3>Entrantes</h3>
          @for (rel of d.relations.incoming; track rel.id) {
            <article class="item">
              <header><ui-badge tone="info">{{ relationLabel(rel.type) }}</ui-badge>
                <a [routerLink]="['/procesos', rel.processId]">{{ rel.code }} · {{ rel.name }}</a></header>
              <p>{{ rel.description }}</p>
            </article>
          } @empty { <p class="helper">Sin relaciones entrantes.</p> }
        </ui-section>
      </ui-panel>
    } @else if (loading()) {
      <ui-panel headingId="process-title" eyebrow="FICHA DE PROCESO" heading="Proceso">
        <p class="helper" role="status">Cargando información…</p>
      </ui-panel>
    }

    <ng-template #riskFields>
      <label>Descripción del riesgo<textarea name="description" rows="2" maxlength="4000" [(ngModel)]="risk.description"></textarea></label>
      <label>Causa<textarea name="cause" rows="2" maxlength="4000" [(ngModel)]="risk.cause"></textarea></label>
      <label>Consecuencia<textarea name="consequence" rows="2" maxlength="4000" [(ngModel)]="risk.consequence"></textarea></label>
      <label>Tipo de riesgo<input name="type" maxlength="120" [(ngModel)]="risk.type" /></label>
      <label>Nivel de riesgo
        <select name="level" [(ngModel)]="risk.level">
          <option value="">Seleccione…</option>
          @for (level of levels; track level) { <option [value]="level">{{ level }}</option> }
        </select>
      </label>
    </ng-template>

    <ng-template #relationFields let-isNew>
      @if (isNew) {
        <label>Proceso de destino
          <select name="destination" [(ngModel)]="relation.destinationProcessId">
            <option [ngValue]="null">Seleccione…</option>
            @for (option of destinations(); track option.id) { <option [ngValue]="option.id">{{ option.code }} · {{ option.name }}</option> }
          </select>
        </label>
      }
      <label>Tipo de relación
        <select name="relationType" [(ngModel)]="relation.type">
          @for (type of relationTypes; track type.value) { <option [value]="type.value">{{ type.label }}</option> }
        </select>
      </label>
      <label>Descripción<textarea name="relationDescription" rows="2" maxlength="4000" [(ngModel)]="relation.description"></textarea></label>
    </ng-template>
  `
})
export class ProcessDetailComponent implements OnInit {
  private readonly api = inject(MvpV14Api);
  private readonly route = inject(ActivatedRoute);
  readonly detail = signal<ProcessDetail | null>(null);
  readonly loading = signal(true);
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

  fieldsOf(group: string) { return FICHA_FIELDS.filter((field) => field.group === group); }
  relationLabel(type: string): string { return RELATION_TYPES.find((item) => item.value === type)?.label ?? type; }
  riskTone(level: string): UiBadgeTone { return ({ Bajo: 'success', Medio: 'warning', Alto: 'danger', 'Crítico': 'critical' } as Record<string, UiBadgeTone>)[level] ?? 'neutral'; }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => this.load(Number(params.get('id'))));
  }

  private load(id: number, keepNotice = false): void {
    this.loading.set(true);
    if (!keepNotice) this.notice.set('');
    this.api.process(id).subscribe({
      next: (detail) => { this.detail.set(detail); this.error.set(''); this.loading.set(false); },
      error: (e) => { this.detail.set(null); this.error.set(errorMessage(e)); this.loading.set(false); }
    });
  }

  private afterChange(id: number, message: string): void {
    this.error.set('');
    this.notice.set(message);
    this.cancelRisk();
    this.cancelRelation();
    this.load(id, true);
  }

  private fail(e: unknown): void { this.notice.set(''); this.error.set(errorMessage(e)); }

  newRisk(): void { this.risk = emptyRisk(); this.editingRisk.set(0); }
  editRisk(item: RiskInput & { id: number }): void {
    this.risk = { description: item.description, cause: item.cause, consequence: item.consequence, type: item.type, level: item.level };
    this.editingRisk.set(item.id);
  }
  cancelRisk(): void { this.editingRisk.set(null); }
  saveRisk(processId: number): void {
    const target = this.editingRisk();
    const request = target === 0 ? this.api.addRisk(processId, this.risk) : this.api.updateRisk(processId, target as number, this.risk);
    request.subscribe({ next: () => this.afterChange(processId, 'Riesgo guardado.'), error: (e) => this.fail(e) });
  }
  removeRisk(processId: number, riskId: number): void {
    if (!confirm('¿Eliminar este riesgo?')) return;
    this.api.deleteRisk(processId, riskId).subscribe({ next: () => this.afterChange(processId, 'Riesgo eliminado.'), error: (e) => this.fail(e) });
  }

  newRelation(processId: number): void {
    this.relation = emptyRelation();
    this.editingRelation.set(0);
    if (this.destinations().length === 0) {
      this.api.listProcesses({}).subscribe({
        next: (items) => this.destinations.set(items.filter((item) => item.id !== processId)),
        error: (e) => this.fail(e)
      });
    }
  }
  editRelation(id: number, type: string, description: string): void {
    this.relation = { destinationProcessId: null, type, description };
    this.editingRelation.set(id);
  }
  cancelRelation(): void { this.editingRelation.set(null); }
  saveRelation(processId: number): void {
    const target = this.editingRelation();
    const { destinationProcessId, type, description } = this.relation;
    const request = target === 0
      ? this.api.addRelation(processId, { destinationProcessId: destinationProcessId ?? undefined, type, description })
      : this.api.updateRelation(processId, target as number, { type, description });
    request.subscribe({ next: () => this.afterChange(processId, 'Relación guardada.'), error: (e) => this.fail(e) });
  }
  removeRelation(processId: number, relationId: number): void {
    if (!confirm('¿Eliminar esta relación?')) return;
    this.api.deleteRelation(processId, relationId).subscribe({ next: () => this.afterChange(processId, 'Relación eliminada.'), error: (e) => this.fail(e) });
  }
}
