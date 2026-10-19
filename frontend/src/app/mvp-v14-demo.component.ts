import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiBadgeComponent, UiMessageComponent, UiPanelComponent, UiSectionComponent } from './shared/ui';

interface ProcessItem { id: number; code: string; name: string; status: string; }
interface ProcessType { id: number; name: string; processes: ProcessItem[]; }
interface Macroprocess { id: number; code: string; name: string; processTypes: ProcessType[]; }
interface MacroprocessType { id: number; name: string; macroprocesses: Macroprocess[]; }

@Component({
  selector: 'app-process-map',
  imports: [RouterLink, UiBadgeComponent, UiMessageComponent, UiPanelComponent, UiSectionComponent],
  styles: [`
    .map-search { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; margin-bottom: 1rem; }
    .map-search input { flex: 1 1 18rem; min-height: 2.5rem; padding: 0 .75rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); font: inherit; }
    .macro-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
    .type-columns { display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: 1rem; align-items: start; }
    .type-column { min-width: 0; }
    .type-column h4 { margin-top: 0; padding-bottom: .35rem; border-bottom: 2px solid var(--ui-color-border); }
    .macro-card { border: 1px solid var(--ui-color-border); border-top: 4px solid var(--ui-color-primary); border-radius: var(--ui-radius-lg); padding: 1rem; background: var(--ui-color-surface, #fff); }
    .macro-card h3 { margin: 0 0 .5rem; font-size: 1.05rem; }
    .macro-card h4 { margin: .9rem 0 .35rem; font-size: .9rem; color: var(--ui-color-text-muted); }
    .macro-card ul { display: grid; gap: .35rem; margin: 0; padding: 0; list-style: none; }
    .macro-card li { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .35rem; padding: .45rem .6rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); }
    .macro-card a { color: var(--ui-color-primary); font-weight: 600; }
    .macro-card a:focus-visible { outline: 3px solid var(--ui-color-focus); outline-offset: 2px; }
  `],
  template: `
    <ui-panel headingId="map-title" eyebrow="PROCESOS" heading="Mapa de procesos">
      <a panelActions class="primary-button" routerLink="/procesos/nuevo">Nuevo proceso</a>
      @if (error()) { <ui-message kind="error">{{ error() }}</ui-message> }
      @if (loading()) {
        <p class="helper" role="status">Cargando información…</p>
      } @else {
        <div class="map-search">
          <label for="map-filter">Buscar proceso</label>
          <input id="map-filter" type="search" placeholder="Código o nombre" [value]="filter()" (input)="filter.set($any($event.target).value)" />
          <span class="helper" role="status">{{ visibleCount() }} de {{ totalCount() }} procesos</span>
        </div>
        @for (type of filteredMap(); track type.id) {
          <ui-section [heading]="type.name">
            <div class="macro-grid">
              @for (macro of type.macroprocesses; track macro.id) {
                <article class="macro-card" [attr.aria-label]="macro.name">
                  <h3>{{ macro.code }} · {{ macro.name }}</h3>
                  @if (macro.processTypes.length === 0) { <p class="helper">Sin tipos de proceso activos.</p> }
                  <div class="type-columns">
                    @for (processType of macro.processTypes; track processType.id) {
                      <section class="type-column">
                        <h4>{{ processType.name }}</h4>
                        <ul>
                          @for (process of processType.processes; track process.id) {
                            <li><a [routerLink]="['/procesos', process.id]">{{ process.code }} · {{ process.name }}</a><ui-badge tone="info">{{ process.status }}</ui-badge></li>
                          } @empty { <li class="helper">Sin procesos.</li> }
                        </ul>
                      </section>
                    }
                  </div>
                </article>
              }
            </div>
          </ui-section>
        } @empty { <p class="helper">Ningún proceso coincide con la búsqueda.</p> }
      }
    </ui-panel>
  `
})
export class MvpV14DemoComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly map = signal<MacroprocessType[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly filter = signal('');

  filteredMap(): MacroprocessType[] {
    const term = this.filter().trim().toLowerCase();
    if (!term) return this.map();
    const match = (p: ProcessItem) => `${p.code} ${p.name}`.toLowerCase().includes(term);
    return this.map()
      .map((type) => ({ ...type, macroprocesses: type.macroprocesses
        .map((macro) => ({ ...macro, processTypes: macro.processTypes
          .map((pt) => ({ ...pt, processes: pt.processes.filter(match) }))
          .filter((pt) => pt.processes.length > 0) }))
        .filter((macro) => macro.processTypes.length > 0) }))
      .filter((type) => type.macroprocesses.length > 0);
  }

  totalCount(): number { return this.countProcesses(this.map()); }
  visibleCount(): number { return this.countProcesses(this.filteredMap()); }

  private countProcesses(types: MacroprocessType[]): number {
    return types.reduce((a, t) => a + t.macroprocesses.reduce((b, m) => b + m.processTypes.reduce((c, p) => c + p.processes.length, 0), 0), 0);
  }

  ngOnInit(): void {
    this.http.get<{ macroprocessTypes: MacroprocessType[] }>('/api/mvp-v14/map').subscribe({
      next: (response) => { this.map.set(response.macroprocessTypes); this.loading.set(false); },
      error: () => { this.error.set('No fue posible cargar el mapa. Verifique que el backend esté iniciado.'); this.loading.set(false); }
    });
  }
}
