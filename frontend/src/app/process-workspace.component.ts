import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, OnInit, Signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ROUTER_OUTLET_DATA, Router, RouterLink } from '@angular/router';
import { combineLatest, firstValueFrom } from 'rxjs';
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
import { ProcessOutletData, canReadRisks, processStatusTone } from './access';
import { LeavesWithConfirmation } from './unsaved-changes.guard';

interface ProcessSummary {
  id: number;
  code: string;
  name: string | null;
  macroprocessId: number;
  macroprocessName: string;
  processTypeId: number;
  processTypeName: string;
  ownerUserId: number;
  ownerDisplayName: string;
  status: string;
  revision: number;
}

interface ProcessRecord extends Omit<ProcessSummary, 'name'> {
  versionNumber: number;
  parentProcessId: number | null;
  name: string | null;
  alias: string | null;
  description: string | null;
  objective: string | null;
  scope: string | null;
  inputs: string | null;
  outputs: string | null;
  suppliers: string | null;
  clients: string | null;
  involvedParties: string | null;
  startsWhen: string | null;
  endsWhen: string | null;
  developmentPlan: string | null;
  operation: string | null;
  design: string | null;
  validation: string | null;
  businessArea: string | null;
  subprocessType: string | null;
  criticality: string | null;
  automationLevel: string | null;
  periodicity: string | null;
  internalUnits: null;
  bpmnModel: null;
}

type TextFieldKey =
  | 'name' | 'alias' | 'description' | 'objective' | 'scope' | 'inputs' | 'outputs'
  | 'suppliers' | 'clients' | 'involvedParties' | 'startsWhen' | 'endsWhen'
  | 'developmentPlan' | 'operation' | 'design' | 'validation' | 'businessArea'
  | 'subprocessType' | 'criticality' | 'automationLevel' | 'periodicity';

interface ProcessDraft {
  macroprocessId: number | null;
  processTypeId: number | null;
  parentProcessId: number | null;
  [key: string]: string | number | null;
}

interface TextField {
  key: TextFieldKey;
  label: string;
  multiline: boolean;
  max: number;
}

interface CatalogOption {
  id: number;
  name: string;
  isActive: number;
}

interface OwnerOption {
  id: number;
  displayName: string;
}

interface ProcessPage {
  items: ProcessSummary[];
  total: number;
  page: number;
  limit: number;
}

const TEXT_FIELDS: TextField[] = [
  { key: 'name', label: 'Nombre', multiline: false, max: 250 },
  { key: 'alias', label: 'Alias', multiline: false, max: 250 },
  { key: 'description', label: 'Descripción', multiline: true, max: 10000 },
  { key: 'objective', label: 'Objetivo', multiline: true, max: 10000 },
  { key: 'scope', label: 'Alcance', multiline: true, max: 10000 },
  { key: 'subprocessType', label: 'Tipo de subproceso', multiline: false, max: 250 },
  { key: 'businessArea', label: 'Área de negocio', multiline: false, max: 250 },
  { key: 'involvedParties', label: 'Involucrados', multiline: true, max: 10000 },
  { key: 'inputs', label: 'Entradas', multiline: true, max: 10000 },
  { key: 'outputs', label: 'Salidas', multiline: true, max: 10000 },
  { key: 'suppliers', label: 'Proveedores', multiline: true, max: 10000 },
  { key: 'clients', label: 'Clientes', multiline: true, max: 10000 },
  { key: 'criticality', label: 'Criticidad', multiline: false, max: 250 },
  { key: 'automationLevel', label: 'Grado de automatización', multiline: false, max: 250 },
  { key: 'periodicity', label: 'Periodicidad', multiline: false, max: 250 },
  { key: 'startsWhen', label: 'Cuándo inicia', multiline: true, max: 10000 },
  { key: 'endsWhen', label: 'Cuándo termina', multiline: true, max: 10000 },
  { key: 'developmentPlan', label: 'Plan de desarrollo', multiline: true, max: 10000 },
  { key: 'operation', label: 'Operación del proceso', multiline: true, max: 10000 },
  { key: 'design', label: 'Diseño del proceso', multiline: true, max: 10000 },
  { key: 'validation', label: 'Validación del proceso', multiline: true, max: 10000 }
];

interface EditorSection {
  title: string;
  fields: TextField[];
}

// Mismas secciones que la ficha. La primera incluye además macroproceso, tipo y proceso padre.
const EDITOR_SECTIONS: EditorSection[] = ([
  ['Identificación', ['name', 'alias', 'subprocessType']],
  ['Propósito', ['description', 'objective', 'scope']],
  ['Organización', ['businessArea', 'involvedParties']],
  ['Entradas y salidas', ['suppliers', 'inputs', 'outputs', 'clients']],
  ['Operación', ['criticality', 'automationLevel', 'periodicity', 'startsWhen', 'endsWhen']],
  ['Desarrollo y diseño', ['developmentPlan', 'operation', 'design', 'validation']]
] as [string, TextFieldKey[]][]).map(([title, keys]) => ({
  title,
  fields: keys.map((key) => TEXT_FIELDS.find((field) => field.key === key)!)
}));

const EMPTY_DRAFT: ProcessDraft = {
  macroprocessId: null,
  processTypeId: null,
  parentProcessId: null,
  name: null,
  alias: null,
  description: null,
  objective: null,
  scope: null,
  inputs: null,
  outputs: null,
  suppliers: null,
  clients: null,
  involvedParties: null,
  startsWhen: null,
  endsWhen: null,
  developmentPlan: null,
  operation: null,
  design: null,
  validation: null,
  businessArea: null,
  subprocessType: null,
  criticality: null,
  automationLevel: null,
  periodicity: null
};

export type { ProcessOutletData } from './access';

type WorkspaceMode = 'list' | 'detail' | 'edit' | 'create';

@Component({
  selector: 'app-process-workspace',
  standalone: true,
  imports: [
    FormsModule, RouterLink, UiBadgeComponent, UiBreadcrumbsComponent, UiCharCounterComponent,
    UiMessageComponent, UiPaginationComponent, UiPanelComponent, UiSectionComponent
  ],
  template: `
    <ui-panel class="process-panel" headingId="processes-title" [eyebrow]="panelEyebrow" [heading]="panelHeading">
      @if (breadcrumbs.length) {
        <ui-breadcrumbs panelLead label="Ubicación en procesos" [items]="breadcrumbs" />
      }
      @if (mode === 'list') {
        @if (canCreate) {
          <a panelActions class="primary-button" routerLink="/procesos/nuevo">Nuevo proceso</a>
        }
      } @else if (mode === 'detail') {
        <a panelActions class="text-button" routerLink="/procesos">Volver al listado</a>
      } @else {
        <a panelActions class="text-button" [routerLink]="cancelLink">Cancelar</a>
      }
      @if (error) { <ui-message kind="error">{{ error }}</ui-message> }
      @if (notice) { <ui-message kind="success">{{ notice }}</ui-message> }

      @if (mode === 'list') {
        <div class="table-scroll">
          <table class="table-cards" [attr.aria-busy]="busy">
            <thead><tr><th>Código</th><th>Nombre</th><th>Macroproceso</th><th>Tipo</th><th>Responsable</th><th>Estado</th><th><span class="visually-hidden">Acciones</span></th></tr></thead>
            <tbody>
              @for (process of processes; track process.id) {
                <tr>
                  <td data-label="Código">{{ process.code }}</td>
                  <td data-label="Nombre"><strong>{{ process.name || 'Sin nombre' }}</strong></td>
                  <td data-label="Macroproceso">{{ process.macroprocessName }}</td>
                  <td data-label="Tipo">{{ process.processTypeName }}</td>
                  <td data-label="Responsable">{{ process.ownerDisplayName }}</td>
                  <td data-label="Estado"><ui-badge [tone]="statusTone(process.status)">{{ process.status }}</ui-badge></td>
                  <td class="table-cards-full"><a class="text-button" [routerLink]="['/procesos', process.id]">Ver ficha</a></td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="table-cards-full">
                  @if (busy) {
                    <span role="status">Cargando procesos…</span>
                  } @else if (!error) {
                    <span>No hay procesos.</span>
                    @if (canCreate) { <span class="helper"> Use «Nuevo proceso» para registrar el primero.</span> }
                  }
                </td></tr>
              }
            </tbody>
          </table>
        </div>
        <ui-pagination [page]="page" [pageSize]="pageSize" [total]="total" itemLabel="procesos"
          [disabled]="busy" (pageChange)="changePage($event)" />
      } @else if (mode === 'detail' && selected) {
        <ui-section heading="Identificación">
          <dl class="process-details">
            <dt>Código</dt><dd>{{ selected.code }}</dd>
            <dt>Nombre</dt><dd>{{ value(selected.name) }}</dd>
            <dt>Alias</dt><dd>{{ value(selected.alias) }}</dd>
            <dt>Macroproceso</dt><dd>{{ selected.macroprocessName }}</dd>
            <dt>Tipo de proceso</dt><dd>{{ selected.processTypeName }}</dd>
            <dt>Proceso padre</dt><dd>{{ parentLabel(selected.parentProcessId) }}</dd>
            <dt>Tipo de subproceso</dt><dd>{{ value(selected.subprocessType) }}</dd>
            <dt>Estado</dt><dd><ui-badge [tone]="statusTone(selected.status)">{{ selected.status }}</ui-badge></dd>
            <dt>Responsable</dt><dd>{{ selected.ownerDisplayName }} · ID {{ selected.ownerUserId }}</dd>
          </dl>
        </ui-section>
        <ui-section heading="Propósito">
          <dl class="process-details">
            <dt>Descripción</dt><dd>{{ value(selected.description) }}</dd>
            <dt>Objetivo</dt><dd>{{ value(selected.objective) }}</dd>
            <dt>Alcance</dt><dd>{{ value(selected.scope) }}</dd>
          </dl>
        </ui-section>
        <ui-section heading="Organización">
          <dl class="process-details">
            <dt>Unidades internas</dt><dd>{{ value(selected.internalUnits) }}</dd>
            <dt>Área de negocio</dt><dd>{{ value(selected.businessArea) }}</dd>
            <dt>Involucrados</dt><dd>{{ value(selected.involvedParties) }}</dd>
          </dl>
        </ui-section>
        <ui-section heading="Entradas y salidas">
          <dl class="process-details">
            <dt>Proveedores</dt><dd>{{ value(selected.suppliers) }}</dd>
            <dt>Entradas</dt><dd>{{ value(selected.inputs) }}</dd>
            <dt>Salidas</dt><dd>{{ value(selected.outputs) }}</dd>
            <dt>Clientes</dt><dd>{{ value(selected.clients) }}</dd>
          </dl>
        </ui-section>
        <ui-section heading="Operación">
          <dl class="process-details">
            <dt>Criticidad</dt><dd>{{ value(selected.criticality) }}</dd>
            <dt>Grado de automatización</dt><dd>{{ value(selected.automationLevel) }}</dd>
            <dt>Periodicidad</dt><dd>{{ value(selected.periodicity) }}</dd>
            <dt>Cuándo inicia</dt><dd>{{ value(selected.startsWhen) }}</dd>
            <dt>Cuándo termina</dt><dd>{{ value(selected.endsWhen) }}</dd>
          </dl>
        </ui-section>
        <ui-section heading="Desarrollo y diseño">
          <dl class="process-details">
            <dt>Plan de desarrollo</dt><dd>{{ value(selected.developmentPlan) }}</dd>
            <dt>Operación del proceso</dt><dd>{{ value(selected.operation) }}</dd>
            <dt>Diseño del proceso</dt><dd>{{ value(selected.design) }}</dd>
            <dt>Validación del proceso</dt><dd>{{ value(selected.validation) }}</dd>
            <dt>Modelo del proceso (BPMN)</dt><dd>{{ value(selected.bpmnModel) }}</dd>
          </dl>
        </ui-section>
        <div class="process-actions">
          @if (canEdit(selected)) {
            <a class="primary-button" [routerLink]="['/procesos', selected.id, 'editar']">Editar borrador</a>
          }
          @if (showRisks(selected)) {
            <a class="text-button" [routerLink]="['/procesos', selected.id, 'riesgos']">Riesgos del proceso</a>
          }
          @if (isAdmin) {
            <button class="text-button" type="button" [disabled]="busy" (click)="beginReassignment()">Reasignar responsable</button>
          }
        </div>
        @if (reassigning) {
          <form class="process-editor" (ngSubmit)="reassign()">
            <h3>Reasignar responsable</h3>
            <label for="new-owner">Nuevo responsable</label>
            <select id="new-owner" name="newOwner" [(ngModel)]="newOwnerId" required>
              <option [ngValue]="null" disabled>Seleccione un usuario</option>
              @for (owner of owners; track owner.id) {
                <option [ngValue]="owner.id" [disabled]="owner.id === selected.ownerUserId">{{ owner.displayName }} · ID {{ owner.id }}</option>
              }
            </select>
            <button class="primary-button" type="submit" [disabled]="busy || newOwnerId === null || newOwnerId === selected.ownerUserId">Guardar responsable</button>
          </form>
        }
      } @else if (editorReady) {
        <form class="process-editor has-sticky-actions" novalidate (ngSubmit)="save()">
          <p class="visually-hidden" aria-live="polite">{{ lengthAnnouncement }}</p>
          @for (section of editorSections; track section.title; let first = $first) {
            <ui-section [heading]="section.title">
              <div class="process-field-grid">
                @if (first) {
                  <div class="field">
                    <label for="process-macroprocess">Macroproceso</label>
                    <select id="process-macroprocess" name="macroprocessId" [(ngModel)]="draft.macroprocessId" (ngModelChange)="revalidate()"
                      aria-required="true" [attr.aria-invalid]="fieldErrors['macroprocessId'] ? 'true' : null"
                      [attr.aria-describedby]="fieldErrors['macroprocessId'] ? 'process-macroprocess-error' : null">
                      <option [ngValue]="null" disabled>Seleccione un macroproceso</option>
                      @for (macro of macroprocesses; track macro.id) {
                        @if (macro.isActive) { <option [ngValue]="macro.id">{{ macro.name }}</option> }
                      }
                    </select>
                    @if (fieldErrors['macroprocessId']) { <p class="field-error" id="process-macroprocess-error">{{ fieldErrors['macroprocessId'] }}</p> }
                  </div>
                  <div class="field">
                    <label for="process-type">Tipo de proceso</label>
                    <select id="process-type" name="processTypeId" [(ngModel)]="draft.processTypeId" (ngModelChange)="revalidate()"
                      aria-required="true" [attr.aria-invalid]="fieldErrors['processTypeId'] ? 'true' : null"
                      [attr.aria-describedby]="fieldErrors['processTypeId'] ? 'process-type-error' : null">
                      <option [ngValue]="null" disabled>Seleccione un tipo</option>
                      @for (type of processTypes; track type.id) {
                        @if (type.isActive) { <option [ngValue]="type.id">{{ type.name }}</option> }
                      }
                    </select>
                    @if (fieldErrors['processTypeId']) { <p class="field-error" id="process-type-error">{{ fieldErrors['processTypeId'] }}</p> }
                  </div>
                  <div class="field">
                    <label for="process-parent">Proceso padre</label>
                    <select id="process-parent" name="parentProcessId" [(ngModel)]="draft.parentProcessId">
                      <option [ngValue]="null">Sin proceso padre</option>
                      @for (parent of parentProcesses; track parent.id) {
                        @if (!selected || parent.id !== selected.id) {
                          <option [ngValue]="parent.id">{{ parent.code }} · {{ parent.name }}</option>
                        }
                      }
                    </select>
                    @if (parentProcesses.length < parentTotal) {
                      <button class="text-button" type="button" [disabled]="busy || loadingParents" (click)="loadMoreParents()">
                        {{ loadingParents ? 'Cargando…' : 'Cargar más procesos disponibles' }}
                      </button>
                    }
                  </div>
                }
                @for (field of section.fields; track field.key) {
                  <div class="field" [class.process-field-wide]="field.multiline">
                    <label [for]="'process-' + field.key">{{ field.label }}</label>
                    @if (field.key === 'involvedParties') {
                      <small id="process-involvedParties-hint">Indique cargos o unidades, no nombres de personas.</small>
                    }
                    @if (field.multiline) {
                      <textarea [id]="'process-' + field.key" [name]="field.key" rows="3"
                        [attr.aria-invalid]="fieldErrors[field.key] ? 'true' : null" [attr.aria-describedby]="describedBy(field)"
                        [ngModel]="draft[field.key]" (ngModelChange)="setTextField(field, $event)"></textarea>
                    } @else {
                      <input [id]="'process-' + field.key" [name]="field.key"
                        [attr.aria-invalid]="fieldErrors[field.key] ? 'true' : null" [attr.aria-describedby]="describedBy(field)"
                        [ngModel]="draft[field.key]" (ngModelChange)="setTextField(field, $event)">
                    }
                    <ui-char-counter [id]="'process-' + field.key + '-count'" [value]="textValue(field.key)" [max]="field.max" />
                    @if (fieldErrors[field.key]) {
                      <p class="field-error" [id]="'process-' + field.key + '-error'">{{ fieldErrors[field.key] }}</p>
                    }
                  </div>
                }
              </div>
            </ui-section>
          }
          <div class="form-actions-sticky">
            <p class="helper">
              @if (mode === 'create') {
                El proceso se asignará a su usuario y se guardará en estado Borrador.
              } @else if (selected) {
                Revisión actual: {{ selected.revision }}. El código, responsable y estado son administrados por el sistema.
              }
            </p>
            <button class="primary-button" type="submit" [disabled]="busy">
              {{ busy ? 'Guardando…' : 'Guardar borrador' }}
            </button>
          </div>
        </form>
      } @else if (busy) {
        <p class="helper" role="status">Cargando…</p>
      }
    </ui-panel>
  `
})
export class ProcessWorkspaceComponent implements OnInit, LeavesWithConfirmation {
  readonly editorSections = EDITOR_SECTIONS;
  private readonly http = inject(HttpClient);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(UiDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly outletData = inject(ROUTER_OUTLET_DATA) as Signal<ProcessOutletData>;
  processes: ProcessSummary[] = [];
  macroprocesses: CatalogOption[] = [];
  processTypes: CatalogOption[] = [];
  owners: OwnerOption[] = [];
  parentProcesses: ProcessSummary[] = [];
  parentTotal = 0;
  page = 1;
  readonly pageSize = 20;
  total = 0;
  selected: ProcessRecord | null = null;
  draft: ProcessDraft = { ...EMPTY_DRAFT };
  mode: WorkspaceMode = 'list';
  editorReady = false;
  fieldErrors: Record<string, string> = {};
  lengthAnnouncement = '';
  newOwnerId: number | null = null;
  error = '';
  notice = '';
  busy = false;
  reassigning = false;
  loadingParents = false;
  private parentPage = 0;
  private savedDraft = '';
  private submitted = false;
  private lengthStates: Record<string, UiCharCountState> = {};
  // El estado de la navegación solo está disponible mientras se activa la ruta (constructor).
  private readonly navigationNotice = noticeFrom(this.router.currentNavigation()?.extras.state);
  private destroyed = false;

  get userId(): number {
    return this.outletData().userId;
  }

  get profiles(): string[] {
    return this.outletData().profiles;
  }

  get canCreate(): boolean {
    return this.isAdmin || this.profiles.includes('PROCESS_OWNER');
  }

  get isAdmin(): boolean {
    return this.profiles.includes('ADMIN');
  }

  get panelEyebrow(): string {
    if (this.mode === 'list') return 'GESTIÓN';
    return this.mode === 'detail' ? 'FICHA DEL PROCESO' : 'BORRADOR';
  }

  get panelHeading(): string {
    if (this.mode === 'list') return 'Procesos';
    if (this.mode === 'detail') return this.selected ? `${this.selected.code} · ${this.selected.name || 'Sin nombre'}` : 'Procesos';
    return this.mode === 'create' ? 'Nuevo proceso' : 'Editar proceso';
  }

  get breadcrumbs(): UiBreadcrumb[] {
    if (this.mode === 'create') return [{ label: 'Procesos', link: '/procesos' }, { label: 'Nuevo proceso' }];
    if (!this.selected || (this.mode !== 'detail' && this.mode !== 'edit')) return [];
    // Ubicación jerárquica en el mapa, no el historial de navegación.
    const path: UiBreadcrumb[] = [
      { label: 'Mapa de procesos', link: '/mapa' },
      { label: this.selected.macroprocessName, link: ['/mapa/macroprocesos', this.selected.macroprocessId] }
    ];
    const current = `${this.selected.code} · ${this.selected.name || 'Sin nombre'}`;
    return this.mode === 'detail'
      ? [...path, { label: current }]
      : [...path, { label: current, link: ['/procesos', this.selected.id] }, { label: 'Editar' }];
  }

  get cancelLink(): (string | number)[] {
    return this.mode === 'edit' && this.selected ? ['/procesos', this.selected.id] : ['/procesos'];
  }

  get hasUnsavedChanges(): boolean {
    return this.editorReady && JSON.stringify(this.draft) !== this.savedDraft;
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => (this.destroyed = true));
    let notice = this.navigationNotice;
    combineLatest([this.route.data, this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([data, params, query]) => {
        void this.load(data['mode'] as WorkspaceMode, params.get('id'), query.get('pagina'), notice);
        notice = '';
      });
  }

  confirmLeave(): boolean | Promise<boolean> {
    if (!this.hasUnsavedChanges) return true;
    return this.dialogs.confirm({
      title: 'Cambios sin guardar',
      message: 'El borrador tiene cambios sin guardar. ¿Salir sin guardarlos?',
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
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { pagina: page > 1 ? page : null }
    });
  }

  readonly statusTone = processStatusTone;

  showRisks(process: ProcessRecord): boolean {
    return canReadRisks(this.outletData(), process.ownerUserId);
  }

  textValue(key: TextFieldKey): string | null {
    const value = this.draft[key];
    return typeof value === 'string' ? value : null;
  }

  setTextField(field: TextField, value: string | null): void {
    this.draft = { ...this.draft, [field.key]: value };
    this.announceLength(field);
    this.revalidate();
  }

  describedBy(field: TextField): string | null {
    const ids = [
      field.key === 'involvedParties' ? 'process-involvedParties-hint' : '',
      this.lengthStates[field.key] !== 'ok' ? `process-${field.key}-count` : '',
      this.fieldErrors[field.key] ? `process-${field.key}-error` : ''
    ].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  }

  revalidate(): void {
    if (this.submitted) this.validateDraft();
  }

  async save(): Promise<void> {
    this.submitted = true;
    if (!this.validateDraft()) {
      this.clearMessages();
      this.changeDetector.detectChanges();
      this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    await this.run(async () => {
      if (this.draft.macroprocessId === null || this.draft.processTypeId === null) return;
      const fields = Object.fromEntries(TEXT_FIELDS.map((field) => [field.key, this.draft[field.key] || null]));
      const body = {
        ...fields,
        macroprocessId: this.draft.macroprocessId,
        processTypeId: this.draft.processTypeId,
        parentProcessId: this.draft.parentProcessId
      };
      let id: number;
      let notice: string;
      if (this.mode === 'create') {
        id = (await firstValueFrom(this.http.post<ProcessRecord>('/api/processes', body))).id;
        notice = 'Borrador creado.';
      } else if (this.selected) {
        await firstValueFrom(this.http.patch(`/api/processes/${this.selected.id}`, {
          ...body,
          revision: this.selected.revision
        }));
        id = this.selected.id;
        notice = 'Borrador actualizado.';
      } else {
        return;
      }
      this.savedDraft = JSON.stringify(this.draft);
      await this.router.navigate(['/procesos', id], { state: { notice } });
    });
  }

  beginReassignment(): void {
    this.clearMessages();
    this.newOwnerId = null;
    this.reassigning = true;
  }

  async reassign(): Promise<void> {
    if (!this.selected || this.newOwnerId === null) return;
    await this.run(async () => {
      await firstValueFrom(this.http.patch(`/api/processes/${this.selected!.id}/owner`, {
        ownerUserId: this.newOwnerId,
        revision: this.selected!.revision
      }));
      this.selected = await firstValueFrom(this.http.get<ProcessRecord>(`/api/processes/${this.selected!.id}`));
      this.reassigning = false;
      this.notice = 'Responsable actualizado.';
    });
  }

  canEdit(process: ProcessRecord): boolean {
    return process.status === 'Borrador' &&
      (this.isAdmin || (process.ownerUserId === this.userId && this.profiles.includes('PROCESS_OWNER')));
  }

  value(value: string | null): string {
    return value?.length ? value : 'Sin información';
  }

  parentLabel(id: number | null): string {
    if (id === null) return 'Sin información';
    const parent = this.parentProcesses.find((process) => process.id === id);
    return parent ? `${parent.code} · ${parent.name}` : `Proceso ${id}`;
  }

  async loadMoreParents(): Promise<void> {
    await this.run(() => this.loadParentProcesses(false));
  }

  private async load(mode: WorkspaceMode, idParam: string | null, pageParam: string | null, notice: string): Promise<void> {
    this.mode = mode;
    this.selected = null;
    this.editorReady = false;
    this.reassigning = false;
    await this.run(async () => {
      if (mode === 'list') {
        this.page = positiveInteger(pageParam) ?? 1;
        await this.loadProcesses();
      } else if (mode === 'create') {
        if (!this.canCreate) throw new HttpErrorResponse({ status: 403 });
        await this.prepareEditor();
        this.startDraft({ ...EMPTY_DRAFT });
      } else {
        const id = positiveInteger(idParam);
        if (id === null) throw new HttpErrorResponse({ status: 404 });
        this.selected = await firstValueFrom(this.http.get<ProcessRecord>(`/api/processes/${id}`));
        if (mode === 'edit') {
          if (!this.canEdit(this.selected)) throw new HttpErrorResponse({ status: 403 });
          await this.prepareEditor();
          this.startDraft(draftFrom(this.selected));
        } else {
          await this.loadParentProcesses(true);
          if (this.isAdmin) this.owners = await firstValueFrom(this.http.get<OwnerOption[]>('/api/users/process-owners'));
        }
      }
      this.notice = notice;
    });
  }

  private startDraft(draft: ProcessDraft): void {
    this.draft = draft;
    this.savedDraft = JSON.stringify(draft);
    this.fieldErrors = {};
    this.submitted = false;
    this.lengthAnnouncement = '';
    this.lengthStates = Object.fromEntries(TEXT_FIELDS.map((field) => [
      field.key,
      charCountState(countCharacters(this.textValue(field.key)), field.max)
    ]));
    this.editorReady = true;
  }

  /** Validación de usabilidad con los mismos límites del servidor, que sigue validando todo. */
  private validateDraft(): boolean {
    const errors: Record<string, string> = {};
    if (this.draft.macroprocessId === null) errors['macroprocessId'] = 'Seleccione un macroproceso.';
    if (this.draft.processTypeId === null) errors['processTypeId'] = 'Seleccione un tipo de proceso.';
    for (const field of TEXT_FIELDS) {
      if (countCharacters(this.textValue(field.key)) > field.max) {
        errors[field.key] = `Use como máximo ${formatCount(field.max)} caracteres.`;
      }
    }
    this.fieldErrors = errors;
    return Object.keys(errors).length === 0;
  }

  /** Anuncia solo los cambios de umbral, no cada pulsación. */
  private announceLength(field: TextField): void {
    const length = countCharacters(this.textValue(field.key));
    const state = charCountState(length, field.max);
    if (state === this.lengthStates[field.key]) return;
    this.lengthStates[field.key] = state;
    this.lengthAnnouncement = state === 'over'
      ? `${field.label}: supera el máximo de ${formatCount(field.max)} caracteres.`
      : state === 'near'
        ? `${field.label}: quedan ${formatCount(field.max - length)} caracteres.`
        : '';
  }

  private async prepareEditor(): Promise<void> {
    try {
      await Promise.all([this.loadCatalogs(), this.loadParentProcesses(true)]);
    } catch {
      this.error = 'No fue posible cargar la información necesaria para el formulario.';
    }
  }

  private async loadProcesses(): Promise<void> {
    const result = await firstValueFrom(
      this.http.get<ProcessPage>(`/api/processes?page=${this.page}&limit=${this.pageSize}`)
    );
    this.processes = result.items;
    this.total = result.total;
  }

  private async loadCatalogs(): Promise<void> {
    const [macroprocesses, processTypes] = await Promise.all([
      firstValueFrom(this.http.get<CatalogOption[]>('/api/macroprocesses')),
      firstValueFrom(this.http.get<CatalogOption[]>('/api/process-types'))
    ]);
    this.macroprocesses = macroprocesses;
    this.processTypes = processTypes;
  }

  private async loadParentProcesses(reset: boolean): Promise<void> {
    if (reset) {
      this.parentProcesses = [];
      this.parentTotal = 0;
      this.parentPage = 0;
    }
    if (this.loadingParents || (this.parentPage > 0 && this.parentProcesses.length >= this.parentTotal)) return;
    this.loadingParents = true;
    try {
      const nextPage = this.parentPage + 1;
      const result = await firstValueFrom(
        this.http.get<ProcessPage>(`/api/processes?page=${nextPage}&limit=100`)
      );
      this.parentPage = nextPage;
      this.parentTotal = result.total;
      const known = new Set(this.parentProcesses.map((process) => process.id));
      this.parentProcesses = [
        ...this.parentProcesses,
        ...result.items.filter((process) => !known.has(process.id))
      ];
      if (this.selected?.parentProcessId && !known.has(this.selected.parentProcessId)) {
        const parent = await firstValueFrom(
          this.http.get<ProcessRecord>(`/api/processes/${this.selected.parentProcessId}`)
        );
        this.parentProcesses = [...this.parentProcesses, parent];
      }
    } finally {
      this.loadingParents = false;
    }
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy = true;
    this.clearMessages();
    try {
      await action();
    } catch (error: unknown) {
      this.error = error instanceof HttpErrorResponse && error.status === 403
        ? 'La acción no está autorizada para este perfil.'
        : error instanceof HttpErrorResponse && error.status === 409
          ? 'El proceso cambió desde la última lectura. Recargue la ficha antes de volver a editar.'
          : error instanceof HttpErrorResponse && error.status === 404
            ? 'El proceso solicitado ya no está disponible.'
            : 'No fue posible completar la operación.';
    } finally {
      this.busy = false;
      if (!this.destroyed) this.changeDetector.detectChanges();
    }
  }

  private clearMessages(): void {
    this.error = '';
    this.notice = '';
  }
}

function formatCount(value: number): string {
  return value.toLocaleString('es-CL');
}

function noticeFrom(state: Record<string, unknown> | undefined): string {
  return typeof state?.['notice'] === 'string' ? state['notice'] : '';
}

function positiveInteger(value: string | null): number | null {
  if (value === null || !/^\d{1,15}$/.test(value)) return null;
  const number = Number(value);
  return number > 0 ? number : null;
}

function draftFrom(record: ProcessRecord): ProcessDraft {
  return {
    ...EMPTY_DRAFT,
    macroprocessId: record.macroprocessId,
    processTypeId: record.processTypeId,
    parentProcessId: record.parentProcessId,
    ...Object.fromEntries(TEXT_FIELDS.map((field) => [field.key, record[field.key]]))
  };
}
