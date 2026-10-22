import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import {
  FICHA_FIELDS, MvpV14Api, ProcessDetail, ProcessListItem, ProcessUnit,
  RELATION_TYPES, RISK_LEVELS, RiskInput, errorMessage
} from './mvp-v14-api.service';
import {
  UiBadgeComponent, UiBreadcrumbsComponent, UiDialogService,
  UiMessageComponent, UiSectionComponent, type UiBadgeTone
} from './shared/ui';
import { LeavesWithConfirmation } from './unsaved-changes.guard';

const emptyRisk = (): RiskInput => ({ description: '', cause: '', consequence: '', type: '', level: '' });
const emptyRelation = (): { destinationProcessId: number | null; type: string; description: string } => ({ destinationProcessId: null, type: 'FLUJO', description: '' });

@Component({
  selector: 'app-process-detail',
  imports: [FormsModule, NgTemplateOutlet, RouterLink, UiBadgeComponent, UiBreadcrumbsComponent, UiMessageComponent, UiSectionComponent],
  styles: [`
    .top-nav-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--ui-space-3); gap: 1rem; }
    .top-nav-actions { display: inline-flex; align-items: center; gap: .75rem; }
    .edit-action-btn { min-height: 38px; padding: .4rem .9rem; font-size: var(--ui-font-size-sm); }
    .help-btn { display: inline-flex; align-items: center; gap: .45rem; min-height: 38px; padding: .45rem .9rem; background: var(--ui-color-surface); border: 1px solid var(--ui-color-border-strong); border-radius: var(--ui-radius-md); color: var(--ui-color-text); font-size: var(--ui-font-size-sm); font-weight: var(--ui-font-weight-medium); cursor: pointer; transition: all .15s ease-in-out; }
    .help-btn:hover { background: var(--ui-color-surface-accent); border-color: var(--ui-color-primary); color: var(--ui-color-primary); }
    .help-btn svg { color: var(--ui-color-text-subtle); flex-shrink: 0; }

    .hero-card { display: grid; grid-template-columns: 1fr 340px; gap: 2rem; align-items: start; padding: 1.75rem 2rem; background: var(--ui-color-surface); border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-xl); box-shadow: var(--ui-shadow-panel); margin-bottom: 1.5rem; }
    @media (max-width: 960px) { .hero-card { grid-template-columns: 1fr; gap: 1.5rem; padding: 1.5rem; } }
    .hero-main { min-width: 0; }
    .hero-eyebrow { display: inline-block; padding: .25rem .65rem; border-radius: var(--ui-radius-sm); background: var(--ui-color-surface-accent); color: var(--ui-color-eyebrow); font-size: .75rem; font-weight: var(--ui-font-weight-heavy); letter-spacing: .05em; text-transform: uppercase; margin-bottom: .6rem; }
    .hero-title { margin: 0 0 .5rem; font-size: var(--ui-font-size-display); font-weight: var(--ui-font-weight-heavy); color: var(--ui-color-heading); line-height: 1.25; }
    .accent-bar { width: 44px; height: 3px; background: var(--ui-color-map-support); border-radius: 2px; margin-bottom: .75rem; }
    .hero-status { display: flex; align-items: center; gap: .45rem; font-size: var(--ui-font-size-sm); color: var(--ui-color-text-subtle); margin-bottom: 1rem; }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--brand-yellow); flex-shrink: 0; }
    .hero-desc { color: var(--ui-color-text-muted); font-size: var(--ui-font-size-md); line-height: 1.55; margin: 0 0 1.5rem; }

    .trio-box { background: var(--ui-color-background); border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); padding: 1rem 1.25rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
    @media (max-width: 768px) { .trio-box { grid-template-columns: 1fr; gap: .85rem; } }
    .trio-item { min-width: 0; display: flex; flex-direction: column; gap: .3rem; }
    .trio-label { display: inline-flex; align-items: center; gap: .35rem; font-size: var(--ui-font-size-xs); font-weight: var(--ui-font-weight-heavy); letter-spacing: .05em; text-transform: uppercase; color: var(--ui-color-text-subtle); }
    .trio-value { font-size: var(--ui-font-size-md); font-weight: var(--ui-font-weight-bold); color: var(--ui-color-heading); overflow-wrap: anywhere; }
    .trio-link { color: var(--ui-color-heading); text-decoration: none; }
    .trio-link:hover { color: var(--ui-color-primary); text-decoration: underline; }
    .info-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background: none; border: 1px solid var(--ui-color-border-strong); color: var(--ui-color-text-subtle); font-size: 10px; font-weight: bold; cursor: pointer; padding: 0; line-height: 1; }
    .info-icon-btn:hover { border-color: var(--ui-color-primary); color: var(--ui-color-primary); }

    .risk-widget { padding: 1.25rem 1.4rem; border-radius: var(--ui-radius-lg); background: var(--ui-color-background); border: 1px solid var(--ui-color-border); }
    .risk-widget-top { display: flex; justify-content: space-between; align-items: flex-start; gap: .75rem; margin-bottom: 1rem; }
    .risk-title-group { display: flex; flex-direction: column; gap: .2rem; }
    .risk-label-row { display: inline-flex; align-items: center; gap: .35rem; font-size: var(--ui-font-size-sm); font-weight: var(--ui-font-weight-bold); color: var(--ui-color-heading); }
    .risk-subtitle { font-size: var(--ui-font-size-xs); color: var(--ui-color-text-subtle); }
    .risk-gauge { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: .85rem 0 .5rem; }
    .risk-gauge-seg { height: 8px; border-radius: var(--ui-radius-pill); background: var(--ui-color-border); transition: background .2s ease; }
    .risk-gauge-seg.active[data-level="Bajo"] { background: var(--ui-color-success-text); }
    .risk-gauge-seg.active[data-level="Medio"] { background: var(--brand-yellow); }
    .risk-gauge-seg.active[data-level="Alto"] { background: var(--brand-orange); }
    .risk-gauge-seg.active[data-level="Crítico"] { background: var(--ui-color-danger); }
    .risk-gauge-labels { display: grid; grid-template-columns: repeat(4, 1fr); text-align: center; gap: 6px; font-size: var(--ui-font-size-xs); }
    .risk-gauge-label { color: var(--ui-color-text-subtle); }
    .risk-gauge-label.active { color: var(--ui-color-heading); font-weight: var(--ui-font-weight-heavy); }

    .hierarchy-card { padding: 1rem 1.25rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); background: var(--ui-color-surface); margin-bottom: 1.5rem; }
    .hierarchy-card p { margin: 0 0 .5rem; }
    .hierarchy-card p:last-child { margin-bottom: 0; }

    /* Propósito del proceso */
    .purpose {
      margin: 1.5rem 0;
      padding: 1.35rem 1.75rem;
      background: var(--ui-color-surface);
      border: 1px solid var(--ui-color-border);
      border-left: 4px solid var(--brand-steel-blue);
      border-radius: var(--ui-radius-lg);
      box-shadow: var(--ui-shadow-panel);
    }
    .purpose h2 {
      margin: 0 0 .5rem;
      font-size: 1.15rem;
      font-weight: var(--ui-font-weight-heavy);
      color: var(--brand-steel-blue);
    }
    .purpose p {
      margin: 0;
      color: var(--ui-color-text-muted);
      font-size: var(--ui-font-size-md);
      line-height: 1.55;
      white-space: pre-line;
    }

    /* Gobernanza del proceso */
    .governance {
      padding: 1.75rem 2rem;
      background: var(--ui-color-surface);
      border: 1px solid var(--ui-color-border);
      border-radius: var(--ui-radius-xl);
      box-shadow: var(--ui-shadow-panel);
      margin-bottom: 1.5rem;
    }
    @media (max-width: 768px) { .governance { padding: 1.25rem; } }
    .governance-heading { margin: 0 0 .35rem; font-size: 1.25rem; font-weight: var(--ui-font-weight-heavy); color: var(--brand-steel-blue); }
    .governance-subheading { margin: 0 0 1.5rem; font-size: var(--ui-font-size-sm); color: var(--ui-color-text-muted); }

    .gov-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; align-items: stretch; }
    @media (max-width: 960px) { .gov-grid { grid-template-columns: 1fr; gap: 1rem; } }

    .gov-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.35rem 1.4rem;
      background: var(--ui-color-surface);
      border: 1px solid var(--ui-color-border);
      border-radius: var(--ui-radius-lg);
    }
    .gov-card-header { min-width: 0; }
    .gov-eyebrow {
      display: inline-block;
      font-size: .75rem;
      font-weight: var(--ui-font-weight-bold);
      color: var(--brand-steel-blue);
      letter-spacing: .06em;
      text-transform: uppercase;
      margin-bottom: .5rem;
    }
    .gov-title {
      font-size: 1.05rem;
      font-weight: var(--ui-font-weight-heavy);
      color: var(--ui-color-heading);
      margin: 0 0 .45rem;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .gov-desc {
      font-size: var(--ui-font-size-sm);
      color: var(--ui-color-text-muted);
      line-height: 1.5;
      margin: 0;
    }
    .gov-badge-row { margin-bottom: .5rem; }

    .gov-card-footer {
      padding-top: .75rem;
      border-top: 1px solid var(--ui-color-divider);
      display: flex;
      flex-direction: column;
      gap: .35rem;
      margin-top: auto;
    }
    .gov-meta-item { display: flex; flex-direction: column; gap: .2rem; font-size: var(--ui-font-size-xs); }
    .gov-meta-label { color: var(--ui-color-text-subtle); font-weight: var(--ui-font-weight-bold); text-transform: uppercase; letter-spacing: .04em; }
    .gov-meta-value { color: var(--ui-color-heading); font-weight: var(--ui-font-weight-medium); overflow-wrap: anywhere; }
    .gov-contact-item {
      display: inline-flex;
      align-items: center;
      gap: .45rem;
      font-size: var(--ui-font-size-xs);
      color: var(--ui-color-text-subtle);
    }
    .gov-contact-item svg {
      color: var(--ui-color-text-subtle);
      flex-shrink: 0;
    }

    .gov-pills-wrap { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .5rem; }
    .gov-participant-chip {
      display: inline-flex;
      flex-direction: column;
      gap: .25rem;
      max-width: 100%;
    }
    .participant-pill {
      display: inline-flex;
      align-items: center;
      gap: .45rem;
      padding: .4rem .85rem;
      background: var(--ui-color-surface);
      border: 1px solid var(--ui-color-border);
      border-radius: var(--ui-radius-pill);
      font-size: var(--ui-font-size-xs);
      color: var(--ui-color-text);
      font-weight: var(--ui-font-weight-medium);
      transition: border-color .15s ease;
    }
    .participant-pill:hover { border-color: var(--ui-color-border-strong); }
    .participant-func {
      margin: 0 0 0 .5rem;
      font-size: var(--ui-font-size-xs);
      color: var(--ui-color-text-subtle);
      line-height: 1.4;
    }
    .gov-empty {
      font-size: var(--ui-font-size-sm);
      color: var(--ui-color-text-subtle);
      margin: 0;
    }

    /* Campos técnicos */
    .field-grid { display: grid; grid-template-columns: 1fr; gap: .75rem 1.5rem; margin: 0; }
    .field-grid dt { font-weight: 700; color: var(--ui-color-text-muted); font-size: .85rem; }
    .field-grid dd { margin: 0 0 .5rem; white-space: pre-line; overflow-wrap: anywhere; }
    .item { border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); padding: .8rem; margin-bottom: .6rem; }
    .item header { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin-bottom: .4rem; }
    .item-actions { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .5rem; }
    .inline-form { display: grid; gap: .6rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); padding: .8rem; margin: .6rem 0; }
    .inline-form label { display: grid; gap: .25rem; font-weight: 600; }
    .inline-form input, .inline-form select, .inline-form textarea { padding: .45rem .6rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); font: inherit; }
    .row-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
    .information-cards { margin-top: 1.5rem; align-items: start; }
  `],
  template: `
    @if (error()) { <ui-message kind="error">{{ error() }}</ui-message> }
    @if (notice()) { <ui-message kind="success">{{ notice() }}</ui-message> }
    @if (detail(); as d) {
      <div class="top-nav-bar">
        <ui-breadcrumbs [items]="[
          { label: 'Mapa de procesos', link: '/mapa' },
          { label: d.macroprocess, link: '/mapa/macroprocesos/' + d.macroprocessId },
          { label: d.name }
        ]" />
        <div class="top-nav-actions">
          @if (d.status === 'Borrador' && auth.hasAnyProfile('ADMIN', 'PROCESS_OWNER')) {
            <a class="quiet-button edit-action-btn" [routerLink]="['/procesos', d.id, 'editar']">Editar</a>
            <button
              type="button"
              class="primary-button"
              [disabled]="submitting() || !d.completeness.complete"
              (click)="submitForReview(d.id)"
              [title]="!d.completeness.complete ? 'Complete los campos obligatorios antes de enviar a revisión' : 'Enviar ficha a validación técnica'"
            >
              Enviar a revisión
            </button>
          }
          @if (d.status === 'En revisión' && auth.hasAnyProfile('ADMIN', 'VALIDATOR')) {
            <button
              type="button"
              class="primary-button"
              [disabled]="submitting()"
              (click)="approveProcess(d.id)"
            >
              Aprobar proceso
            </button>
            <button
              type="button"
              class="quiet-button"
              [disabled]="submitting()"
              (click)="startReject()"
            >
              Rechazar con observaciones
            </button>
          }
          @if (d.status === 'Vigente') {
            @if (auth.hasAnyProfile('ADMIN', 'PROCESS_OWNER')) {
              <button
                type="button"
                class="quiet-button"
                [disabled]="submitting()"
                (click)="createNewVersion(d.id)"
              >
                Nueva versión (v{{ (d.versionNumber || 1) + 1 }})
              </button>
            }
            @if (auth.isAdmin()) {
              <button
                type="button"
                class="quiet-button"
                [disabled]="submitting()"
                (click)="retireProcess(d.id)"
              >
                Retirar proceso
              </button>
            }
          }
          <button type="button" class="help-btn" (click)="openHelp()" aria-label="Ayuda sobre este proceso">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>Ayuda</span>
          </button>
        </div>
      </div>

      @if (rejecting()) {
        <section class="inline-form" aria-labelledby="reject-title">
          <h2 id="reject-title" style="margin: 0; font-size: 1rem;">Observaciones de rechazo técnico (obligatorio)</h2>
          <label>Motivo u observaciones técnicas
            <textarea
              name="rejectionReason"
              rows="3"
              placeholder="Indique las observaciones técnicas para devolver el proceso a borrador..."
              [(ngModel)]="rejectionReason"
              required
            ></textarea>
          </label>
          <div class="row-actions">
            <button
              type="button"
              class="primary-button"
              [disabled]="submitting() || !rejectionReason.trim()"
              (click)="submitReject(d.id)"
            >
              Confirmar rechazo
            </button>
            <button type="button" class="quiet-button" (click)="cancelReject()">Cancelar</button>
          </div>
        </section>
      }
      @if (d.status === 'En revisión') {
        <ui-message kind="info">
          Este proceso se encuentra <strong>En revisión técnica</strong> por el Validador. La edición de campos queda bloqueada hasta su resolución.
        </ui-message>
      }
      @if (d.status === 'Obsoleto') {
        <ui-message kind="info">
          Esta versión del proceso se encuentra formalmente <strong>Obsoleta</strong> y ha sido retirada de la operación activa.
        </ui-message>
      }

      <header class="hero-card" aria-labelledby="process-title">
        <div class="hero-main">
          <span class="hero-eyebrow">PROCESO</span>
          <h1 id="process-title" class="hero-title">{{ d.name }}</h1>
          <div class="accent-bar" aria-hidden="true"></div>
          <div class="hero-status">
            <ui-badge [tone]="statusTone(d.status)">{{ d.status }}</ui-badge>
            <span>v{{ d.versionNumber || 1 }} · Código: {{ d.code }}</span>
            @if (d.versions && d.versions.length > 1) {
              <span class="helper">({{ d.versions.length }} versiones registradas)</span>
            }
          </div>
          <p class="hero-desc">{{ d.description || 'Sin descripción registrada.' }}</p>

          <div class="trio-box" aria-label="Clasificación y unidad responsable">
            <div class="trio-item">
              <div class="trio-label">
                <span>TIPO DE PROCESO</span>
                <button type="button" class="info-icon-btn" (click)="openProcessTypeHelp()" aria-label="Información de tipo de proceso">?</button>
              </div>
              <div class="trio-value">{{ d.processType }}</div>
            </div>
            <div class="trio-item">
              <div class="trio-label">
                <span>MACROPROCESO</span>
                <button type="button" class="info-icon-btn" (click)="openMacroprocessHelp()" aria-label="Información de macroproceso">?</button>
              </div>
              <div class="trio-value">
                <a class="trio-link" [routerLink]="['/mapa/macroprocesos', d.macroprocessId]">{{ d.macroprocess }}</a>
              </div>
            </div>
            <div class="trio-item">
              <div class="trio-label">
                <span>UNIDAD RESPONSABLE</span>
                <button type="button" class="info-icon-btn" (click)="openUnitHelp()" aria-label="Información de unidad responsable">?</button>
              </div>
              <div class="trio-value">{{ responsibleUnitName() }}</div>
            </div>
          </div>
        </div>

        <aside class="risk-widget" aria-label="Nivel de riesgo del proceso">
          <div class="risk-widget-top">
            <div class="risk-title-group">
              <div class="risk-label-row">
                <span>Nivel de riesgo</span>
                <button type="button" class="info-icon-btn" (click)="openRiskHelp()" aria-label="Información sobre nivel de riesgo">?</button>
              </div>
              <span class="risk-subtitle">Clasificación actual</span>
            </div>
            <ui-badge [tone]="currentRiskTone()">{{ currentRiskLevel() }}</ui-badge>
          </div>

          <div class="risk-gauge" role="meter" [attr.aria-valuenow]="currentRiskLevel()" aria-label="Nivel de riesgo del proceso">
            @for (level of levels; track level) {
              <div
                class="risk-gauge-seg"
                [class.active]="currentRiskLevel() === level"
                [attr.data-level]="level"
                [title]="level + (currentRiskLevel() === level ? ' (Actual)' : '')">
              </div>
            }
          </div>

          <div class="risk-gauge-labels" aria-hidden="true">
            @for (level of levels; track level) {
              <span class="risk-gauge-label" [class.active]="currentRiskLevel() === level">{{ level }}</span>
            }
          </div>
        </aside>
      </header>

      @if (!d.completeness.complete) {
        <ui-message kind="info">Faltan campos mínimos: {{ d.completeness.missing.join(', ') }}.</ui-message>
      }
      @if (d.possibleDuplicates.length > 0) {
        <ui-message kind="info">Posibles duplicados en la misma clasificación:
          @for (dup of d.possibleDuplicates; track dup.id) { <a [routerLink]="['/procesos', dup.id]">{{ dup.code }} · {{ dup.name }}</a>{{ $last ? '' : ', ' }} }
        </ui-message>
      }
      @if (d.parent || (d.subprocesses && d.subprocesses.length > 0)) {
        <div class="hierarchy-card">
          @if (d.parent) {
            <p>Proceso padre: <a [routerLink]="['/procesos', d.parent.id]">{{ d.parent.code }} · {{ d.parent.name }}</a></p>
          }
          @if (d.subprocesses && d.subprocesses.length > 0) {
            <p>Subprocesos:
              @for (sub of d.subprocesses; track sub.id) { <a [routerLink]="['/procesos', sub.id]">{{ sub.code }} · {{ sub.name }}</a>{{ $last ? '' : ', ' }} }
            </p>
          }
        </div>
      }

      <section class="purpose" aria-labelledby="purpose-title">
        <h2 id="purpose-title">Propósito del proceso</h2>
        <p>{{ d.objective || 'Sin información' }}</p>
      </section>

      <section class="governance" aria-labelledby="governance-title">
        <h2 id="governance-title" class="governance-heading">Gobernanza del proceso</h2>
        <p class="governance-subheading">Unidades y personas encargadas de ejecutar, coordinar y participar en el proceso.</p>

        <div class="gov-grid">
          <!-- Tarjeta 1: Unidad Responsable -->
          <article class="gov-card" aria-labelledby="gov-unit-resp-title">
            <div class="gov-card-header">
              <span class="gov-eyebrow">UNIDAD RESPONSABLE</span>
              <h3 id="gov-unit-resp-title" class="gov-title">{{ responsibleUnit()?.name || 'Sin unidad asignada' }}</h3>
              @if (responsibleUnit() && !responsibleUnit()!.isActive) {
                <div class="gov-badge-row"><ui-badge tone="warning">Inactiva</ui-badge></div>
              }
              <p class="gov-desc">
                {{ responsibleUnit()?.function || 'Responsable de coordinar la ejecución, seguimiento y actualización del proceso.' }}
              </p>
            </div>
            <div class="gov-card-footer">
              <div class="gov-contact-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                <span>contacto.unidad@entidad.gob</span>
              </div>
              <div class="gov-contact-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <span>Anexo institucional: 1234</span>
              </div>
            </div>
          </article>

          <!-- Tarjeta 2: Responsable del Proceso -->
          <article class="gov-card" aria-labelledby="gov-resp-person-title">
            <div class="gov-card-header">
              <span class="gov-eyebrow">RESPONSABLE DEL PROCESO</span>
              <h3 id="gov-resp-person-title" class="gov-title">{{ d.responsible || 'Sin información' }}</h3>
              <p class="gov-desc">Gestiona el levantamiento, análisis y consolidación de antecedentes institucionales.</p>
            </div>
            <div class="gov-card-footer">
              <div class="gov-contact-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                <span>responsable.proceso@entidad.gob</span>
              </div>
              <div class="gov-contact-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <span>Anexo institucional: 1235</span>
              </div>
              <div class="gov-meta-item">
                <span class="gov-meta-label">Elaborador:</span>
                <span class="gov-meta-value">{{ d.elaborator || 'Sin información' }}</span>
              </div>
            </div>
          </article>

          <!-- Tarjeta 3: Unidades Participantes -->
          <article class="gov-card" aria-labelledby="gov-part-units-title">
            <div class="gov-card-header">
              <span class="gov-eyebrow">UNIDADES PARTICIPANTES</span>
              <h3 id="gov-part-units-title" class="gov-title">Participación institucional</h3>
              <p class="gov-desc">Unidades que colaboran, proveen información o intervienen en las distintas etapas del proceso.</p>
            </div>
            <div class="gov-pills-wrap">
              @for (unit of participantUnits(); track unit.unitId) {
                <div class="gov-participant-chip">
                  <div class="participant-pill">
                    <span>{{ unit.name }}</span>
                    @if (!unit.isActive) {
                      <ui-badge tone="warning">Inactiva</ui-badge>
                    }
                  </div>
                  @if (unit.function) {
                    <p class="participant-func">{{ unit.function }}</p>
                  }
                </div>
              } @empty {
                <p class="gov-empty">Sin unidades participantes registradas.</p>
              }
            </div>
          </article>
        </div>
      </section>

      <div class="ui-card-grid information-cards">
      @for (group of groups; track group) {
        <section class="ui-info-card" [attr.aria-label]="group">
          <h3>{{ group }}</h3>
          <dl class="field-grid">
            @for (field of fieldsOf(group); track field.key) {
              <div><dt>{{ field.label }}</dt><dd>{{ d[field.key] || 'Sin información' }}</dd></div>
            }
          </dl>
        </section>
      }
      </div>

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
              @if (auth.hasAnyProfile('ADMIN', 'PROCESS_OWNER', 'RISK_MANAGER')) {
                <div class="item-actions">
                  <button class="quiet-button" type="button" (click)="editRisk(risk)">Editar</button>
                  <button class="danger-button" type="button" (click)="removeRisk(d.id, risk.id)">Eliminar</button>
                </div>
              }
            </article>
          }
        } @empty { <p class="helper">Sin riesgos registrados.</p> }
        @if (editingRisk() === 0) {
          <form class="inline-form" (ngSubmit)="saveRisk(d.id)" aria-label="Nuevo riesgo">
            <ng-container *ngTemplateOutlet="riskFields" />
            <div class="row-actions"><button class="primary-button" type="submit">Agregar riesgo</button>
              <button class="quiet-button" type="button" (click)="cancelRisk()">Cancelar</button></div>
          </form>
        } @else if (editingRisk() === null && auth.hasAnyProfile('ADMIN', 'PROCESS_OWNER', 'RISK_MANAGER')) {
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
              @if (auth.hasAnyProfile('ADMIN', 'PROCESS_OWNER')) {
                <div class="item-actions">
                  <button class="quiet-button" type="button" (click)="editRelation(rel.id, rel.type, rel.description)">Editar</button>
                  <button class="danger-button" type="button" (click)="removeRelation(d.id, rel.id)">Eliminar</button>
                </div>
              }
            </article>
          }
        } @empty { <p class="helper">Sin relaciones salientes.</p> }
        @if (editingRelation() === 0) {
          <form class="inline-form" (ngSubmit)="saveRelation(d.id)" aria-label="Nueva relación">
            <ng-container *ngTemplateOutlet="relationFields; context: { $implicit: true }" />
            <div class="row-actions"><button class="primary-button" type="submit">Agregar relación</button>
              <button class="quiet-button" type="button" (click)="cancelRelation()">Cancelar</button></div>
          </form>
        } @else if (editingRelation() === null && auth.hasAnyProfile('ADMIN', 'PROCESS_OWNER')) {
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
    } @else if (loading()) {
      <header class="hero-card">
        <p class="helper" role="status">Cargando información…</p>
      </header>
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
export class ProcessDetailComponent implements OnInit, LeavesWithConfirmation {
  private readonly api = inject(MvpV14Api);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogs = inject(UiDialogService);
  readonly auth = inject(AuthService);
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

  openHelp(): void {
    void this.dialogs.confirm({
      title: 'Ayuda sobre la ficha de proceso',
      message: 'Esta vista presenta la información integral del proceso seleccionado: propósito, gobernanza, nivel de riesgo, ficha técnica, riesgos asociados y relaciones operativas.',
      confirmLabel: 'Entendido'
    });
  }

  openRiskHelp(): void {
    void this.dialogs.confirm({
      title: 'Nivel de riesgo del proceso',
      message: 'Representa la mayor criticidad evaluada entre los riesgos registrados para este proceso (Bajo, Medio, Alto o Crítico).',
      confirmLabel: 'Entendido'
    });
  }

  openProcessTypeHelp(): void {
    void this.dialogs.confirm({
      title: 'Tipo de proceso',
      message: 'Clasificación temática o funcional del proceso dentro de su macroproceso institucional.',
      confirmLabel: 'Entendido'
    });
  }

  openMacroprocessHelp(): void {
    void this.dialogs.confirm({
      title: 'Macroproceso',
      message: 'Macroproceso al cual se encuentra adscrito y vinculado operativamente este proceso.',
      confirmLabel: 'Entendido'
    });
  }

  openUnitHelp(): void {
    void this.dialogs.confirm({
      title: 'Unidad responsable',
      message: 'Unidad técnica u organizacional encargada de la ejecución, control y actualización de este proceso.',
      confirmLabel: 'Entendido'
    });
  }

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

  private initialRiskSnapshot = '';
  private initialRelationSnapshot = '';

  private afterChange(id: number, message: string): void {
    this.error.set('');
    this.notice.set(message);
    this.editingRisk.set(null);
    this.editingRelation.set(null);
    this.load(id, true);
  }

  private fail(e: unknown): void { this.notice.set(''); this.error.set(errorMessage(e)); }

  newRisk(): void {
    this.risk = emptyRisk();
    this.initialRiskSnapshot = JSON.stringify(this.risk);
    this.editingRisk.set(0);
  }

  editRisk(item: RiskInput & { id: number }): void {
    this.risk = { description: item.description, cause: item.cause, consequence: item.consequence, type: item.type, level: item.level };
    this.initialRiskSnapshot = JSON.stringify(this.risk);
    this.editingRisk.set(item.id);
  }

  isRiskDirty(): boolean {
    if (this.editingRisk() === null) return false;
    return JSON.stringify(this.risk) !== this.initialRiskSnapshot;
  }

  async cancelRisk(): Promise<void> {
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
    const target = this.editingRisk();
    const request = target === 0 ? this.api.addRisk(processId, this.risk) : this.api.updateRisk(processId, target as number, this.risk);
    request.subscribe({ next: () => this.afterChange(processId, 'Riesgo guardado.'), error: (e) => this.fail(e) });
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
    this.api.deleteRisk(processId, riskId).subscribe({ next: () => this.afterChange(processId, 'Riesgo eliminado.'), error: (e) => this.fail(e) });
  }

  newRelation(processId: number): void {
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

  editRelation(id: number, type: string, description: string): void {
    this.relation = { destinationProcessId: null, type, description };
    this.initialRelationSnapshot = JSON.stringify(this.relation);
    this.editingRelation.set(id);
  }

  isRelationDirty(): boolean {
    if (this.editingRelation() === null) return false;
    return JSON.stringify(this.relation) !== this.initialRelationSnapshot;
  }

  async cancelRelation(): Promise<void> {
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
    const target = this.editingRelation();
    const { destinationProcessId, type, description } = this.relation;
    const request = target === 0
      ? this.api.addRelation(processId, { destinationProcessId: destinationProcessId ?? undefined, type, description })
      : this.api.updateRelation(processId, target as number, { type, description });
    request.subscribe({ next: () => this.afterChange(processId, 'Relación guardada.'), error: (e) => this.fail(e) });
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
    this.api.deleteRelation(processId, relationId).subscribe({ next: () => this.afterChange(processId, 'Relación eliminada.'), error: (e) => this.fail(e) });
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
    this.rejecting.set(true);
    this.rejectionReason = '';
  }

  cancelReject(): void {
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
    return this.isRiskDirty() || this.isRelationDirty() || (this.rejecting() && this.rejectionReason.trim() !== '');
  }

  async confirmLeave(): Promise<boolean> {
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
