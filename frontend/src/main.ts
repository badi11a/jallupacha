import { inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withRouterConfig } from '@angular/router';
import { AppComponent } from './app/app.component';
import { APP_NAME, routes } from './app/app.routes';
import { AuthService, PRODUCT_SESSION_CONFIG } from './app/core/auth/auth.service';
import { SESSION_CONFIG, provideCookieSessionHttp } from './app/core/platform';
import { provideUiNavigation } from './app/shared/ui';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    { provide: SESSION_CONFIG, useValue: PRODUCT_SESSION_CONFIG },
    provideAppInitializer(() => inject(AuthService).initialize()),
    // 'computed' restablece la dirección visible si una guarda cancela Atrás/Adelante.
    provideRouter(routes, withRouterConfig({ canceledNavigationResolution: 'computed' })),
    // Títulos por pantalla y foco/desplazamiento al navegar (C-007).
    provideUiNavigation({ appName: APP_NAME }),
    provideCookieSessionHttp(() => inject(AuthService))
  ]
}).catch(() => {
  const root = document.querySelector('app-root');
  if (root) root.textContent = 'No fue posible iniciar la aplicación.';
});
