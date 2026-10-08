import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, Signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ROUTER_OUTLET_DATA } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProcessOutletData, administrationErrorMessage, isAdmin } from '../access';
import { UiDialogService, UiMessageComponent, UiPanelComponent } from '../shared/ui';

interface Macroprocess {
  id: number;
  code: string;
  name: string;
  description: string | null;
  order: number;
  isActive: number;
}

interface ProcessType {
  id: number;
  name: string;
  isActive: number;
}

/** Catálogos (C-008): funciones, API y permisos trasladados sin cambios desde la página común. */
@Component({
  selector: 'app-catalogs',
  imports: [FormsModule, UiMessageComponent, UiPanelComponent],
  template: `
    <div class="admin-screen">
      <h2 class="visually-hidden" id="catalogs-title">Catálogos</h2>
      @if (error) { <ui-message kind="error">{{ error }}</ui-message> }
      @if (notice) { <ui-message kind="success">{{ notice }}</ui-message> }
      <div class="catalog-grid">
        <ui-panel eyebrow="ESTRUCTURA" heading="Macroprocesos" headingId="macro-title">
          @if (admin) {
            <form (ngSubmit)="createMacroprocess()" class="inline-form">
              <label for="macro-name">Nombre</label>
              <input id="macro-name" name="macroName" [(ngModel)]="macroName" maxlength="120" required>
              <label for="macro-order">Orden</label>
              <input id="macro-order" name="macroOrder" type="number" min="0" max="999999" [(ngModel)]="macroOrder" required>
              <button class="primary-button" [disabled]="busy">Agregar macroproceso</button>
            </form>
          }
          <ul class="catalog-list">
            @for (macro of macroprocesses; track macro.id) {
              <li>
                <div><strong>{{ macro.name }}</strong><small>{{ macro.code }} · orden {{ macro.order }}</small></div>
                @if (admin && macro.isActive) {
                  <button class="text-button" type="button" (click)="editMacroprocess(macro)">Editar</button>
                  <button class="text-button" type="button" (click)="deactivateMacroprocess(macro)">Desactivar</button>
                } @else if (!macro.isActive) { <span class="status">Inactivo</span> }
              </li>
            } @empty { <li>{{ loading ? 'Cargando…' : 'No hay macroprocesos cargados.' }}</li> }
          </ul>
        </ui-panel>
        <ui-panel eyebrow="CLASIFICACIÓN" heading="Tipos de proceso" headingId="types-title">
          @if (admin) {
            <form (ngSubmit)="createProcessType()" class="inline-form">
              <label for="type-name">Nombre</label>
              <input id="type-name" name="typeName" [(ngModel)]="processTypeName" maxlength="120" required>
              <button class="primary-button" [disabled]="busy">Agregar tipo</button>
            </form>
          }
          <ul class="catalog-list">
            @for (type of processTypes; track type.id) {
              <li>
                <div><strong>{{ type.name }}</strong></div>
                @if (admin && type.isActive) {
                  <button class="text-button" type="button" (click)="editProcessType(type)">Editar</button>
                  <button class="text-button" type="button" (click)="deactivateProcessType(type)">Desactivar</button>
                } @else if (!type.isActive) { <span class="status">Inactivo</span> }
              </li>
            } @empty { <li>{{ loading ? 'Cargando…' : 'Aún no hay tipos de proceso.' }}</li> }
          </ul>
        </ui-panel>
      </div>
    </div>
  `
})
export class CatalogsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly dialogs = inject(UiDialogService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly session = inject(ROUTER_OUTLET_DATA) as Signal<ProcessOutletData>;
  private destroyed = false;
  macroprocesses: Macroprocess[] = [];
  processTypes: ProcessType[] = [];
  macroName = '';
  macroOrder = 4;
  processTypeName = '';
  error = '';
  notice = '';
  busy = false;
  loading = true;

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.destroyed = true));
  }

  get admin(): boolean {
    return isAdmin(this.session());
  }

  async ngOnInit(): Promise<void> {
    await this.perform(() => this.reload());
    this.loading = false;
    this.refresh();
  }

  async createMacroprocess(): Promise<void> {
    await this.perform(async () => {
      await firstValueFrom(this.http.post('/api/macroprocesses', {
        name: this.macroName,
        description: null,
        order: Number(this.macroOrder)
      }));
      this.macroName = '';
      this.notice = 'Macroproceso creado y auditado.';
      await this.reload();
    });
  }

  async deactivateMacroprocess(row: Macroprocess): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: 'Desactivar macroproceso',
      message: `¿Desactivar el macroproceso «${row.name}»?`,
      confirmLabel: 'Desactivar',
      tone: 'danger'
    });
    if (!confirmed) return;
    await this.perform(async () => {
      await firstValueFrom(this.http.post(`/api/macroprocesses/${row.id}/deactivate`, {}));
      this.notice = 'Macroproceso desactivado y auditado.';
      await this.reload();
    });
  }

  async editMacroprocess(row: Macroprocess): Promise<void> {
    const values = await this.dialogs.form({
      title: 'Editar macroproceso',
      fields: [
        { key: 'name', label: 'Nombre', value: row.name, required: true, maxLength: 120 },
        { key: 'order', label: 'Orden', type: 'number', value: row.order, required: true, min: 0, max: 999999 }
      ]
    });
    if (!values) return;
    await this.perform(async () => {
      await firstValueFrom(this.http.patch(`/api/macroprocesses/${row.id}`, {
        name: values['name'],
        description: row.description,
        order: values['order']
      }));
      this.notice = 'Macroproceso actualizado y auditado.';
      await this.reload();
    });
  }

  async createProcessType(): Promise<void> {
    await this.perform(async () => {
      await firstValueFrom(this.http.post('/api/process-types', { name: this.processTypeName }));
      this.processTypeName = '';
      this.notice = 'Tipo creado y auditado.';
      await this.reload();
    });
  }

  async deactivateProcessType(row: ProcessType): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: 'Desactivar tipo de proceso',
      message: `¿Desactivar el tipo «${row.name}»?`,
      confirmLabel: 'Desactivar',
      tone: 'danger'
    });
    if (!confirmed) return;
    await this.perform(async () => {
      await firstValueFrom(this.http.post(`/api/process-types/${row.id}/deactivate`, {}));
      this.notice = 'Tipo de proceso desactivado y auditado.';
      await this.reload();
    });
  }

  async editProcessType(row: ProcessType): Promise<void> {
    const values = await this.dialogs.form({
      title: 'Editar tipo de proceso',
      fields: [{ key: 'name', label: 'Nombre', value: row.name, required: true, maxLength: 120 }]
    });
    if (!values) return;
    await this.perform(async () => {
      await firstValueFrom(this.http.patch(`/api/process-types/${row.id}`, { name: values['name'] }));
      this.notice = 'Tipo de proceso actualizado y auditado.';
      await this.reload();
    });
  }

  private async reload(): Promise<void> {
    const [macroprocesses, processTypes] = await Promise.all([
      firstValueFrom(this.http.get<Macroprocess[]>('/api/macroprocesses')),
      firstValueFrom(this.http.get<ProcessType[]>('/api/process-types'))
    ]);
    this.macroprocesses = macroprocesses;
    this.processTypes = processTypes;
  }

  private async perform(action: () => Promise<void>): Promise<void> {
    this.busy = true;
    this.error = '';
    this.notice = '';
    try {
      await action();
    } catch (error: unknown) {
      this.error = administrationErrorMessage(error);
    } finally {
      this.busy = false;
      this.refresh();
    }
  }

  private refresh(): void {
    if (!this.destroyed) this.changeDetector.detectChanges();
  }
}
