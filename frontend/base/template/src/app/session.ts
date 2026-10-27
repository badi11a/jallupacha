import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CookieSession, SessionConfig, createSessionInterceptor, createUnsavedChangesGuard } from './core/platform';

export const sessionConfig: SessionConfig = {
  apiPath: '/api', loginPath: '/login', homePath: '/inicio',
  loginEndpoint: '/api/auth/login', logoutEndpoint: '/api/auth/logout', identityEndpoint: '/api/auth/me',
  csrfCookieName: 'app_csrf', csrfHeaderName: 'X-CSRF-Token'
};
@Injectable({ providedIn: 'root' })
export class AppSession extends CookieSession {}
export const sessionInterceptor = createSessionInterceptor(() => inject(AppSession));
export const pendingGuard = createUnsavedChangesGuard(() => inject(AppSession));
export const sessionGuard: CanActivateFn = () => {
  const session = inject(AppSession);
  return session.isAuthenticated() || inject(Router).createUrlTree(['/login']);
};
