import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    provideHttpClient(withXsrfConfiguration({
      cookieName: 'jallupacha_csrf',
      headerName: 'X-CSRF-Token'
    }))
  ]
}).catch(() => {
  const root = document.querySelector('app-root');
  if (root) root.textContent = 'No fue posible iniciar la aplicación.';
});
