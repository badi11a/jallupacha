import { inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withRouterConfig } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { AppSession, sessionConfig } from './app/session';
import { SESSION_CONFIG, provideCookieSessionHttp } from './app/core/platform';
import { provideUiNavigation } from './app/shared/ui';

bootstrapApplication(AppComponent, { providers: [
  provideZoneChangeDetection(), { provide: SESSION_CONFIG, useValue: sessionConfig },
  provideCookieSessionHttp(() => inject(AppSession)),
  provideAppInitializer(() => inject(AppSession).initialize()),
  provideRouter(routes, withRouterConfig({ canceledNavigationResolution: 'computed' })),
  provideUiNavigation({ appName: 'Aplicación base' })
] }).catch(() => { const root = document.querySelector('app-root'); if (root) root.textContent = 'No fue posible iniciar la aplicación.'; });
