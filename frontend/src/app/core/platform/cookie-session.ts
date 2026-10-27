import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SESSION_CONFIG, SessionIdentity, parseSessionIdentity } from './session-config';
import { internalUrl, isApiUrl } from './internal-url';

/** Reusable state machine. Product roles and labels belong to an adapter. */
export abstract class CookieSession<T extends SessionIdentity = SessionIdentity> {
  protected readonly http = inject(HttpClient);
  protected readonly router = inject(Router);
  readonly config = inject(SESSION_CONFIG);
  readonly currentUser = signal<T | null>(null);
  readonly initialized = signal(false);
  readonly logoutInProgress = signal(false);
  readonly sessionError = signal('');
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  private generation = 0;
  private pending: Promise<void> | null = null;
  private expiryNavigation: Promise<boolean> | null = null;
  private readonly timeout = this.config.requestTimeoutMs ?? 10000;

  constructor() {
    if (!Number.isSafeInteger(this.timeout) || this.timeout < 1 || this.timeout > 120000) throw new Error('Invalid session timeout configuration');
    const origin = inject(DOCUMENT).location?.origin ?? 'http://localhost';
    for (const endpoint of [this.config.loginEndpoint, this.config.logoutEndpoint, this.config.identityEndpoint]) {
      if (!endpoint.startsWith('/') || !isApiUrl(endpoint, this.config.apiPath, origin) || /[?#]/.test(endpoint)) {
        throw new Error('Session endpoints must belong to the configured same-origin API');
      }
    }
    if (!internalUrl(this.router, this.config.loginPath) || !internalUrl(this.router, this.config.homePath)) {
      throw new Error('Session navigation must stay inside the application');
    }
  }

  protected parseIdentity(raw: unknown): T { return parseSessionIdentity(raw) as T; }

  initialize(): Promise<void> {
    if (this.initialized()) return Promise.resolve();
    return this.refresh();
  }

  refresh(): Promise<void> {
    if (this.logoutInProgress()) return Promise.resolve();
    if (this.pending) return this.pending;
    const generation = this.generation;
    const operation = firstValueFrom(this.http.get<unknown>(this.config.identityEndpoint, { withCredentials: true, timeout: this.timeout }))
      .then(raw => {
        if (generation !== this.generation) return;
        this.currentUser.set(this.parseIdentity(raw));
        this.sessionError.set('');
      }).catch((error: unknown) => {
        if (generation !== this.generation) return;
        this.currentUser.set(null);
        this.sessionError.set(error instanceof HttpErrorResponse && error.status === 401
          ? '' : 'No fue posible verificar la sesión. Intente nuevamente.');
      }).finally(() => {
        if (generation === this.generation) this.initialized.set(true);
        if (this.pending === operation) this.pending = null;
      });
    this.pending = operation;
    return operation;
  }

  async login(email: string, password: string): Promise<T> {
    const generation = ++this.generation;
    this.pending = null;
    const raw = await firstValueFrom(this.http.post<unknown>(this.config.loginEndpoint, { email, password }, { withCredentials: true, timeout: this.timeout }));
    if (generation !== this.generation) throw new Error('Session operation superseded');
    if (!raw || typeof raw !== 'object' || (raw as Record<string, unknown>)['authenticated'] !== true) throw new Error('Invalid login response');
    const user = this.parseIdentity(raw);
    this.currentUser.set(user);
    this.initialized.set(true);
    this.sessionError.set('');
    return user;
  }

  async logout(): Promise<void> {
    if (this.logoutInProgress()) return;
    this.logoutInProgress.set(true);
    this.sessionError.set('');
    ++this.generation;
    this.pending = null;
    try {
      try {
        await firstValueFrom(this.http.post<void>(this.config.logoutEndpoint, {}, { withCredentials: true, timeout: this.timeout }));
      } catch (error: unknown) {
        if (!(error instanceof HttpErrorResponse && error.status === 401)) {
          this.sessionError.set('No fue posible cerrar la sesión. Intente nuevamente.');
          return;
        }
      }
      this.clearSession();
      try {
        if (!await this.router.navigateByUrl(this.config.loginPath)) this.sessionError.set('La sesión se cerró. Abra la pantalla de acceso para continuar.');
      } catch { this.sessionError.set('La sesión se cerró. Abra la pantalla de acceso para continuar.'); }
    } finally { this.logoutInProgress.set(false); }
  }

  clearSession(): void {
    ++this.generation;
    this.pending = null;
    this.currentUser.set(null);
    this.initialized.set(true);
  }

  expire(): void {
    if (this.expiryNavigation) return;
    this.clearSession();
    const target = internalUrl(this.router, this.router.url);
    const returnUrl = target && target !== '/' && target.split('?')[0] !== this.config.loginPath ? target : undefined;
    this.expiryNavigation = this.router.navigate([this.config.loginPath], returnUrl ? { queryParams: { returnUrl } } : undefined)
      .catch(() => { this.sessionError.set('La sesión terminó. Inicie sesión nuevamente.'); return false; })
      .finally(() => { this.expiryNavigation = null; });
  }
}
