import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withInterceptors, withNoXsrfProtection } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { isApiUrl } from './internal-url';
import { SessionConfig } from './session-config';

export interface SessionAccess {
  readonly config: SessionConfig;
  refresh(): Promise<void>;
  expire(): void;
}

/** Register credentials and bounded CSRF together, so consumers cannot accidentally omit half the protection. */
export function provideCookieSessionHttp(resolveSession: () => SessionAccess) {
  return provideHttpClient(withNoXsrfProtection(), withInterceptors([createSessionInterceptor(resolveSession)]));
}

/** Bounded credentials and double-submit CSRF. Disable the unbounded default XSRF interceptor in the composition root. */
export function createSessionInterceptor(resolveSession: () => SessionAccess): HttpInterceptorFn {
  return (request, next) => {
    const session = resolveSession();
    const document = inject(DOCUMENT);
    const origin = document.location?.origin ?? 'http://localhost';
    if (!isApiUrl(request.url, session.config.apiPath, origin)) return next(request);
    const url = new URL(request.url, origin);
    let headers = request.headers;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      headers = headers.delete(session.config.csrfHeaderName);
      const name = session.config.csrfCookieName;
      const raw = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith(name + '='));
      if (raw) {
        try { headers = headers.set(session.config.csrfHeaderName, decodeURIComponent(raw.slice(name.length + 1))); }
        catch { /* The API rejects missing CSRF; never use a malformed cookie. */ }
      }
    }
    const protectedRequest = request.clone({ url: url.pathname + url.search, headers, withCredentials: true });
    const sessionEndpoint = [session.config.loginEndpoint, session.config.logoutEndpoint, session.config.identityEndpoint].includes(url.pathname);
    return next(protectedRequest).pipe(catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && !sessionEndpoint) {
        if (error.status === 401) session.expire();
        else if (error.status === 403) void session.refresh();
      }
      return throwError(() => error);
    }));
  };
}
