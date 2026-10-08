import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withRouterConfig } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    // 'computed' restablece la dirección visible si una guarda cancela Atrás/Adelante.
    provideRouter(routes, withRouterConfig({ canceledNavigationResolution: 'computed' })),
    provideHttpClient(withXsrfConfiguration({
      cookieName: 'jallupacha_csrf',
      headerName: 'X-CSRF-Token'
    }))
  ]
}).catch(() => {
  const root = document.querySelector('app-root');
  if (root) root.textContent = 'No fue posible iniciar la aplicación.';
});
