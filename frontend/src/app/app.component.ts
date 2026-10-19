import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { APP_NAME, HOME_URL } from './app.routes';
import { UiAppShellComponent } from './shared/ui';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, UiAppShellComponent],
  template: `
    <ui-app-shell [appName]="appName" [homeHref]="homeUrl"
      footerText="Jallupacha · Gestión interna de procesos">
      <nav class="app-nav" aria-label="Secciones">
        <a routerLink="/mapa" routerLinkActive="active" ariaCurrentWhenActive="page">Mapa de procesos</a>
        <a routerLink="/procesos" routerLinkActive="active" ariaCurrentWhenActive="page">Procesos</a>
        <a routerLink="/unidades" routerLinkActive="active" ariaCurrentWhenActive="page">Unidades internas</a>
        <a routerLink="/tipos-de-proceso" routerLinkActive="active" ariaCurrentWhenActive="page">Tipos de proceso</a>
      </nav>
      <router-outlet />
    </ui-app-shell>
  `
})
export class AppComponent {
  readonly appName = APP_NAME;
  readonly homeUrl = HOME_URL;
}
