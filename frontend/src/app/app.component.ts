import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { UiBadgeComponent, UiDialogHostComponent, UiModuleNavComponent, UiModuleNavItem, UiMessageComponent } from './shared/ui';
import { LeavesWithConfirmation } from './core/auth/unsaved-changes.guard';

@Component({
  selector: 'app-root',
  host: { class: 'ui-root' },
  standalone: true,
  imports: [RouterOutlet, UiModuleNavComponent, UiBadgeComponent, UiDialogHostComponent, UiMessageComponent],
  template: `
    <a class="skip-link" href="#main-content" (click)="focusContent($event)">Ir al contenido principal</a>

    @if (auth.isAuthenticated()) {
      <ui-module-nav
        [attr.inert]="auth.logoutInProgress() ? '' : null"
        appName="Gestión de procesos"
        appLink="/mapa"
        [items]="navItems()">
        <div sessionControls class="session-controls">
          <span class="user-name">{{ auth.currentUser()?.displayName }}</span>
          @if (primaryProfileBadge()) {
            <ui-badge tone="neutral">{{ primaryProfileBadge() }}</ui-badge>
          }
          <button type="button" class="quiet-button logout-btn" [disabled]="logoutBusy()" (click)="logout()" aria-label="Cerrar sesión">Cerrar sesión</button>
        </div>
      </ui-module-nav>
    }

    @if (auth.logoutInProgress()) {
      <p class="session-status" role="status">Cerrando sesión…</p>
    }
    <main id="main-content" tabindex="-1"
      [attr.inert]="auth.logoutInProgress() ? '' : null"
      [attr.aria-busy]="auth.logoutInProgress() ? 'true' : null">
      @if (auth.sessionError()) { <ui-message kind="error">{{ auth.sessionError() }}</ui-message> }
      <router-outlet #outlet="outlet" />
    </main>
    <ui-dialog-host />
  `,
  styles: [`
    .session-status {
      width: min(var(--ui-content-width), calc(100% - 2rem));
      margin: 1rem auto 0;
      color: var(--ui-color-text);
    }
    .session-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      font-size: var(--ui-font-size-sm);
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
  readonly logoutBusy = signal(false);

  @ViewChild('outlet', { static: false }) private outlet?: RouterOutlet;

  readonly navItems = computed<UiModuleNavItem[]>(() => {
    const items: UiModuleNavItem[] = [
      { label: 'Mapa', link: '/mapa', matchPrefix: '/mapa' },
      { label: 'Procesos', link: '/procesos', matchPrefix: '/procesos' }
    ];

    if (this.auth.isAdmin()) {
      items.push(
        { label: 'Unidades internas', link: '/unidades', matchPrefix: '/unidades' },
        { label: 'Tipos de proceso', link: '/tipos-de-proceso', matchPrefix: '/tipos-de-proceso' },
        { label: 'Usuarios', link: '/usuarios', matchPrefix: '/usuarios' },
        { label: 'Auditoría', link: '/auditoria', matchPrefix: '/auditoria' }
      );
    }

    return items;
  });

  primaryProfile(): string {
    const profiles = this.auth.profiles();
    if (profiles.includes('ADMIN')) return 'Administrador';
    if (profiles.includes('PROCESS_OWNER')) return 'Dueño de proceso';
    if (profiles.includes('VALIDATOR')) return 'Validador';
    if (profiles.includes('RISK_MANAGER')) return 'Gestor de riesgos';
    if (profiles.includes('CONSULTATION')) return 'Consulta';
    return '';
  }

  primaryProfileBadge(): string {
    const profile = this.primaryProfile();
    if (!profile) return '';
    const name = (this.auth.currentUser()?.displayName || '').toLowerCase();
    const keywords: Record<string, string[]> = {
      'Administrador': ['administrador', 'admin'],
      'Dueño de proceso': ['dueño', 'responsable'],
      'Validador': ['validador', 'revisor'],
      'Gestor de riesgos': ['riesgo', 'riesgos'],
      'Consulta': ['consulta', 'lector']
    };
    const words = keywords[profile] ?? [profile.toLowerCase()];
    if (words.some((w) => name.includes(w))) return '';
    return profile;
  }

  async logout(): Promise<void> {
    if (this.logoutBusy() || this.auth.logoutInProgress()) return;
    this.logoutBusy.set(true);
    try {
      const comp = this.outlet?.isActivated ? (this.outlet.component as Partial<LeavesWithConfirmation>) : null;
      if (comp && typeof comp.confirmLeave === 'function') {
        if (!await comp.confirmLeave()) return;
      }
      await this.auth.logout();
    } finally {
      this.logoutBusy.set(false);
    }
  }

  focusContent(event: Event): void {
    event.preventDefault();
    const main = this.host.nativeElement.querySelector<HTMLElement>('#main-content');
    main?.focus({ preventScroll: true });
    main?.scrollIntoView?.({ block: 'start' });
  }
}
