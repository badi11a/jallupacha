import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, filter, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { MvpV14Api, MapMacroprocess, ProcessListItem, UnitItem, errorMessage } from './mvp-v14-api.service';
import { UiBadgeComponent, UiBadgeTone, UiBreadcrumbsComponent, UiDialogService, UiMessageComponent } from './shared/ui';

@Component({
  selector: 'app-macroprocess-detail',
  imports: [FormsModule, RouterLink, UiBadgeComponent, UiBreadcrumbsComponent, UiMessageComponent],
  styles: [`
    .top-nav-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--ui-space-3); gap: 1rem; }
    .help-btn { display: inline-flex; align-items: center; gap: .45rem; padding: .45rem .9rem; background: var(--ui-color-surface); border: 1px solid var(--ui-color-border-strong); border-radius: var(--ui-radius-lg); color: var(--ui-color-text); font-size: var(--ui-font-size-sm); font-weight: var(--ui-font-weight-medium); cursor: pointer; transition: all .15s ease-in-out; }
    .help-btn:hover { background: var(--ui-color-surface-accent); border-color: var(--ui-color-primary); color: var(--ui-color-primary); }
    .help-btn svg { color: var(--ui-color-text-subtle); flex-shrink: 0; }

    .hero-card { display: grid; grid-template-columns: 1fr 340px; gap: 2rem; align-items: start; padding: 1.75rem 2rem; background: var(--ui-color-surface); border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-xl); box-shadow: var(--ui-shadow-panel); margin-bottom: 1.5rem; }
    @media (max-width: 960px) { .hero-card { grid-template-columns: 1fr; gap: 1.5rem; padding: 1.5rem; } }
    .hero-main { min-width: 0; }
    .hero-eyebrow { display: inline-block; padding: .25rem .65rem; border-radius: var(--ui-radius-sm); background: var(--ui-color-surface-accent); color: var(--ui-color-eyebrow); font-size: .75rem; font-weight: var(--ui-font-weight-heavy); letter-spacing: .05em; text-transform: uppercase; margin-bottom: .5rem; }
    .hero-title { margin: 0 0 .75rem; font-size: var(--ui-font-size-display); font-weight: var(--ui-font-weight-heavy); color: var(--ui-color-heading); line-height: 1.25; }
    .hero-desc { color: var(--ui-color-text-muted); font-size: var(--ui-font-size-md); line-height: 1.55; margin: 0 0 1.5rem; max-width: 65ch; }
    .stats-row { display: flex; flex-wrap: wrap; gap: .75rem; }
    .stat-box { display: inline-flex; align-items: baseline; gap: .45rem; padding: .5rem 1rem; border-radius: var(--ui-radius-lg); background: var(--ui-color-background); border: 1px solid var(--ui-color-border); }
    .stat-box strong { font-size: 1.15rem; font-weight: var(--ui-font-weight-heavy); color: var(--ui-color-heading); }
    .stat-box span { font-size: var(--ui-font-size-sm); color: var(--ui-color-text-muted); }

    .risk-widget { padding: 1.25rem 1.4rem; border-radius: var(--ui-radius-lg); background: var(--ui-color-background); border: 1px solid var(--ui-color-border); }
    .risk-widget-header { font-size: var(--ui-font-size-xs); font-weight: var(--ui-font-weight-bold); color: var(--ui-color-text-subtle); letter-spacing: .06em; text-transform: uppercase; margin-bottom: .85rem; }
    .risk-bar { display: flex; height: 9px; border-radius: var(--ui-radius-pill); overflow: hidden; background: var(--ui-color-border); margin-bottom: .85rem; }
    .risk-seg { height: 100%; transition: width .3s ease; }
    .risk-seg-bajo { background: var(--ui-color-success-text); }
    .risk-seg-medio { background: var(--brand-yellow); }
    .risk-seg-alto { background: var(--brand-orange); }
    .risk-seg-critico { background: var(--ui-color-danger); }
    .risk-seg-none { background: var(--ui-color-border-strong); }
    .risk-legend { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .5rem; font-size: var(--ui-font-size-xs); }
    .risk-legend-item { display: inline-flex; align-items: center; gap: .35rem; color: var(--ui-color-text-subtle); }
    .risk-legend-item strong { color: var(--ui-color-heading); font-weight: var(--ui-font-weight-bold); }

    .processes-panel { padding: 1.75rem 2rem; background: var(--ui-color-surface); border: 1px solid var(--ui-color-border); border-top: 3px solid var(--ui-color-brand-accent); border-radius: var(--ui-radius-xl); box-shadow: var(--ui-shadow-panel); }
    @media (max-width: 700px) { .processes-panel { padding: 1.25rem; } }
    .panel-header-row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 1rem; margin-bottom: 1.25rem; }
    .panel-heading { margin: 0; font-size: 1.25rem; font-weight: var(--ui-font-weight-heavy); color: var(--ui-color-heading); }
    .panel-subheading { margin: .25rem 0 0; font-size: var(--ui-font-size-sm); color: var(--ui-color-text-muted); }
    .panel-count-label { font-size: var(--ui-font-size-sm); color: var(--ui-color-text-subtle); font-weight: var(--ui-font-weight-medium); }

    .filters-box { background: var(--ui-color-background); border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); padding: 1.25rem; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .search-box { position: relative; display: flex; align-items: center; }
    .search-icon { position: absolute; left: .9rem; color: var(--ui-color-text-subtle); pointer-events: none; }
    .search-box input { width: 100%; padding-left: 2.6rem; background: var(--ui-color-surface); }
    .filter-type-section { display: flex; flex-direction: column; gap: .45rem; }
    .filter-type-header { display: inline-flex; align-items: center; gap: .35rem; font-size: var(--ui-font-size-xs); font-weight: var(--ui-font-weight-heavy); letter-spacing: .05em; text-transform: uppercase; color: var(--ui-color-text-subtle); }
    .info-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background: none; border: 1px solid var(--ui-color-border-strong); color: var(--ui-color-text-subtle); font-size: 10px; font-weight: bold; cursor: pointer; padding: 0; line-height: 1; }
    .info-icon-btn:hover { border-color: var(--ui-color-primary); color: var(--ui-color-primary); }
    .type-filters { display: flex; flex-wrap: wrap; gap: .5rem; }
    .type-pill { display: inline-flex; align-items: center; justify-content: center; min-height: 38px; padding: .35rem .95rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-pill); background: var(--ui-color-surface); color: var(--ui-color-text); font-size: var(--ui-font-size-sm); font-weight: var(--ui-font-weight-medium); text-decoration: none; transition: all .15s ease; cursor: pointer; }
    .type-pill:hover { border-color: var(--ui-color-border-strong); }
    .type-pill[aria-current="true"] { background: var(--brand-steel-blue); color: var(--ui-color-on-primary); border-color: var(--brand-steel-blue); }
    .pill-chip { display: inline-flex; align-items: center; justify-content: center; min-width: 1.35rem; height: 1.35rem; padding: 0 .35rem; margin-left: .45rem; border-radius: var(--ui-radius-pill); background: var(--ui-color-surface-accent); color: var(--ui-color-primary); font-size: var(--ui-font-size-xs); font-weight: var(--ui-font-weight-bold); }
    .type-pill[aria-current="true"] .pill-chip { background: rgba(255, 255, 255, .25); color: var(--ui-color-on-primary); }
    .dropdowns-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    @media (max-width: 640px) { .dropdowns-row { grid-template-columns: 1fr; } }
    .dropdown-group { display: flex; flex-direction: column; gap: .35rem; }
    .dropdown-label { font-size: var(--ui-font-size-xs); font-weight: var(--ui-font-weight-heavy); letter-spacing: .05em; text-transform: uppercase; color: var(--ui-color-text-subtle); }
    .dropdown-group select { width: 100%; background: var(--ui-color-surface); }

    .results { list-style: none; margin: 0; padding: 0; }
    .process-row { display: grid; grid-template-columns: minmax(0, 1fr) 220px 140px; align-items: center; gap: 1.25rem; padding: 1.15rem 1.4rem; margin-bottom: .75rem; border: 1px solid var(--ui-color-border); border-radius: var(--ui-radius-lg); background: var(--ui-color-surface); color: inherit; text-decoration: none; transition: border-color .15s ease, box-shadow .15s ease; }
    .process-row:hover { border-color: var(--ui-color-border-strong); box-shadow: 0 2px 8px rgba(34, 33, 63, .06); }
    .col-main { min-width: 0; display: flex; flex-direction: column; gap: .25rem; }
    .process-name { color: var(--ui-color-heading); font-size: .95rem; font-weight: var(--ui-font-weight-bold); line-height: 1.35; word-break: break-word; }
    .process-unit { color: var(--ui-color-text-subtle); font-size: .8125rem; }
    .col-type { color: var(--ui-color-text-muted); font-size: .875rem; }
    .col-actions { display: flex; align-items: center; justify-content: flex-end; gap: .85rem; }
    .chevron-icon { color: var(--ui-color-border-strong); flex-shrink: 0; }
    @media (max-width: 768px) {
      .process-row { grid-template-columns: 1fr; gap: .5rem; }
      .col-actions { justify-content: space-between; margin-top: .25rem; }
    }
    .empty-state { padding: 2.5rem 1rem; text-align: center; color: var(--ui-color-text-muted); }
    .empty-state p { margin: 0 0 1rem; }
  `],
  template: `
    <div class="top-nav-bar">
      <ui-breadcrumbs [items]="[{ label: 'Mapa de procesos', link: '/mapa' }, { label: macro()?.name || 'Macroproceso' }]" />
      <button type="button" class="help-btn" (click)="openHelp()" aria-label="Ayuda sobre este macroproceso">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span>Ayuda</span>
      </button>
    </div>

    @if (error()) { <ui-message kind="error">{{ error() }}</ui-message> }
    @if (loading()) { <p role="status">Cargando macroproceso…</p> }

    @if (macro(); as m) {
      <header class="hero-card" aria-labelledby="macro-title">
        <div class="hero-main">
          <span class="hero-eyebrow">{{ eyebrowText() }}</span>
          <h1 id="macro-title" class="hero-title">{{ m.name }}</h1>
          <p class="hero-desc">{{ macroDescription() }}</p>
          <div class="stats-row" aria-label="Resumen de indicadores del macroproceso">
            <div class="stat-box"><strong>{{ m.processTypes.length }}</strong> <span>Tipos de proceso</span></div>
            <div class="stat-box"><strong>{{ totalProcessCount() }}</strong> <span>Procesos</span></div>
            <div class="stat-box"><strong>{{ responsibleUnitsCount() }}</strong> <span>Unidades responsables</span></div>
          </div>
        </div>

        <aside class="risk-widget" aria-label="Distribución de riesgo en los procesos">
          <div class="risk-widget-header">DISTRIBUCIÓN DE RIESGO</div>
          <div class="risk-bar" role="meter" [attr.aria-valuenow]="riskSummary().total" aria-valuemin="0" [attr.aria-valuemax]="riskSummary().total" [attr.aria-label]="'Distribución de riesgo: ' + riskSummary().bajo + ' bajo, ' + riskSummary().medio + ' medio, ' + riskSummary().alto + ' alto, ' + riskSummary().critico + ' crítico'">
            @if (riskSummary().total > 0) {
              @if (riskSummary().bajo > 0) { <div class="risk-seg risk-seg-bajo" [style.width.%]="riskSummary().bajoPct" title="Bajo: {{ riskSummary().bajo }}"></div> }
              @if (riskSummary().medio > 0) { <div class="risk-seg risk-seg-medio" [style.width.%]="riskSummary().medioPct" title="Medio: {{ riskSummary().medio }}"></div> }
              @if (riskSummary().alto > 0) { <div class="risk-seg risk-seg-alto" [style.width.%]="riskSummary().altoPct" title="Alto: {{ riskSummary().alto }}"></div> }
              @if (riskSummary().critico > 0) { <div class="risk-seg risk-seg-critico" [style.width.%]="riskSummary().criticoPct" title="Crítico: {{ riskSummary().critico }}"></div> }
            } @else {
              <div class="risk-seg risk-seg-none" style="width: 100%" title="Sin riesgos registrados"></div>
            }
          </div>
          <div class="risk-legend">
            <div class="risk-legend-item"><span>Bajo</span> <strong>{{ riskSummary().bajo }}</strong></div>
            <div class="risk-legend-item"><span>Medio</span> <strong>{{ riskSummary().medio }}</strong></div>
            <div class="risk-legend-item"><span>Alto</span> <strong>{{ riskSummary().alto }}</strong></div>
            <div class="risk-legend-item"><span>Crítico</span> <strong>{{ riskSummary().critico }}</strong></div>
          </div>
        </aside>
      </header>

      <section class="processes-panel" aria-labelledby="processes-section-title">
        <div class="panel-header-row">
          <div>
            <h2 id="processes-section-title" class="panel-heading">Procesos</h2>
            <p class="panel-subheading">Explora y filtra los procesos asociados a este macroproceso.</p>
          </div>
          <div class="panel-count-label" role="status">
            {{ items().length }} {{ items().length === 1 ? 'resultado visible' : 'resultados visibles' }}
          </div>
        </div>

        <div class="filters-box" role="search" aria-label="Filtros del macroproceso">
          <div class="search-box">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input name="q" type="search" [(ngModel)]="q" (keydown.enter)="applyFilters()" (blur)="applyFilters()" placeholder="Buscar por proceso, tipo o unidad responsable..." aria-label="Buscar por proceso, tipo o unidad responsable" />
          </div>

          <div class="filter-type-section">
            <div class="filter-type-header">
              <span>TIPO DE PROCESO</span>
              <button type="button" class="info-icon-btn" (click)="openTypeHelp()" title="Información de tipo de proceso" aria-label="Información de tipo de proceso">?</button>
            </div>
            <nav class="type-filters" aria-label="Tipos de proceso del macroproceso">
              <a [routerLink]="[]" [queryParams]="{ type: null }" queryParamsHandling="merge" class="type-pill" [attr.aria-current]="!processTypeId ? 'true' : null">
                <span>Todos los procesos</span>
                <span class="pill-chip">{{ totalProcessCount() }}</span>
              </a>
              @for (type of m.processTypes; track type.id) {
                <a [routerLink]="[]" [queryParams]="{ type: type.id }" queryParamsHandling="merge" class="type-pill" [attr.aria-current]="processTypeId === '' + type.id ? 'true' : null">
                  <span>{{ type.name }}</span>
                  <span class="pill-chip">{{ type.processes.length }}</span>
                </a>
              }
            </nav>
          </div>

          <div class="dropdowns-row">
            <label class="dropdown-group">
              <span class="dropdown-label">NIVEL DE RIESGO</span>
              <select name="risk" [(ngModel)]="riskLevel" (ngModelChange)="applyFilters()" aria-label="Filtrar por nivel de riesgo">
                <option value="">Todos los riesgos</option>
                <option value="Bajo">Bajo</option>
                <option value="Medio">Medio</option>
                <option value="Alto">Alto</option>
                <option value="Crítico">Crítico</option>
              </select>
            </label>
            <label class="dropdown-group">
              <span class="dropdown-label">UNIDAD RESPONSABLE</span>
              <select name="unit" [(ngModel)]="unitId" (ngModelChange)="applyFilters()" aria-label="Filtrar por unidad responsable">
                <option value="">Todas las unidades</option>
                @for (unit of units(); track unit.id) {
                  <option [value]="unit.id">{{ unit.name }}</option>
                }
              </select>
            </label>
          </div>
        </div>

        <ul class="results" role="list">
          @for (item of items(); track item.id) {
            <li>
              <a class="process-row" [routerLink]="['/procesos', item.id]" [attr.aria-label]="item.name + ', ' + (item.responsibleUnit || 'Sin unidad responsable') + ', tipo ' + item.processType">
                <div class="col-main">
                  <strong class="process-name">{{ item.name }}</strong>
                  <span class="process-unit">{{ item.responsibleUnit || 'Sin unidad responsable' }}</span>
                </div>
                <div class="col-type">
                  <span class="process-type">{{ item.processType }}</span>
                </div>
                <div class="col-actions">
                  @if (item.riskLevel) {
                    <ui-badge [tone]="badgeTone(item.riskLevel)">{{ item.riskLevel }}</ui-badge>
                  } @else {
                    <ui-badge tone="neutral">{{ item.status }}</ui-badge>
                  }
                  <svg class="chevron-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </a>
            </li>
          } @empty {
            <li class="empty-state">
              <p class="helper">Ningún proceso coincide con los filtros aplicados.</p>
              @if (hasActiveFilters()) {
                <button type="button" class="quiet-button" (click)="clearFilters()">Restablecer filtros</button>
              }
            </li>
          }
        </ul>
      </section>
    }
  `
})
export class MacroprocessDetailComponent implements OnInit {
  private readonly api = inject(MvpV14Api);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogs = inject(UiDialogService);

  readonly macro = signal<MapMacroprocess | null>(null);
  readonly family = signal('');
  readonly items = signal<ProcessListItem[]>([]);
  readonly allProcesses = signal<ProcessListItem[]>([]);
  readonly units = signal<UnitItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  q = '';
  unitId = '';
  processTypeId = '';
  riskLevel = '';

  readonly eyebrowText = computed(() => {
    const fam = this.family().toLowerCase();
    if (fam.includes('estratég') || fam.includes('estrateg')) return 'MACROPROCESO ESTRATÉGICO';
    if (fam.includes('mision')) return 'MACROPROCESO MISIONAL';
    if (fam.includes('apoyo')) return 'MACROPROCESO DE APOYO';
    return fam ? `MACROPROCESO · ${this.family().toUpperCase()}` : 'MACROPROCESO';
  });

  readonly riskSummary = computed(() => {
    const source = this.allProcesses().length > 0 ? this.allProcesses() : this.items();
    let bajo = 0;
    let medio = 0;
    let alto = 0;
    let critico = 0;
    for (const item of source) {
      const lvl = (item.riskLevel || '').toLowerCase();
      if (lvl.includes('bajo')) bajo++;
      else if (lvl.includes('medio')) medio++;
      else if (lvl.includes('crítico') || lvl.includes('critico')) critico++;
      else if (lvl.includes('alto')) alto++;
    }
    const total = bajo + medio + alto + critico;
    const bajoPct = total > 0 ? (bajo / total) * 100 : 0;
    const medioPct = total > 0 ? (medio / total) * 100 : 0;
    const altoPct = total > 0 ? (alto / total) * 100 : 0;
    const criticoPct = total > 0 ? (critico / total) * 100 : 0;
    return { bajo, medio, alto, critico, total, bajoPct, medioPct, altoPct, criticoPct };
  });

  macroDescription(): string {
    const m = this.macro();
    if (!m) return '';
    const desc = (m as { description?: string }).description;
    if (desc && desc.trim()) return desc;
    const fam = this.family().toLowerCase();
    if (fam.includes('estratég') || fam.includes('estrateg')) {
      return 'Orienta la planificación y el desarrollo institucional, definiendo prioridades, objetivos y mecanismos de seguimiento para la entidad.';
    }
    if (fam.includes('mision')) {
      return 'Conduce la entrega de servicios y la atención de requerimientos esenciales de la organización.';
    }
    if (fam.includes('apoyo')) {
      return 'Asegura la gestión eficiente de recursos, soporte administrativo y tecnológico requerido para la operación institucional.';
    }
    return `${m.code} · Explora los tipos de proceso y consulta las fichas de este macroproceso.`;
  }

  totalProcessCount(): number {
    return this.macro()?.processTypes.reduce((sum, type) => sum + type.processes.length, 0) ?? 0;
  }

  responsibleUnitsCount(): number {
    const source = this.allProcesses().length > 0 ? this.allProcesses() : this.items();
    const set = new Set(source.map(item => item.responsibleUnit).filter(Boolean));
    return set.size;
  }

  badgeTone(level: string): UiBadgeTone {
    const l = (level || '').toLowerCase();
    if (l.includes('bajo')) return 'success';
    if (l.includes('medio')) return 'warning';
    if (l.includes('crítico') || l.includes('critico')) return 'critical';
    if (l.includes('alto')) return 'danger';
    return 'neutral';
  }

  hasActiveFilters(): boolean {
    return Boolean(this.q || this.unitId || this.processTypeId || this.riskLevel);
  }

  clearFilters(): void {
    this.q = '';
    this.unitId = '';
    this.processTypeId = '';
    this.riskLevel = '';
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  applyFilters(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.q || null,
        unit: this.unitId || null,
        type: this.processTypeId || null,
        risk: this.riskLevel || null
      }
    });
  }

  openHelp(): void {
    void this.dialogs.confirm({
      title: 'Ayuda sobre macroprocesos',
      message: 'Esta vista detalla el macroproceso seleccionado, permitiendo explorar sus tipos de proceso y consultar o filtrar las fichas de procesos institucionales asociadas según nivel de riesgo o unidad responsable.',
      confirmLabel: 'Entendido'
    });
  }

  openTypeHelp(): void {
    void this.dialogs.confirm({
      title: 'Tipos de proceso',
      message: 'Los tipos de proceso clasifican las actividades dentro del macroproceso. Seleccione cualquiera de los botones para enfocar la lista en esa categoría.',
      confirmLabel: 'Entendido'
    });
  }

  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      startWith(null),
      map(() => [this.route.snapshot.paramMap, this.route.snapshot.queryParamMap] as const),
      distinctUntilChanged(([oldParams, oldQuery], [params, query]) => oldParams.get('id') === params.get('id')
        && ['q', 'unit', 'type', 'risk'].every(key => oldQuery.get(key) === query.get(key))),
      switchMap(([params, query]) => {
        this.macro.set(null); this.items.set([]); this.loading.set(true); this.error.set('');
        this.q = query.get('q') ?? '';
        this.unitId = query.get('unit') ?? '';
        this.processTypeId = query.get('type') ?? '';
        this.riskLevel = query.get('risk') ?? '';
        const id = Number(params.get('id'));
        if (!Number.isSafeInteger(id) || id <= 0) {
          this.error.set('Macroproceso no encontrado.'); this.loading.set(false); return of(null);
        }
        return forkJoin({
          map: this.api.map(),
          units: this.api.units(),
          items: this.api.listProcesses({
            macroprocessId: String(id),
            q: this.q,
            unitId: this.unitId,
            processTypeId: this.processTypeId,
            riskLevel: this.riskLevel
          })
        }).pipe(
          map(result => ({ ...result, id })),
          catchError(error => { this.error.set(errorMessage(error)); this.loading.set(false); return of(null); })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      if (!result) return;
      const family = result.map.macroprocessTypes.find(f => f.macroprocesses.some(m => m.id === result.id));
      this.macro.set(family?.macroprocesses.find(m => m.id === result.id) ?? null);
      this.family.set(family?.name ?? '');
      this.units.set(result.units.filter(unit => unit.isActive));
      this.items.set(result.items);
      if (!this.q && !this.unitId && !this.processTypeId && !this.riskLevel) {
        this.allProcesses.set(result.items);
      } else if (this.allProcesses().length === 0) {
        this.allProcesses.set(result.items);
      }
      this.loading.set(false);
      if (!this.macro()) this.error.set('Macroproceso no encontrado.');
    });
  }
}
