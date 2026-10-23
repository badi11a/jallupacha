import { Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

export interface UiModuleNavItem {
  label: string;
  link: string;
  matchPrefix?: string;
}

/**
 * Barra horizontal local del módulo: ligera, plana, no fija durante el scroll,
 * con título del módulo, lista de destinos con sección activa semántica y
 * ranura para controles de sesión separados.
 */
@Component({
  selector: 'ui-module-nav',
  imports: [RouterLink],
  template: `
    <header class="module-nav-header" role="banner">
      <div class="module-nav-container">
        <div class="module-nav-main">
          <a [routerLink]="appLink()" class="module-title">
            <strong>{{ appName() }}</strong>
          </a>
          <nav class="module-nav-list" [attr.aria-label]="navLabel()">
            <ul>
              @for (item of items(); track item.link) {
                <li>
                  <a [routerLink]="item.link"
                     [attr.aria-current]="currentLocation(item)"
                     [class.active]="isActive(item)">
                    {{ item.label }}
                  </a>
                </li>
              }
            </ul>
          </nav>
        </div>
        <div class="module-nav-session">
          <ng-content select="[sessionControls]" />
        </div>
      </div>
    </header>
  `,
  styles: [`
    .module-nav-header {
      display: block;
      background: var(--ui-color-surface);
      border-bottom: 1px solid var(--ui-color-border);
    }
    .module-nav-container {
      width: min(var(--ui-content-width), calc(100% - var(--ui-space-6)));
      margin: 0 auto;
      padding: 0.65rem 0;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem var(--ui-space-5);
    }
    .module-nav-main {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem 1.25rem;
    }
    .module-title {
      display: inline-flex;
      align-items: center;
      text-decoration: none;
      color: var(--brand-ink);
      font-size: var(--ui-font-size-md);
      font-weight: var(--ui-font-weight-heavy);
      letter-spacing: -0.02em;
    }
    .module-title:hover {
      color: var(--ui-color-primary);
    }
    .module-nav-list ul {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ui-space-1) var(--ui-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .module-nav-list a {
      display: inline-flex;
      align-items: center;
      padding: 0.35rem 0.65rem;
      color: var(--ui-color-text-muted);
      font-size: var(--ui-font-size-sm);
      font-weight: var(--ui-font-weight-medium);
      text-decoration: none;
      text-underline-offset: 0.45em;
      transition: color 0.15s ease;
    }
    .module-nav-list a:hover {
      color: var(--ui-color-primary);
      text-decoration: underline;
    }
    .module-nav-list a.active {
      color: var(--ui-color-primary);
      text-decoration: underline;
      text-decoration-thickness: 2px;
    }
    .module-nav-session {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      font-size: var(--ui-font-size-sm);
    }
  `]
})
export class UiModuleNavComponent {
  private readonly router = inject(Router);

  readonly appName = input.required<string>();
  readonly appLink = input<string>('/mapa');
  readonly navLabel = input<string>('Navegación del módulo');
  readonly items = input.required<UiModuleNavItem[]>();

  readonly currentUrl = signal(this.router.url);

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe((e) => {
        this.currentUrl.set(e.urlAfterRedirects ?? e.url);
      });
  }

  isActive(item: UiModuleNavItem): boolean {
    const raw = this.currentUrl() || this.router.url;
    const current = (raw || '').split(/[?#]/)[0];
    const prefix = item.matchPrefix ?? item.link;
    return current === prefix || current.startsWith(prefix + '/');
  }

  currentLocation(item: UiModuleNavItem): 'page' | 'location' | null {
    if (!this.isActive(item)) return null;
    const current = this.currentUrl().split(/[?#]/)[0];
    return current === item.link ? 'page' : 'location';
  }
}
