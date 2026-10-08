import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withRouterConfig } from '@angular/router';
import { AppComponent } from './app/app.component';
import { APP_NAME, routes } from './app/app.routes';
import { provideUiNavigation } from './app/shared/ui';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    // 'computed' restablece la dirección visible si una guarda cancela Atrás/Adelante.
    provideRouter(routes, withRouterConfig({ canceledNavigationResolution: 'computed' })),
    // Títulos por pantalla y foco/desplazamiento al navegar (C-007).
    provideUiNavigation({ appName: APP_NAME }),
    provideHttpClient(withXsrfConfiguration({
      cookieName: 'jallupacha_csrf',
      headerName: 'X-CSRF-Token'
    }))
  ]
}).catch(() => {
  const root = document.querySelector('app-root');
  if (root) root.textContent = 'No fue posible iniciar la aplicación.';
});
