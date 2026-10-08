import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, firstValueFrom } from 'rxjs';
import { processStatusTone } from './access';
import { UiBadgeComponent, UiBreadcrumb, UiBreadcrumbsComponent, UiMessageComponent, UiPanelComponent, UiSectionComponent } from './shared/ui';

// Contrato de GET /api/process-map (docs/release01_navegable.md).
interface MapProcess {
  id: number;
  code: string;
  name: string | null;
  status: string;
  processTypeId: number;
}

interface MapProcessType {
  id: number;
  name: string;
  processes: MapProcess[];
}

interface MapMacroprocess {
  id: number;
  code: string;
  name: string;
  order: number;
  processTypes: MapProcessType[];
}

interface ProcessGroup {
  title: string;
  processes: (MapProcess & { detail: string })[];
}

type Grouping = 'tipo' | 'estado';

// Estados fijos del producto en orden de ciclo; otros persistidos van al final.
const STATUS_ORDER = ['Borrador', 'En revisión', 'Vigente', 'Obsoleto'];

@Component({
  selector: 'app-process-map',
  imports: [RouterLink, UiBadgeComponent, UiBreadcrumbsComponent, UiMessageComponent, UiPanelComponent, UiSectionComponent],
  template: `
    @if (mode === 'map') {
      <ui-panel class="process-panel" headingId="map-title" eyebrow="MAPA INTERNO" heading="Mapa de procesos">
        @if (error) { <ui-message kind="error">{{ error }}</ui-message> }
        @if (loading) {
          <p class="helper" role="status">Cargando mapa…</p>
        } @else if (!error) {
          <ul class="map-grid">
            @for (macro of macroprocesses; track macro.id) {
              <li>
                <a class="map-card" [routerLink]="['/mapa/macroprocesos', macro.id]">
                  <span class="map-card-code">{{ macro.code }}</span>
                  <strong class="map-card-title">{{ macro.name }}</strong>
                  <span class="map-card-meta">{{ countLabel(processCount(macro), 'proceso', 'procesos') }} · {{ countLabel(typeCount(macro), 'tipo', 'tipos') }}</span>
                  <span class="map-card-action">Ver macroproceso <span aria-hidden="true">→</span></span>
                </a>
              </li>
            } @empty {
              <li class="helper">No hay macroprocesos registrados.</li>
            }
          </ul>
        }
      </ui-panel>
    } @else {
      <ui-panel class="process-panel" headingId="macro-title" eyebrow="MACROPROCESO" [heading]="current?.name ?? 'Macroproceso'">
        <ui-breadcrumbs panelLead label="Ubicación en el mapa" [items]="breadcrumbs" />
        <a panelActions class="text-button" routerLink="/mapa">Volver al mapa</a>
        @if (error) { <ui-message kind="error">{{ error }}</ui-message> }
        @if (loading) {
          <p class="helper" role="status">Cargando macroproceso…</p>
        } @else if (current) {
          <p class="map-summary">
            {{ current.code }} · {{ countLabel(processCount(current), 'proceso', 'procesos') }} · {{ countLabel(typeCount(current), 'tipo de proceso', 'tipos de proceso') }}
          </p>
          <div class="segmented" role="group" aria-label="Agrupar procesos">
            <button type="button" [attr.aria-pressed]="grouping === 'tipo'" (click)="setGrouping('tipo')">Por tipo</button>
            <button type="button" [attr.aria-pressed]="grouping === 'estado'" (click)="setGrouping('estado')">Por estado</button>
          </div>
          @for (group of groups; track group.title) {
            <ui-section [heading]="group.title + ' (' + group.processes.length + ')'">
              <ul class="process-link-list">
                @for (process of group.processes; track process.id) {
                  <li>
                    <a [routerLink]="['/procesos', process.id]">{{ process.code }} · {{ process.name || 'Sin nombre' }}</a>
                    <span class="process-link-meta">
                      <span class="helper">{{ process.detail }}</span>
                      <ui-badge [tone]="statusTone(process.status)">{{ process.status }}</ui-badge>
                    </span>
                  </li>
                }
              </ul>
            </ui-section>
          } @empty {
            <p class="helper">Este macroproceso no tiene procesos registrados.</p>
          }
        }
      </ui-panel>
    }
  `
})
export class ProcessMapComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  mode: 'map' | 'macroprocess' = 'map';
  macroprocesses: MapMacroprocess[] = [];
  current: MapMacroprocess | null = null;
  groups: ProcessGroup[] = [];
  grouping: Grouping = 'tipo';
  loading = true;
  error = '';
  private destroyed = false;

  get breadcrumbs(): UiBreadcrumb[] {
    return [{ label: 'Mapa de procesos', link: '/mapa' }, { label: this.current?.name ?? 'Macroproceso' }];
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => (this.destroyed = true));
    combineLatest([this.route.data, this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([data, params, query]) => {
        this.mode = data['mode'] === 'macroprocess' ? 'macroprocess' : 'map';
        this.grouping = query.get('agrupar') === 'estado' ? 'estado' : 'tipo';
        void this.load(params.get('id'));
      });
  }

  statusTone = processStatusTone;

  processCount(macro: MapMacroprocess): number {
    return macro.processTypes.reduce((total, type) => total + type.processes.length, 0);
  }

  typeCount(macro: MapMacroprocess): number {
    return macro.processTypes.filter((type) => type.processes.length > 0).length;
  }

  countLabel(count: number, singular: string, plural: string): string {
    return `${count} ${count === 1 ? singular : plural}`;
  }

  async setGrouping(grouping: Grouping): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { agrupar: grouping === 'estado' ? 'estado' : null },
      replaceUrl: true
    });
  }

  private async load(idParam: string | null): Promise<void> {
    this.error = '';
    try {
      if (!this.macroprocesses.length) {
        const map = await firstValueFrom(this.http.get<{ macroprocesses: MapMacroprocess[] }>('/api/process-map'));
        this.macroprocesses = map.macroprocesses;
      }
      if (this.mode === 'macroprocess') {
        const id = Number(idParam);
        this.current = this.macroprocesses.find((macro) => macro.id === id) ?? null;
        if (!this.current) this.error = 'El macroproceso solicitado no está disponible.';
        this.groups = this.current ? this.buildGroups(this.current) : [];
      }
    } catch (error: unknown) {
      this.error = error instanceof HttpErrorResponse && error.status === 403
        ? 'La acción no está autorizada para este perfil.'
        : 'No fue posible cargar el mapa de procesos.';
    } finally {
      this.loading = false;
      this.refresh();
    }
  }

  private buildGroups(macro: MapMacroprocess): ProcessGroup[] {
    if (this.grouping === 'tipo') {
      return macro.processTypes
        .filter((type) => type.processes.length > 0)
        .map((type) => ({ title: type.name, processes: type.processes.map((process) => ({ ...process, detail: '' })) }));
    }
    const byStatus = new Map<string, ProcessGroup>();
    for (const type of macro.processTypes) {
      for (const process of type.processes) {
        const group = byStatus.get(process.status) ?? { title: process.status, processes: [] };
        group.processes.push({ ...process, detail: type.name });
        byStatus.set(process.status, group);
      }
    }
    const rank = (status: string) => (STATUS_ORDER.includes(status) ? STATUS_ORDER.indexOf(status) : STATUS_ORDER.length);
    return [...byStatus.values()].sort((a, b) => rank(a.title) - rank(b.title) || a.title.localeCompare(b.title, 'es'));
  }

  private refresh(): void {
    if (!this.destroyed) this.changeDetector.detectChanges();
  }
}
