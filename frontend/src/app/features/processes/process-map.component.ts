import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { UiMessageComponent } from '../../shared/ui';
import { ProcessApi, MapFamily, MapMacroprocess } from './process-api.service';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

@Component({
  selector: 'app-process-map',
  imports: [RouterLink, UiMessageComponent],
  templateUrl: './process-map.component.html',
  styleUrl: './process-map.component.css'
})
export class ProcessMapComponent implements OnInit {
  private readonly api = inject(ProcessApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);
  readonly map = signal<MapFamily[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly filter = signal('');
  readonly selectedFamily = signal<number | null>(null);

  filteredMap(): MapFamily[] {
    const term = normalize(this.filter());
    return this.map()
      .filter(family => this.selectedFamily() === null || family.id === this.selectedFamily())
      .map(family => ({ ...family, macroprocesses: family.macroprocesses.filter(macro => !term || normalize(`${macro.code} ${macro.name}`).includes(term)) }))
      .filter(family => family.macroprocesses.length > 0);
  }

  familyTone(family: MapFamily): string {
    const name = normalize(family.name);
    return name === 'misionales' ? 'mission' : name === 'de apoyo' ? 'support' : 'strategic';
  }

  macroDescription(macro: MapMacroprocess): string {
    return macro.description?.trim() ?? '';
  }

  familyTitle(family: MapFamily): string {
    const name = family.name.trim();
    if (name.toLowerCase().startsWith('de ')) {
      return `Procesos ${name.charAt(0).toLowerCase()}${name.slice(1)}`;
    }
    return `Procesos ${name}`;
  }

  hasMacroDescription(macro: MapMacroprocess): boolean {
    return Boolean(this.macroDescription(macro));
  }

  processCount(macro: MapMacroprocess): number { return macro.processTypes.reduce((sum, type) => sum + type.processes.length, 0); }
  totalCount(): number { return this.map().reduce((sum, family) => sum + family.macroprocesses.reduce((count, macro) => count + this.processCount(macro), 0), 0); }
  typeCount(): number { return this.map().reduce((sum, family) => sum + family.macroprocesses.reduce((count, macro) => count + macro.processTypes.length, 0), 0); }
  macroCount(): number { return this.map().reduce((sum, family) => sum + family.macroprocesses.length, 0); }
  visibleCount(): number { return this.filteredMap().reduce((sum, family) => sum + family.macroprocesses.length, 0); }

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.filter.set(params.get('q') ?? '');
      const family = Number(params.get('family'));
      this.selectedFamily.set(Number.isSafeInteger(family) && family > 0 ? family : null);
    });
    this.load();
  }

  updateFilter(value: string): void { this.filter.set(value); this.updateAddress(); }
  updateFamily(value: number | null): void { this.selectedFamily.set(value); this.updateAddress(); }
  private updateAddress(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { q: this.filter() || null, family: this.selectedFamily() }, replaceUrl: true });
  }

  load(): void {
    this.loading.set(true); this.error.set('');
    this.api.map().subscribe({
      next: response => { this.map.set(response.macroprocessTypes); this.loading.set(false); },
      error: () => { this.error.set('No fue posible cargar el mapa. Intenta nuevamente más tarde.'); this.loading.set(false); }
    });
  }
}
