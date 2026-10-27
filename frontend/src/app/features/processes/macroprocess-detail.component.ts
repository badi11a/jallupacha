import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subject, catchError, distinctUntilChanged, filter, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { ProcessApi, MapMacroprocess, ProcessListItem, UnitItem, errorMessage } from './process-api.service';
import { UiBadgeComponent, UiBadgeTone, UiBreadcrumbsComponent, UiMessageComponent } from '../../shared/ui';

@Component({
  selector: 'app-macroprocess-detail',
  imports: [FormsModule, RouterLink, UiBadgeComponent, UiBreadcrumbsComponent, UiMessageComponent],
  styleUrl: './macroprocess-detail.component.css',
  templateUrl: './macroprocess-detail.component.html'
})
export class MacroprocessDetailComponent implements OnInit {
  private readonly api = inject(ProcessApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly macro = signal<MapMacroprocess | null>(null);
  readonly family = signal('');
  readonly items = signal<ProcessListItem[]>([]);
  readonly units = signal<UnitItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  q = '';
  unitId = '';
  processTypeId = '';
  riskLevel = '';
  resultsUrl = '';
  private readonly retryLoad = new Subject<void>();

  mapQuery() { return { q: this.route.snapshot.queryParamMap.get('mapQ'), family: this.route.snapshot.queryParamMap.get('mapFamily') }; }
  reload(): void { this.retryLoad.next(); }

  readonly eyebrowText = computed(() => {
    const fam = this.family().toLowerCase();
    if (fam.includes('estratég') || fam.includes('estrateg')) return 'MACROPROCESO ESTRATÉGICO';
    if (fam.includes('mision')) return 'MACROPROCESO MISIONAL';
    if (fam.includes('apoyo')) return 'MACROPROCESO DE APOYO';
    return fam ? `MACROPROCESO · ${this.family().toUpperCase()}` : 'MACROPROCESO';
  });

  hasMacroDescription(): boolean {
    return Boolean(this.macroDescription());
  }

  macroDescription(): string {
    return this.macro()?.description?.trim() ?? '';
  }

  totalProcessCount(): number {
    return this.macro()?.processTypes.reduce((sum, type) => sum + type.processes.length, 0) ?? 0;
  }

  responsibleUnitsCount(): number {
    const source = this.items();
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
    void this.router.navigate([], { relativeTo: this.route, queryParams: { mapQ: this.mapQuery().q, mapFamily: this.mapQuery().family } });
  }

  applyFilters(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        mapQ: this.mapQuery().q,
        mapFamily: this.mapQuery().family,
        q: this.q || null,
        unit: this.unitId || null,
        type: this.processTypeId || null,
        risk: this.riskLevel || null
      }
    });
  }

  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      startWith(null),
      map(() => [this.route.snapshot.paramMap, this.route.snapshot.queryParamMap] as const),
      distinctUntilChanged(([oldParams, oldQuery], [params, query]) => oldParams.get('id') === params.get('id')
        && ['q', 'unit', 'type', 'risk'].every(key => oldQuery.get(key) === query.get(key))),
      switchMap(([params, query]) => this.retryLoad.pipe(startWith(undefined), switchMap(() => {
        this.macro.set(null); this.items.set([]); this.loading.set(true); this.error.set('');
        this.q = query.get('q') ?? '';
        this.unitId = query.get('unit') ?? '';
        this.processTypeId = query.get('type') ?? '';
        this.riskLevel = query.get('risk') ?? '';
        this.resultsUrl = this.router.url;
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
      }))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      if (!result) return;
      const family = result.map.macroprocessTypes.find(f => f.macroprocesses.some(m => m.id === result.id));
      this.macro.set(family?.macroprocesses.find(m => m.id === result.id) ?? null);
      this.family.set(family?.name ?? '');
      this.units.set(result.units.filter(unit => unit.isActive));
      this.items.set(result.items);
      this.loading.set(false);
      if (!this.macro()) this.error.set('Macroproceso no encontrado.');
    });
  }
}
