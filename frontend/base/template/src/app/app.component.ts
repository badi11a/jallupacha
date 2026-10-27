import { Component, ViewChild, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppSession } from './session';
import { LeavesWithConfirmation } from './core/platform';
import { UiDialogHostComponent, UiMessageComponent, UiModuleNavComponent } from './shared/ui';
@Component({ selector: 'app-root', host: { class: 'ui-root' },
  imports: [RouterOutlet, UiDialogHostComponent, UiMessageComponent, UiModuleNavComponent],
  template: `
    <a class="skip-link" href="#main-content">Ir al contenido principal</a>
    <ui-module-nav appName="Aplicación base" appLink="/inicio" [items]="[{ label: 'Inicio', link: '/inicio' }, { label: 'Ejemplo', link: '/ejemplo' }]">
      @if (session.isAuthenticated()) { <button sessionControls type="button" class="quiet-button" [disabled]="session.logoutInProgress()" (click)="logout()">Cerrar sesión</button> }
    </ui-module-nav>
    @if (session.logoutInProgress()) { <p role="status">Cerrando sesión…</p> }
    <main id="main-content" tabindex="-1" [attr.inert]="session.logoutInProgress() ? '' : null">
      @if (session.sessionError()) { <ui-message kind="error">{{ session.sessionError() }}</ui-message> }
      <router-outlet />
    </main><ui-dialog-host />`
})
export class AppComponent {
  readonly session = inject(AppSession);
  @ViewChild(RouterOutlet) private outlet?: RouterOutlet;
  async logout(): Promise<void> {
    if (this.session.logoutInProgress()) return;
    const page = this.outlet?.isActivated ? this.outlet.component as Partial<LeavesWithConfirmation> : null;
    if (page?.confirmLeave && !await page.confirmLeave()) return;
    await this.session.logout();
  }
}
