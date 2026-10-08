import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, OnInit, Signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ROUTER_OUTLET_DATA, Router, RouterLink } from '@angular/router';
import { combineLatest, firstValueFrom } from 'rxjs';
import { ProcessOutletData, canReadRisks, canRegisterRisks, compareRiskLevels, riskLevelTone } from './access';
import {
  UiBadgeComponent,
  UiBreadcrumb,
  UiBreadcrumbsComponent,
  UiCharCountState,
  UiCharCounterComponent,
  UiDialogService,
  UiMessageComponent,
  UiPaginationComponent,
  UiPanelComponent,
  UiSectionComponent,
  charCountState,
  countCharacters
} from './shared/ui';
import { LeavesWithConfirmation } from './unsaved-changes.guard';

// Contratos de docs/release01_navegable.md («Contratos API para la vista»).
interface ProcessHeader {
  id: number;
  code: string;
  name: string | null;
  ownerUserId: number;
  macroprocessId: number;
  macroprocessName: string;
}

interface Risk {
  id: number;
  description: string;
  cause: string;
  consequence: string;
  riskTypeName: string;
  riskLevelName: string;
  createdAt: string;
}

interface RiskPage {
  items: Risk[];
  total: number;
  page: number;
  limit: number;
}

interface RiskListValue {
  id: number;
  name: string;
  isActive: number;
}

type RiskTextKey = 'description' | 'cause' | 'consequence';

interface RiskDraft {
  description: string;
  cause: string;
  consequence: string;
  riskTypeId: number | null;
  riskLevelId: number | null;
}

const RISK_TEXT_FIELDS: { key: RiskTextKey; label: string }[] = [
  { key: 'description', label: 'Descripción' },
  { key: 'cause', label: 'Causa' },
  { key: 'consequence', label: 'Consecuencia' }
];
const RISK_TEXT_MAX = 10000;
const PAGE_SIZE = 100;
// Mismo criterio que el servidor (CreateRiskDto): no se admite marcado HTML.
const HTML_MARKUP = /<\/?[a-z][^>]*>/i;
const EMPTY_RISK: RiskDraft = { description: '', cause: '', consequence: '', riskTypeId: null, riskLevelId: null };

@Component({
  selector: 'app-process-risks',
  imports: [
    DatePipe, FormsModule, RouterLink, UiBadgeComponent, UiBreadcrumbsComponent, UiCharCounterComponent,
    UiMessageComponent, UiPaginationComponent, UiPanelComponent, UiSectionComponent
  ],
  template: `
    <ui-panel class="process-panel" headingId="risks-title" eyebrow="RIESGOS DEL PROCESO" [heading]="heading">
      @if (breadcrumbs.length) {
        <ui-breadcrumbs panelLead label="Ubicación en el mapa" [items]="breadcrumbs" />
      }
      @if (process) {
        <a panelActions class="text-button" [routerLink]="['/procesos', process.id]">Volver a la ficha</a>
      }
      @if (error) { <ui-message kind="error">{{ error }}</ui-message> }
      @if (notice) { <ui-message kind="success">{{ notice }}</ui-message> }

      @if (loading) {
        <p class="helper" role="status">Cargando riesgos…</p>
      } @else if (allowed) {
        <ul class="risk-list">
          @for (risk of risks; track risk.id) {
            <li class="risk-item">
              <div class="risk-item-heading">
                <ui-badge [tone]="levelTone(risk.riskLevelName)">Nivel {{ risk.riskLevelName }}</ui-badge>
                <span class="helper">{{ risk.riskTypeName }}</span>
              </div>
              <dl class="process-details">
                <dt>Descripción</dt><dd>{{ risk.description }}</dd>
                <dt>Causa</dt><dd>{{ risk.cause }}</dd>
                <dt>Consecuencia</dt><dd>{{ risk.consequence }}</dd>
                <dt>Registrado (UTC)</dt><dd>{{ risk.createdAt | date:'yyyy-MM-dd HH:mm':'UTC' }}</dd>
              </dl>
            </li>
          } @empty {
            <li class="helper">Este proceso no tiene riesgos registrados.</li>
          }
        </ul>
        @if (total > pageSize) {
          <ui-pagination [page]="page" [pageSize]="pageSize" [total]="total" itemLabel="riesgos"
            [disabled]="busy" (pageChange)="changePage($event)" />
        }

        @if (canRegister) {
          <ui-section heading="Registrar riesgo">
            <form class="process-editor" novalidate (ngSubmit)="register()">
              <p class="visually-hidden" aria-live="polite">{{ lengthAnnouncement }}</p>
              <div class="process-field-grid">
                <div class="field">
                  <label for="risk-type">Tipo de riesgo</label>
                  <select id="risk-type" name="riskTypeId" [(ngModel)]="draft.riskTypeId" (ngModelChange)="revalidate()"
                    aria-required="true" [attr.aria-invalid]="errors['riskTypeId'] ? 'true' : null"
                    [attr.aria-describedby]="errors['riskTypeId'] ? 'risk-type-error' : null">
                    <option [ngValue]="null" disabled>Seleccione un tipo</option>
                    @for (type of riskTypes; track type.id) { <option [ngValue]="type.id">{{ type.name }}</option> }
                  </select>
                  @if (errors['riskTypeId']) { <p class="field-error" id="risk-type-error">{{ errors['riskTypeId'] }}</p> }
                </div>
                <div class="field">
                  <label for="risk-level">Nivel de riesgo</label>
                  <select id="risk-level" name="riskLevelId" [(ngModel)]="draft.riskLevelId" (ngModelChange)="revalidate()"
                    aria-required="true" [attr.aria-invalid]="errors['riskLevelId'] ? 'true' : null"
                    [attr.aria-describedby]="errors['riskLevelId'] ? 'risk-level-error' : null">
                    <option [ngValue]="null" disabled>Seleccione un nivel</option>
                    @for (level of riskLevels; track level.id) { <option [ngValue]="level.id">{{ level.name }}</option> }
                  </select>
                  @if (errors['riskLevelId']) { <p class="field-error" id="risk-level-error">{{ errors['riskLevelId'] }}</p> }
                </div>
                @for (field of textFields; track field.key) {
                  <div class="field process-field-wide">
                    <label [for]="'risk-' + field.key">{{ field.label }}</label>
                    <textarea [id]="'risk-' + field.key" [name]="field.key" rows="3" aria-required="true"
                      [attr.aria-invalid]="errors[field.key] ? 'true' : null" [attr.aria-describedby]="describedBy(field.key)"
                      [ngModel]="draft[field.key]" (ngModelChange)="setText(field, $event)"></textarea>
                    <ui-char-counter [id]="'risk-' + field.key + '-count'" [value]="draft[field.key]" [max]="textMax" />
                    @if (errors[field.key]) { <p class="field-error" [id]="'risk-' + field.key + '-error'">{{ errors[field.key] }}</p> }
                  </div>
                }
              </div>
              <div>
                <button class="primary-button" type="submit" [disabled]="busy">{{ busy ? 'Guardando…' : 'Registrar riesgo' }}</button>
              </div>
            </form>
          </ui-section>
        }
      }
    </ui-panel>
  `
})
export class ProcessRisksComponent implements OnInit, LeavesWithConfirmation {
  readonly textFields = RISK_TEXT_FIELDS;
  readonly textMax = RISK_TEXT_MAX;
  readonly pageSize = PAGE_SIZE;
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(UiDialogService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly session = inject(ROUTER_OUTLET_DATA) as Signal<ProcessOutletData>;
  process: ProcessHeader | null = null;
  risks: Risk[] = [];
  riskTypes: RiskListValue[] = [];
  riskLevels: RiskListValue[] = [];
  draft: RiskDraft = { ...EMPTY_RISK };
  errors: Record<string, string> = {};
  lengthAnnouncement = '';
  page = 1;
  total = 0;
  allowed = false;
  loading = true;
  busy = false;
  error = '';
  notice = '';
  private submitted = false;
  private lengthStates: Record<string, UiCharCountState> = {};
  private destroyed = false;

  get canRegister(): boolean {
    return canRegisterRisks(this.session());
  }

  get heading(): string {
    return this.process ? `${this.process.code} · ${this.process.name || 'Sin nombre'}` : 'Riesgos';
  }

  get breadcrumbs(): UiBreadcrumb[] {
    if (!this.process) return [];
    return [
      { label: 'Mapa de procesos', link: '/mapa' },
      { label: this.process.macroprocessName, link: ['/mapa/macroprocesos', this.process.macroprocessId] },
      { label: this.heading, link: ['/procesos', this.process.id] },
      { label: 'Riesgos' }
    ];
  }

  get hasUnsavedChanges(): boolean {
    return JSON.stringify(this.draft) !== JSON.stringify(EMPTY_RISK);
  }

  levelTone = riskLevelTone;

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => (this.destroyed = true));
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, query]) => void this.load(params.get('id'), query.get('pagina')));
  }

  confirmLeave(): boolean | Promise<boolean> {
    if (!this.hasUnsavedChanges) return true;
    return this.dialogs.confirm({
      title: 'Cambios sin guardar',
      message: 'El riesgo tiene datos sin registrar. ¿Salir sin guardarlos?',
      confirmLabel: 'Salir sin guardar',
      cancelLabel: 'Seguir editando',
      tone: 'danger'
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hasUnsavedChanges) return;
    event.preventDefault();
    event.returnValue = '';
  }

  async changePage(page: number): Promise<void> {
    await this.router.navigate([], { relativeTo: this.route, queryParams: { pagina: page > 1 ? page : null } });
  }

  describedBy(key: RiskTextKey): string | null {
    const ids = [
      (this.lengthStates[key] ?? 'ok') !== 'ok' ? `risk-${key}-count` : '',
      this.errors[key] ? `risk-${key}-error` : ''
    ].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  }

  setText(field: { key: RiskTextKey; label: string }, value: string): void {
    this.draft = { ...this.draft, [field.key]: value ?? '' };
    const length = countCharacters(this.draft[field.key]);
    const state = charCountState(length, RISK_TEXT_MAX);
    if (state !== (this.lengthStates[field.key] ?? 'ok')) {
      this.lengthStates[field.key] = state;
      this.lengthAnnouncement = state === 'over'
        ? `${field.label}: supera el máximo de 10.000 caracteres.`
        : state === 'near'
          ? `${field.label}: quedan ${(RISK_TEXT_MAX - length).toLocaleString('es-CL')} caracteres.`
          : '';
    }
    this.revalidate();
  }

  revalidate(): void {
    if (this.submitted) this.validate();
  }

  async register(): Promise<void> {
    if (!this.process) return;
    this.submitted = true;
    this.notice = '';
    if (!this.validate()) {
      this.refresh();
      this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    this.busy = true;
    this.error = '';
    try {
      await firstValueFrom(this.http.post(`/api/processes/${this.process.id}/risks`, {
        description: this.draft.description.trim(),
        cause: this.draft.cause.trim(),
        consequence: this.draft.consequence.trim(),
        riskTypeId: this.draft.riskTypeId,
        riskLevelId: this.draft.riskLevelId
      }));
      this.draft = { ...EMPTY_RISK };
      this.errors = {};
      this.submitted = false;
      this.lengthStates = {};
      await this.loadRisks();
      this.notice = 'Riesgo registrado.';
    } catch (error: unknown) {
      this.error = this.messageFor(error, 'No fue posible registrar el riesgo.');
    } finally {
      this.busy = false;
      this.refresh();
    }
  }

  private async load(idParam: string | null, pageParam: string | null): Promise<void> {
    this.error = '';
    this.page = positiveInteger(pageParam) ?? 1;
    try {
      const id = positiveInteger(idParam);
      if (id === null) throw new HttpErrorResponse({ status: 404 });
      if (!this.process || this.process.id !== id) {
        this.process = await firstValueFrom(this.http.get<ProcessHeader>(`/api/processes/${id}`));
      }
      this.allowed = canReadRisks(this.session(), this.process.ownerUserId);
      if (!this.allowed) throw new HttpErrorResponse({ status: 403 });
      await this.loadRisks();
      if (this.canRegister && !this.riskTypes.length) {
        const [types, levels] = await Promise.all([
          firstValueFrom(this.http.get<{ items: RiskListValue[] }>('/api/risk-types')),
          firstValueFrom(this.http.get<{ items: RiskListValue[] }>('/api/risk-levels'))
        ]);
        this.riskTypes = types.items.filter((item) => Number(item.isActive) === 1);
        this.riskLevels = levels.items.filter((item) => Number(item.isActive) === 1)
          .sort((a, b) => compareRiskLevels(a.name, b.name));
      }
    } catch (error: unknown) {
      this.allowed = this.allowed && !(error instanceof HttpErrorResponse && error.status === 403);
      this.error = this.messageFor(error, 'No fue posible cargar los riesgos.');
    } finally {
      this.loading = false;
      this.refresh();
    }
  }

  private async loadRisks(): Promise<void> {
    const result = await firstValueFrom(this.http.get<RiskPage>(
      `/api/processes/${this.process!.id}/risks?page=${this.page}&limit=${PAGE_SIZE}`
    ));
    this.risks = result.items;
    this.total = result.total;
  }

  /** Validación de usabilidad con las reglas del servidor, que sigue validando todo. */
  private validate(): boolean {
    const errors: Record<string, string> = {};
    if (this.draft.riskTypeId === null) errors['riskTypeId'] = 'Seleccione un tipo de riesgo.';
    if (this.draft.riskLevelId === null) errors['riskLevelId'] = 'Seleccione un nivel de riesgo.';
    for (const field of RISK_TEXT_FIELDS) {
      const value = this.draft[field.key];
      if (!value.trim()) errors[field.key] = 'Complete este campo.';
      else if (countCharacters(value) > RISK_TEXT_MAX) errors[field.key] = 'Use como máximo 10.000 caracteres.';
      else if (HTML_MARKUP.test(value)) errors[field.key] = 'No se admite marcado HTML.';
    }
    this.errors = errors;
    return Object.keys(errors).length === 0;
  }

  private messageFor(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    if (error.status === 403) return 'Los riesgos de este proceso no están disponibles para su perfil.';
    if (error.status === 404) return 'El proceso solicitado ya no está disponible.';
    if (error.status === 400) return 'Revise los datos del riesgo: alguna referencia ya no está disponible.';
    return fallback;
  }

  private refresh(): void {
    if (!this.destroyed) this.changeDetector.detectChanges();
  }
}

function positiveInteger(value: string | null): number | null {
  if (value === null || !/^\d{1,15}$/.test(value)) return null;
  const number = Number(value);
  return number > 0 ? number : null;
}
