import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.logoutInProgress()) return false;

  if (auth.isAuthenticated()) {
    return true;
  }

  const returnUrl = state.url && state.url !== '/' && state.url !== '/login' ? state.url : undefined;
  return router.createUrlTree(['/login'], returnUrl ? { queryParams: { returnUrl } } : undefined);
};

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.logoutInProgress()) return false;

  if (!auth.isAuthenticated()) {
    const returnUrl = state.url && state.url !== '/' && state.url !== '/login' ? state.url : undefined;
    return router.createUrlTree(['/login'], returnUrl ? { queryParams: { returnUrl } } : undefined);
  }

  if (auth.isAdmin()) {
    return true;
  }

  return router.createUrlTree(['/mapa']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/mapa']);
  }

  return true;
};
