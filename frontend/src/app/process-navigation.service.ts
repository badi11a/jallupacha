import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UiNavigationFocus } from './shared/ui';

/** Contexto de exploración propio del producto; nunca acepta una redirección externa. */
@Injectable({ providedIn: 'root' })
export class ProcessNavigation {
  private readonly router = inject(Router);
  private readonly focus = inject(UiNavigationFocus);

  resultsUrl(value: string | null): string | null {
    if (!value || !/^\/(?:procesos|mapa(?:\/macroprocesos\/[1-9]\d*)?)(?:\?|$)/.test(value)) return null;
    try {
      const tree = this.router.parseUrl(value);
      const allowed = ['q', 'macroprocessId', 'processTypeId', 'unitId', 'unit', 'type', 'risk', 'family', 'mapQ', 'mapFamily'];
      if (tree.fragment || Object.keys(tree.queryParams).some(key => !allowed.includes(key))) return null;
      return this.router.serializeUrl(tree);
    } catch { return null; }
  }

  returnTo(url: string): void {
    const safe = this.resultsUrl(url);
    if (!safe) return;
    this.focus.restoreOnNextNavigation(safe);
    void this.router.navigateByUrl(safe);
  }
}
