import { Component, ElementRef, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';
import { UiBadgeComponent, UiDialogHostComponent } from './shared/ui';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, UiBadgeComponent, UiDialogHostComponent],
  template: `
    <a class="skip-link" href="#main-content" (click)="focusContent($event)">Ir al contenido principal</a>

    @if (auth.isAuthenticated()) {
      <header class="app-header" role="banner">
        <div class="header-container">
          <div class="header-brand">
            <a routerLink="/mapa" class="brand-link" aria-label="Ir al Mapa de procesos">
              <span class="brand-name">Gestión de Procesos</span>
            </a>
          </div>
          <nav class="nav-links" aria-label="Navegación principal">
            <a routerLink="/mapa" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Mapa</a>
            <a routerLink="/procesos" routerLinkActive="active">Procesos</a>
            @if (auth.isAdmin()) {
              <a routerLink="/usuarios" routerLinkActive="active">Usuarios</a>
              <a routerLink="/auditoria" routerLinkActive="active">Auditoría</a>
              <a routerLink="/unidades" routerLinkActive="active">Unidades</a>
              <a routerLink="/tipos-de-proceso" routerLinkActive="active">Tipos de proceso</a>
            }
          </nav>
          <div class="session-info">
            <span class="user-name">{{ auth.currentUser()?.displayName }}</span>
            @if (primaryProfile()) {
              <ui-badge tone="neutral">{{ primaryProfile() }}</ui-badge>
            }
            <button type="button" class="logout-btn" (click)="logout()" aria-label="Cerrar sesión">Cerrar sesión</button>
          </div>
        </div>
      </header>
    }

    <main id="main-content" tabindex="-1">
      <router-outlet />
    </main>
    <ui-dialog-host />
  `,
  styles: [`
    .app-header {
      background: var(--ui-color-surface);
      border-bottom: 1px solid var(--ui-color-border);
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 1px 3px rgba(34, 33, 63, 0.05);
    }
    .header-container {
      width: min(var(--ui-content-width), calc(100% - 2rem));
      margin: 0 auto;
      height: 3.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
    }
    .header-brand {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .brand-link {
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .brand-name {
      color: var(--brand-ink);
      font-weight: var(--ui-font-weight-heavy);
      font-size: var(--ui-font-size-md);
      letter-spacing: -0.02em;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex-wrap: wrap;
    }
    .nav-links a {
      display: inline-flex;
      align-items: center;
      padding: 0.35rem 0.65rem;
      border-radius: var(--ui-radius-md);
      color: var(--ui-color-text-muted);
      font-size: var(--ui-font-size-sm);
      font-weight: var(--ui-font-weight-medium);
      text-decoration: none;
      transition: color 0.15s ease, background 0.15s ease;
    }
    .nav-links a:hover {
      color: var(--ui-color-primary);
      background: var(--ui-color-surface-accent);
    }
    .nav-links a.active {
      color: var(--ui-color-primary);
      background: var(--ui-color-surface-accent);
      font-weight: var(--ui-font-weight-bold);
      border-bottom: 2px solid var(--brand-indigo);
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }
    .session-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: var(--ui-font-size-sm);
      flex-shrink: 0;
    }
    .user-name {
      color: var(--ui-color-text);
      font-weight: var(--ui-font-weight-medium);
    }
    .logout-btn {
      padding: 0.25rem 0.6rem;
      border: 1px solid var(--ui-color-border-strong);
      border-radius: var(--ui-radius-md);
      background: transparent;
      color: var(--ui-color-text);
      font-size: var(--ui-font-size-xs);
      font-weight: var(--ui-font-weight-medium);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .logout-btn:hover {
      color: var(--ui-color-error-text);
      border-color: var(--ui-color-error-text);
      background: var(--ui-color-error-background);
    }
  `]
})
export class AppComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly auth = inject(AuthService);

  primaryProfile(): string {
    const profiles = this.auth.profiles();
    if (profiles.includes('ADMIN')) return 'Administrador';
    if (profiles.includes('PROCESS_OWNER')) return 'Dueño de proceso';
    if (profiles.includes('VALIDATOR')) return 'Validador';
    if (profiles.includes('RISK_MANAGER')) return 'Gestor de riesgos';
    if (profiles.includes('CONSULTATION')) return 'Consulta';
    return '';
  }

  logout(): void {
    void this.auth.logout();
  }

  focusContent(event: Event): void {
    event.preventDefault();
    const main = this.host.nativeElement.querySelector<HTMLElement>('#main-content');
    main?.focus({ preventScroll: true });
    main?.scrollIntoView?.({ block: 'start' });
  }
}
