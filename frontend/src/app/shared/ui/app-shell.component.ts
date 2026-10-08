import { Component, input, output } from '@angular/core';
import { UiDialogHostComponent } from './dialog-host.component';

/**
 * Estructura común: marca, cuenta, aviso de entorno, contenido y pie.
 * El aviso de entorno se muestra aquí una sola vez; las pantallas no lo repiten.
 */
@Component({
  selector: 'ui-app-shell',
  imports: [UiDialogHostComponent],
  template: `
    <a class="skip-link" href="#main-content">Ir al contenido principal</a>
    <header class="topbar">
      <a class="brand" [href]="homeHref()" [attr.aria-label]="appName() + ', inicio'">
        <span class="brand-mark" aria-hidden="true">{{ brandMark() }}</span> {{ appName() }}
      </a>
      @if (accountLabel()) {
        <div class="account">
          <span>{{ accountLabel() }}</span>
          <button class="quiet-button" type="button" [disabled]="logoutDisabled()" (click)="logout.emit()">{{ logoutLabel() }}</button>
        </div>
      }
    </header>
    <main id="main-content" tabindex="-1">
      @if (environmentNotice()) { <p class="environment-notice">{{ environmentNotice() }}</p> }
      <ng-content />
    </main>
    <footer class="app-footer">{{ footerText() }}</footer>
    <ui-dialog-host />
  `
})
export class UiAppShellComponent {
  readonly appName = input.required<string>();
  readonly brandMark = input<string>('');
  readonly homeHref = input<string>('/');
  /** Texto de la cuenta activa; sin valor no se muestra el bloque de cuenta. */
  readonly accountLabel = input<string>('');
  readonly logoutLabel = input<string>('Cerrar sesión');
  readonly logoutDisabled = input<boolean>(false);
  readonly environmentNotice = input<string>('');
  readonly footerText = input<string>('');
  readonly logout = output<void>();
}
