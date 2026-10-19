import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MvpV14Api, ProcessTypeItem, errorMessage } from './mvp-v14-api.service';
import { UiBadgeComponent, UiMessageComponent, UiPanelComponent } from './shared/ui';

@Component({
  selector: 'app-process-types',
  imports: [FormsModule, UiBadgeComponent, UiMessageComponent, UiPanelComponent],
  styles: [`
    .inline-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: .75rem; align-items: end; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); padding: .9rem; margin-bottom: 1rem; }
    label { display: grid; gap: .25rem; font-weight: 600; }
    input, select { min-height: 2.5rem; padding: 0 .6rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); font: inherit; }
    .row-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
  `],
  template: `
    <ui-panel headingId="types-title" eyebrow="CATÁLOGO" heading="Tipos de proceso">
      <button panelActions class="primary-button" type="button" (click)="startCreate()">Nuevo tipo de proceso</button>
      <p class="helper">Cada macroproceso puede tener los tipos de proceso que se necesiten.</p>
      @if (error()) { <ui-message kind="error">{{ error() }}</ui-message> }
      @if (notice()) { <ui-message kind="success">{{ notice() }}</ui-message> }
      @if (editing() !== null) {
        <form class="inline-form" (ngSubmit)="save()" [attr.aria-label]="editing() === 0 ? 'Nuevo tipo de proceso' : 'Editar tipo de proceso'">
          <label>Macroproceso
            <select name="macro" [(ngModel)]="macroprocessId" [disabled]="editing() !== 0">
              <option [ngValue]="null">Seleccione…</option>
              @for (macro of macros(); track macro.id) { <option [ngValue]="macro.id">{{ macro.code }} · {{ macro.name }}</option> }
            </select>
          </label>
          <label>Nombre<input name="name" maxlength="250" [(ngModel)]="name" required /></label>
          <div class="row-actions">
            <button class="primary-button" type="submit">Guardar tipo</button>
            <button class="quiet-button" type="button" (click)="editing.set(null)">Cancelar</button>
          </div>
        </form>
      }
      @if (loading()) { <p class="helper" role="status">Cargando información…</p> }
      @else {
        <div class="table-scroll">
          <table>
            <caption class="visually-hidden">Tipos de proceso</caption>
            <thead><tr><th scope="col">Macroproceso</th><th scope="col">Tipo de proceso</th><th scope="col">Procesos activos</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
            <tbody>
              @for (type of types(); track type.id) {
                <tr>
                  <td>{{ type.macroprocessCode }} · {{ type.macroprocessName }}</td>
                  <td>{{ type.name }}</td>
                  <td>{{ type.processCount }}</td>
                  <td><ui-badge [tone]="type.isActive ? 'success' : 'neutral'">{{ type.isActive ? 'Activo' : 'Inactivo' }}</ui-badge></td>
                  <td class="row-actions">
                    <button class="quiet-button" type="button" (click)="startEdit(type)">Editar</button>
                    @if (type.isActive) { <button class="danger-button" type="button" (click)="deactivate(type)">Desactivar</button> }
                  </td>
                </tr>
              } @empty { <tr><td colspan="5">No hay tipos de proceso.</td></tr> }
            </tbody>
          </table>
        </div>
      }
    </ui-panel>
  `
})
export class ProcessTypesComponent implements OnInit {
  private readonly api = inject(MvpV14Api);
  readonly types = signal<ProcessTypeItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly notice = signal('');
  readonly editing = signal<number | null>(null);
  name = '';
  macroprocessId: number | null = null;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.processTypes().subscribe({
      next: (types) => { this.types.set(types); this.loading.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); }
    });
  }

  macros(): Array<{ id: number; code: string; name: string }> {
    const seen = new Map<number, { id: number; code: string; name: string }>();
    for (const type of this.types()) seen.set(type.macroprocessId, { id: type.macroprocessId, code: type.macroprocessCode, name: type.macroprocessName });
    return [...seen.values()];
  }

  startCreate(): void { this.name = ''; this.macroprocessId = null; this.notice.set(''); this.editing.set(0); }
  startEdit(type: ProcessTypeItem): void { this.name = type.name; this.macroprocessId = type.macroprocessId; this.notice.set(''); this.editing.set(type.id); }

  save(): void {
    const target = this.editing();
    if (this.macroprocessId === null) { this.error.set('El macroproceso es obligatorio.'); return; }
    const body = { macroprocessId: this.macroprocessId, name: this.name.trim() };
    const request = target === 0 ? this.api.createProcessType(body) : this.api.updateProcessType(target as number, body);
    request.subscribe({
      next: () => { this.error.set(''); this.notice.set('Tipo de proceso guardado.'); this.editing.set(null); this.load(); },
      error: (e) => this.error.set(errorMessage(e))
    });
  }

  deactivate(type: ProcessTypeItem): void {
    if (!confirm(`¿Desactivar el tipo de proceso "${type.name}"?`)) return;
    this.api.deactivateProcessType(type.id).subscribe({
      next: () => { this.error.set(''); this.notice.set('Tipo de proceso desactivado.'); this.load(); },
      error: (e) => this.error.set(errorMessage(e))
    });
  }
}
