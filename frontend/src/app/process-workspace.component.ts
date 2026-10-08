import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { UiMessageComponent, UiPaginationComponent, UiPanelComponent } from './shared/ui';

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

@Component({
  selector: 'app-process-workspace',
  standalone: true,
  imports: [FormsModule, UiMessageComponent, UiPaginationComponent, UiPanelComponent],
  template: `
    <ui-panel class="process-panel" headingId="processes-title" [eyebrow]="panelEyebrow" [heading]="panelHeading">
      @if (mode === 'list') {
        @if (canCreate) {
          <button panelActions class="primary-button" type="button" [disabled]="busy" (click)="beginCreate()">Nuevo proceso</button>
        }
      } @else if (mode === 'detail' && selected) {
        <button panelActions class="text-button" type="button" (click)="showList()">Volver al listado</button>
      } @else {
        <button panelActions class="text-button" type="button" (click)="cancelEditor()">Cancelar</button>
      }
      @if (error) { <ui-message kind="error">{{ error }}</ui-message> }
      @if (notice) { <ui-message kind="success">{{ notice }}</ui-message> }

      @if (mode === 'list') {
        <div class="table-scroll">
          <table>
            <thead><tr><th>Código</th><th>Nombre</th><th>Macroproceso</th><th>Tipo</th><th>Responsable</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              @for (process of processes; track process.id) {
                <tr>
                  <td>{{ process.code }}</td><td>{{ process.name || 'Sin nombre' }}</td>
                  <td>{{ process.macroprocessName }}</td><td>{{ process.processTypeName }}</td>
                  <td>{{ process.ownerDisplayName }}</td><td>{{ process.status }}</td>
                  <td><button class="text-button" type="button" (click)="open(process.id)">Ver ficha</button></td>
                </tr>
              } @empty { <tr><td colspan="7">No hay procesos.</td></tr> }
            </tbody>
          </table>
        </div>
        <ui-pagination [page]="page" [pageSize]="pageSize" [total]="total" itemLabel="procesos"
          [disabled]="busy" (pageChange)="changePage($event)" />
      } @else if (mode === 'detail' && selected) {
        <dl class="process-details">
          <dt>Código</dt><dd>{{ selected.code }}</dd>
          <dt>Nombre</dt><dd>{{ value(selected.name) }}</dd>
          <dt>Alias</dt><dd>{{ value(selected.alias) }}</dd>
          <dt>Descripción</dt><dd>{{ value(selected.description) }}</dd>
          <dt>Objetivo</dt><dd>{{ value(selected.objective) }}</dd>
          <dt>Alcance</dt><dd>{{ value(selected.scope) }}</dd>
          <dt>Macroproceso</dt><dd>{{ selected.macroprocessName }}</dd>
          <dt>Tipo de proceso</dt><dd>{{ selected.processTypeName }}</dd>
          <dt>Proceso padre</dt><dd>{{ parentLabel(selected.parentProcessId) }}</dd>
          <dt>Tipo de subproceso</dt><dd>{{ value(selected.subprocessType) }}</dd>
          <dt>Unidades internas</dt><dd>{{ value(selected.internalUnits) }}</dd>
          <dt>Área de negocio</dt><dd>{{ value(selected.businessArea) }}</dd>
          <dt>Responsable</dt><dd>{{ selected.ownerDisplayName }} · ID {{ selected.ownerUserId }}</dd>
          <dt>Involucrados</dt><dd>{{ value(selected.involvedParties) }}</dd>
          <dt>Entradas</dt><dd>{{ value(selected.inputs) }}</dd>
          <dt>Salidas</dt><dd>{{ value(selected.outputs) }}</dd>
          <dt>Proveedores</dt><dd>{{ value(selected.suppliers) }}</dd>
          <dt>Clientes</dt><dd>{{ value(selected.clients) }}</dd>
          <dt>Criticidad</dt><dd>{{ value(selected.criticality) }}</dd>
          <dt>Grado de automatización</dt><dd>{{ value(selected.automationLevel) }}</dd>
          <dt>Periodicidad</dt><dd>{{ value(selected.periodicity) }}</dd>
          <dt>Cuándo inicia</dt><dd>{{ value(selected.startsWhen) }}</dd>
          <dt>Cuándo termina</dt><dd>{{ value(selected.endsWhen) }}</dd>
          <dt>Plan de desarrollo</dt><dd>{{ value(selected.developmentPlan) }}</dd>
          <dt>Operación del proceso</dt><dd>{{ value(selected.operation) }}</dd>
          <dt>Diseño del proceso</dt><dd>{{ value(selected.design) }}</dd>
          <dt>Validación del proceso</dt><dd>{{ value(selected.validation) }}</dd>
          <dt>Estado</dt><dd>{{ selected.status }}</dd>
          <dt>Modelo del proceso (BPMN)</dt><dd>{{ value(selected.bpmnModel) }}</dd>
        </dl>
        <div class="process-actions">
          @if (canEdit(selected)) {
            <button class="primary-button" type="button" [disabled]="busy" (click)="beginEdit()">Editar borrador</button>
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
      } @else {
        <form class="process-editor" (ngSubmit)="save()">
          <div class="process-field-grid">
            <div class="field">
              <label for="process-macroprocess">Macroproceso</label>
              <select id="process-macroprocess" name="macroprocessId" [(ngModel)]="draft.macroprocessId" required>
                <option [ngValue]="null" disabled>Seleccione un macroproceso</option>
                @for (macro of macroprocesses; track macro.id) {
                  @if (macro.isActive) { <option [ngValue]="macro.id">{{ macro.name }}</option> }
                }
              </select>
            </div>
            <div class="field">
              <label for="process-type">Tipo de proceso</label>
              <select id="process-type" name="processTypeId" [(ngModel)]="draft.processTypeId" required>
                <option [ngValue]="null" disabled>Seleccione un tipo</option>
                @for (type of processTypes; track type.id) {
                  @if (type.isActive) { <option [ngValue]="type.id">{{ type.name }}</option> }
                }
              </select>
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
            @for (field of textFields; track field.key) {
              <div class="field" [class.process-field-wide]="field.multiline">
                <label [for]="'process-' + field.key">{{ field.label }}</label>
                @if (field.key === 'involvedParties') {
                  <small>Indique cargos o unidades, no nombres de personas.</small>
                }
                @if (field.multiline) {
                  <textarea [id]="'process-' + field.key" [name]="field.key" [maxlength]="field.max"
                    [ngModel]="draft[field.key]" (ngModelChange)="setTextField(field.key, $event)" rows="3"></textarea>
                } @else {
                  <input [id]="'process-' + field.key" [name]="field.key" [maxlength]="field.max"
                    [ngModel]="draft[field.key]" (ngModelChange)="setTextField(field.key, $event)">
                }
              </div>
            }
          </div>
          @if (selected) { <p class="helper">Revisión actual: {{ selected.revision }}. El código, responsable y estado son administrados por el sistema.</p> }
          @if (mode === 'create') { <p class="helper">El proceso se asignará a su usuario y se guardará en estado Borrador.</p> }
          <button class="primary-button" type="submit" [disabled]="busy || draft.macroprocessId === null || draft.processTypeId === null">
            {{ busy ? 'Guardando…' : 'Guardar borrador' }}
          </button>
        </form>
      }
    </ui-panel>
  `
})
export class ProcessWorkspaceComponent implements OnInit {
  @Input({ required: true }) userId!: number;
  @Input({ required: true }) profiles: string[] = [];

  readonly textFields = TEXT_FIELDS;
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
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
  mode: 'list' | 'detail' | 'edit' | 'create' = 'list';
  newOwnerId: number | null = null;
  error = '';
  notice = '';
  busy = false;
  reassigning = false;
  loadingParents = false;
  private parentPage = 0;

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

  async ngOnInit(): Promise<void> {
    await this.run(async () => {
      await Promise.all([this.loadProcesses(), this.loadCatalogs()]);
      if (this.isAdmin) this.owners = await firstValueFrom(this.http.get<OwnerOption[]>('/api/users/process-owners'));
    });
  }

  async changePage(page: number): Promise<void> {
    this.page = page;
    await this.run(() => this.loadProcesses());
  }

  async open(id: number): Promise<void> {
    await this.run(async () => {
      this.selected = await firstValueFrom(this.http.get<ProcessRecord>(`/api/processes/${id}`));
      this.reassigning = false;
      this.mode = 'detail';
      await this.loadParentProcesses(true);
    });
  }

  beginCreate(): void {
    this.clearMessages();
    this.selected = null;
    this.draft = { ...EMPTY_DRAFT };
    this.mode = 'create';
    void this.prepareEditor();
  }

  beginEdit(): void {
    if (!this.selected) return;
    this.clearMessages();
    const record = this.selected;
    this.draft = {
      ...EMPTY_DRAFT,
      macroprocessId: record.macroprocessId,
      processTypeId: record.processTypeId,
      parentProcessId: record.parentProcessId,
      ...Object.fromEntries(TEXT_FIELDS.map((field) => [field.key, record[field.key]]))
    };
    this.mode = 'edit';
    void this.prepareEditor();
  }

  setTextField(key: TextFieldKey, value: string | null): void {
    this.draft = { ...this.draft, [key]: value };
  }

  async save(): Promise<void> {
    await this.run(async () => {
      if (this.draft.macroprocessId === null || this.draft.processTypeId === null) return;
      const fields = Object.fromEntries(TEXT_FIELDS.map((field) => [field.key, this.draft[field.key] || null]));
      const body = {
        ...fields,
        macroprocessId: this.draft.macroprocessId,
        processTypeId: this.draft.processTypeId,
        parentProcessId: this.draft.parentProcessId
      };
      if (this.mode === 'create') {
        const created = await firstValueFrom(this.http.post<ProcessRecord>('/api/processes', body));
        this.selected = await firstValueFrom(this.http.get<ProcessRecord>(`/api/processes/${created.id}`));
        this.notice = 'Borrador creado.';
      } else if (this.selected) {
        await firstValueFrom(this.http.patch(`/api/processes/${this.selected.id}`, {
          ...body,
          revision: this.selected.revision
        }));
        this.selected = await firstValueFrom(this.http.get<ProcessRecord>(`/api/processes/${this.selected.id}`));
        this.notice = 'Borrador actualizado.';
      }
      this.mode = 'detail';
      this.reassigning = false;
      this.page = 1;
      await this.loadProcesses();
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
      await this.loadProcesses();
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

  cancelEditor(): void {
    this.mode = this.selected ? 'detail' : 'list';
    this.clearMessages();
  }

  showList(): void {
    this.mode = 'list';
    this.selected = null;
    this.reassigning = false;
    this.clearMessages();
  }

  async loadMoreParents(): Promise<void> {
    await this.run(() => this.loadParentProcesses(false));
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
      this.changeDetector.detectChanges();
    }
  }

  private clearMessages(): void {
    this.error = '';
    this.notice = '';
  }
}
