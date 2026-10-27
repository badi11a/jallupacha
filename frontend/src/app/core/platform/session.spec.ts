import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService, PRODUCT_SESSION_CONFIG, USER_STORAGE_KEY } from '../auth/auth.service';
import { provideCookieSessionHttp } from './session-interceptor';
import { internalUrl, isApiUrl } from './internal-url';
import { SESSION_CONFIG } from './session-config';
import { errorMessage } from './http-errors';
import { HttpErrorResponse } from '@angular/common/http';

@Component({ template: '<h1>Inicio</h1>' })
class EmptyPage {}
const USER = { userId: 1, displayName: 'Persona de prueba', email: 'persona@example.test', profiles: ['CONSULTATION'] as const };
const identity = () => ({ ...USER, profiles: [...USER.profiles] });

describe('STD-FE-001: sesión y límites HTTP', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let client: HttpClient;
  let router: Router;
  beforeEach(() => {
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ ...identity(), profiles: ['ADMIN'] }));
    TestBed.configureTestingModule({ providers: [
      { provide: SESSION_CONFIG, useValue: PRODUCT_SESSION_CONFIG },
      provideCookieSessionHttp(() => inject(AuthService)),
      provideHttpClientTesting(), provideRouter([{ path: 'login', component: EmptyPage }, { path: 'mapa', component: EmptyPage }])
    ] });
    auth = TestBed.inject(AuthService); http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient); router = TestBed.inject(Router);
  });
  afterEach(() => {
    http.verify(); sessionStorage.clear();
    TestBed.inject(DOCUMENT).cookie = 'jallupacha_csrf=; Max-Age=0; Path=/';
    vi.restoreAllMocks();
  });

  it('ignora almacenamiento manipulado y deduplica la identificación remota', async () => {
    expect(auth.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(USER_STORAGE_KEY)).toBeNull();
    const first = auth.initialize(), second = auth.initialize();
    expect(first).toBe(second);
    http.expectOne('/api/auth/me').flush(identity());
    await first;
    expect(auth.profiles()).toEqual(['CONSULTATION']);
    expect(auth.initialized()).toBe(true);
  });

  it.each([{}, { ...identity(), profiles: ['UNKNOWN'] }, { ...identity(), userId: '1' }])('falla cerrado ante identidad inválida %j', async raw => {
    const ready = auth.initialize(); http.expectOne('/api/auth/me').flush(raw); await ready;
    expect(auth.isAuthenticated()).toBe(false); expect(auth.sessionError()).not.toBe('');
  });

  it('una consulta anterior no restaura la identidad después de logout', async () => {
    const ready = auth.refresh(); const old = http.expectOne('/api/auth/me');
    auth.currentUser.set(identity());
    const closing = auth.logout(); http.expectOne('/api/auth/logout').flush(null);
    old.flush(identity()); await Promise.all([ready, closing]);
    expect(auth.currentUser()).toBeNull(); expect(router.url).toBe('/login');
  });

  it('un fallo de logout mantiene la tarea y ofrece reintento', async () => {
    auth.currentUser.set(identity());
    const closing = auth.logout(); http.expectOne('/api/auth/logout').flush({}, { status: 403, statusText: 'Forbidden' });
    await closing;
    expect(auth.isAuthenticated()).toBe(true); expect(auth.sessionError()).toContain('Intente nuevamente');
    expect(auth.logoutInProgress()).toBe(false); expect(router.url).not.toBe('/login');
  });

  it('una respuesta de login tardía no revierte una expiración', async () => {
    const login = auth.login('persona@example.test', 'Contraseña de prueba');
    auth.clearSession(); http.expectOne('/api/auth/login').flush(identity());
    await expect(login).rejects.toThrow('superseded'); expect(auth.currentUser()).toBeNull();
  });

  it('envía cookie/CSRF solo a API del mismo origen, incluida URL absoluta equivalente', () => {
    const document = TestBed.inject(DOCUMENT);
    document.cookie = 'jallupacha_csrf=generic-csrf; Path=/';
    for (const url of ['/api/records', document.location.origin + '/api/records']) {
      client.post(url, {}).subscribe();
      const request = http.expectOne('/api/records');
      expect(request.request.withCredentials).toBe(true);
      expect(request.request.headers.get('X-CSRF-Token')).toBe('generic-csrf'); request.flush({});
    }
    for (const url of ['/apiculture', '/api-other', 'https://external.example.test/api/records']) {
      client.post(url, {}).subscribe(); const request = http.expectOne(url);
      expect(request.request.withCredentials).toBe(false);
      expect(request.request.headers.has('X-CSRF-Token')).toBe(false); request.flush({});
    }
  });

  it('un 401 externo no afecta la sesión y los internos concurrentes solo navegan una vez', async () => {
    auth.currentUser.set(identity()); const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    client.get('https://external.example.test/data').subscribe({ error: () => {} });
    http.expectOne('https://external.example.test/data').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBe(true); expect(navigate).not.toHaveBeenCalled();
    for (const path of ['/api/one', '/api/two']) {
      client.get(path).subscribe({ error: () => {} }); http.expectOne(path).flush({}, { status: 401, statusText: 'Unauthorized' });
    }
    expect(navigate).toHaveBeenCalledTimes(1); expect(auth.currentUser()).toBeNull();
    await Promise.resolve();
  });

  it('reconcilia perfiles tras 403 sin reintentar la escritura', async () => {
    auth.currentUser.set({ ...identity(), profiles: ['ADMIN'] });
    client.patch('/api/records/1', {}).subscribe({ error: () => {} });
    http.expectOne('/api/records/1').flush({}, { status: 403, statusText: 'Forbidden' });
    http.expectOne('/api/auth/me').flush(identity()); await vi.waitFor(() => expect(auth.isAdmin()).toBe(false));
    http.expectNone('/api/records/1');
  });

  it.each(['//external.test', '/mapa\\external', '/mapa(aux:admin)', '/%2fexternal', '/mapa\n'])('rechaza retorno ambiguo %s', value => {
    expect(internalUrl(router, value)).toBeNull();
  });
  it('conserva filtros locales y oculta detalles de fallos internos', () => {
    expect(internalUrl(router, '/procesos?q=gesti%C3%B3n')).toBe('/procesos?q=gesti%C3%B3n');
    expect(internalUrl(router, '/procesos?q=a%2Fb')).toBe('/procesos?q=a%2Fb');
    expect(isApiUrl('/apiary', '/api', 'https://local.example.test')).toBe(false);
    expect(errorMessage(new HttpErrorResponse({ status: 500, error: { message: 'Internal sensitive detail' } }))).toBe('No se pudo completar la operación.');
  });

  it('no concede identidad ante una respuesta de login no autenticada', async () => {
    const login = auth.login('persona@example.test', 'Dato de prueba');
    http.expectOne('/api/auth/login').flush({ ...identity(), authenticated: false });
    await expect(login).rejects.toThrow('Invalid login response'); expect(auth.isAuthenticated()).toBe(false);
  });
});
