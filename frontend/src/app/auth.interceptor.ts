import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Interceptor de autenticación institucional (PT-07, PT-09):
 * 1. Asegura el envío de cookies de sesión institucional (withCredentials: true) en todas las solicitudes a /api.
 * 2. Si el servidor responde 401 Unauthorized en un endpoint protegido, invalida la sesión local expirada y redirige al acceso institucional.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const authReq = req.url.startsWith('/api') && !req.withCredentials
    ? req.clone({ withCredentials: true })
    : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.includes('/api/auth/login') &&
        !req.url.includes('/api/auth/logout')
      ) {
        auth.clearSession();
        const currentUrl = router.url;
        const returnUrl = currentUrl && currentUrl !== '/' && currentUrl !== '/login' ? currentUrl : undefined;
        void router.navigate(['/login'], returnUrl ? { queryParams: { returnUrl } } : undefined);
      }
      return throwError(() => error);
    })
  );
};
