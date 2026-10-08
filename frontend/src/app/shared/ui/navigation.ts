import { DOCUMENT } from '@angular/common';
import {
  EnvironmentProviders,
  Injectable,
  InjectionToken,
  Injector,
  afterNextRender,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterStateSnapshot, TitleStrategy } from '@angular/router';

export interface UiNavigationOptions {
  /** Nombre de la aplicación, agregado al título de cada pantalla. */
  appName: string;
  /** Selectores del encabezado que recibe el foco, en orden de prioridad; se usa el primero que exista. */
  headingSelectors?: string[];
}

const DEFAULT_HEADINGS = ['router-outlet + * h1', 'router-outlet + * h2', 'main h1', 'main h2'];
const UI_NAVIGATION_OPTIONS = new InjectionToken<Required<UiNavigationOptions>>('UI_NAVIGATION_OPTIONS', {
  factory: () => ({ appName: '', headingSelectors: DEFAULT_HEADINGS })
});
// Intentos para restaurar la posición mientras la pantalla termina de cargar datos.
const RESTORE_ATTEMPTS = 20;
const RESTORE_INTERVAL_MS = 50;

/** Título de pantalla: «<title de la ruta> · <aplicación>». */
@Injectable()
export class UiTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly options = inject(UI_NAVIGATION_OPTIONS);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot);
    this.title.setTitle(page ? `${page} · ${this.options.appName}` : this.options.appName);
  }
}

/**
 * Foco y desplazamiento al navegar en una aplicación de una sola página:
 * - cambio de ruta (no solo de parámetros): el foco va al encabezado del contenido;
 * - navegación nueva: la pantalla empieza arriba;
 * - Atrás/Adelante: se restaura la posición guardada de esa entrada del historial;
 * - la carga inicial y los cambios de parámetros no mueven foco ni desplazamiento.
 */
@Injectable({ providedIn: 'root' })
export class UiNavigationFocus {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly options = inject(UI_NAVIGATION_OPTIONS);
  private readonly positions = new Map<number, number>();
  private currentId = 0;
  private currentPath: string | null = null;
  private restoreFrom: number | null = null;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    // La restauración nativa competiría con la de este servicio al volver con Atrás/Adelante.
    const history = this.window?.history;
    if (history && 'scrollRestoration' in history) history.scrollRestoration = 'manual';
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.positions.set(this.currentId, this.window?.scrollY ?? 0);
        this.restoreFrom = event.navigationTrigger === 'popstate' ? event.restoredState?.navigationId ?? null : null;
      } else if (event instanceof NavigationEnd) {
        this.afterNavigation(event);
      } else if (event instanceof NavigationCancel || event instanceof NavigationError) {
        this.restoreFrom = null;
      }
    });
  }

  /** Lleva el foco al encabezado visible tras el próximo render (p. ej. al iniciar o cerrar sesión). */
  focusContent(): void {
    afterNextRender({ write: () => this.focusHeading() }, { injector: this.injector });
  }

  private afterNavigation(event: NavigationEnd): void {
    const path = event.urlAfterRedirects.split(/[?#]/)[0];
    const initial = this.currentPath === null;
    const pathChanged = path !== this.currentPath;
    this.currentPath = path;
    // El router registra este id en la entrada del historial (también al volver con Atrás/Adelante).
    this.currentId = event.id;
    const restoreTo = this.restoreFrom !== null ? this.positions.get(this.restoreFrom) : undefined;
    this.restoreFrom = null;
    if (initial || !pathChanged) return;
    afterNextRender({
      write: () => {
        this.focusHeading();
        if (restoreTo !== undefined) this.restoreScroll(restoreTo);
        else this.window?.scrollTo(0, 0);
      }
    }, { injector: this.injector });
  }

  private focusHeading(): void {
    const heading = this.options.headingSelectors
      .map((selector) => this.document.querySelector<HTMLElement>(selector))
      .find((element) => element !== null);
    if (!heading) return;
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }

  /** Reintenta mientras la pantalla carga sus datos y aún no alcanza la altura necesaria. */
  private restoreScroll(top: number, attempt = 0): void {
    const window = this.window;
    if (!window) return;
    window.scrollTo(0, top);
    if (Math.abs(window.scrollY - top) > 1 && attempt < RESTORE_ATTEMPTS) {
      setTimeout(() => this.restoreScroll(top, attempt + 1), RESTORE_INTERVAL_MS);
    }
  }

  private get window(): Window | null {
    return this.document.defaultView;
  }
}

/** Títulos por ruta y gestión de foco y desplazamiento al navegar. Requiere `provideRouter`. */
export function provideUiNavigation(options: UiNavigationOptions): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: UI_NAVIGATION_OPTIONS, useValue: { headingSelectors: DEFAULT_HEADINGS, ...options } },
    { provide: TitleStrategy, useClass: UiTitleStrategy },
    provideEnvironmentInitializer(() => inject(UiNavigationFocus).start())
  ]);
}
