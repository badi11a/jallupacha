import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth/auth.guard';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService, USER_STORAGE_KEY } from './core/auth/auth.service';
import { LoginComponent } from './core/auth/login.component';
import { ProcessMapComponent } from './features/processes/process-map.component';
import { ProcessListComponent } from './features/processes/process-list.component';

@Component({ selector: 'app-dummy-protected', standalone: true, template: '<p>Protected content</p>' })
class DummyProtectedComponent {}

@Component({ selector: 'app-dummy-public', standalone: true, template: '<p>Public content</p>' })
class DummyPublicComponent {}

describe('Autenticación Local Institucional v15 (REQ-25)', () => {
  let authService: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [LoginComponent, DummyProtectedComponent, DummyPublicComponent, ProcessMapComponent, ProcessListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
          { path: 'mapa', component: DummyProtectedComponent, canActivate: [authGuard] },
          { path: 'procesos', component: DummyProtectedComponent, canActivate: [authGuard] },
          { path: 'usuarios', component: DummyProtectedComponent, canActivate: [adminGuard] }
        ])
      ]
    });

    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    sessionStorage.clear();
    httpMock.verify();
  });

  describe('AuthService', () => {
    it('inicia como no autenticado si sessionStorage está vacío', () => {
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.currentUser()).toBeNull();
      expect(authService.isAdmin()).toBe(false);
    });

    it('inicia sesión y mantiene identidad solo en memoria', async () => {
      const loginPromise = authService.login('admin@example.test', 'ClaveDemo2026!');

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'admin@example.test', password: 'ClaveDemo2026!' });
      expect(req.request.withCredentials).toBe(true);

      req.flush({
        authenticated: true,
        userId: 1,
        displayName: 'Usuario Administrador',
        email: 'admin@example.test',
        profiles: ['ADMIN', 'PROCESS_OWNER']
      });

      const user = await loginPromise;
      expect(user.userId).toBe(1);
      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.isAdmin()).toBe(true);
      expect(authService.isProcessOwner()).toBe(true);
      expect(authService.isRiskManager()).toBe(false);

      expect(sessionStorage.getItem(USER_STORAGE_KEY)).toBeNull();
    });

    it('cierra la sesión y limpia sessionStorage', async () => {
      // Setup authenticated user
      authService.currentUser.set({
        userId: 1,
        displayName: 'Usuario Administrador',
        email: 'admin@example.test',
        profiles: ['ADMIN']
      });
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authService.currentUser()));

      const logoutPromise = authService.logout();
      const req = httpMock.expectOne('/api/auth/logout');
      expect(req.request.method).toBe('POST');
      req.flush(null);

      await logoutPromise;
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.currentUser()).toBeNull();
      expect(sessionStorage.getItem(USER_STORAGE_KEY)).toBeNull();
    });
  });

  describe('authGuard, adminGuard & guestGuard', () => {
    it('adminGuard redirige a /login a usuarios no autenticados', async () => {
      await router.navigateByUrl('/usuarios');
      expect(router.url).toContain('/login');
    });

    it('adminGuard redirige a /mapa a usuarios autenticados sin perfil ADMIN', async () => {
      authService.currentUser.set({
        userId: 2,
        displayName: 'Usuario Consulta',
        email: 'consulta@example.test',
        profiles: ['CONSULTATION']
      });

      await router.navigateByUrl('/usuarios');
      expect(router.url).toBe('/mapa');
    });

    it('adminGuard permite el acceso a usuarios con perfil ADMIN', async () => {
      authService.currentUser.set({
        userId: 1,
        displayName: 'Usuario Admin',
        email: 'admin@example.test',
        profiles: ['ADMIN']
      });

      const success = await router.navigateByUrl('/usuarios');
      expect(success).toBe(true);
      expect(router.url).toBe('/usuarios');
    });
    it('redirige a /login al intentar acceder a rutas protegidas sin sesión', async () => {
      await router.navigateByUrl('/mapa');
      expect(router.url).toContain('/login');
    });

    it('permite acceder a rutas protegidas cuando el usuario está autenticado', async () => {
      authService.currentUser.set({
        userId: 1,
        displayName: 'Usuario',
        email: 'user@example.test',
        profiles: ['CONSULTATION']
      });

      const success = await router.navigateByUrl('/mapa');
      expect(success).toBe(true);
      expect(router.url).toBe('/mapa');
    });

    it('redirige al mapa si un usuario ya autenticado intenta ir a /login', async () => {
      authService.currentUser.set({
        userId: 1,
        displayName: 'Usuario',
        email: 'user@example.test',
        profiles: ['ADMIN']
      });

      await router.navigateByUrl('/login');
      expect(router.url).toBe('/mapa');
    });
  });

  describe('LoginComponent', () => {
    it('muestra el formulario institucional y valida campos requeridos', async () => {
      const fixture = TestBed.createComponent(LoginComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.login-panel')).not.toBeNull();
      expect(el.querySelector('#login-title')?.textContent).toContain('Acceso Institucional');
      expect(el.querySelector('.eyebrow')?.textContent).toContain('Sistema de Procesos Institucionales');

      const submitBtn = el.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);

      const emailInput = el.querySelector('#login-email') as HTMLInputElement;
      const passInput = el.querySelector('#login-password') as HTMLInputElement;

      emailInput.value = 'admin@example.test';
      emailInput.dispatchEvent(new Event('input'));
      passInput.value = 'ClaveDemo2026!';
      passInput.dispatchEvent(new Event('input'));

      fixture.detectChanges();
      await fixture.whenStable();

      expect(submitBtn.disabled).toBe(false);
    });

    it('conserva el correo y muestra mensaje de error ante fallo de autenticación (R-04)', async () => {
      const fixture = TestBed.createComponent(LoginComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      component.email = 'usuario@example.test';
      component.password = 'ClaveIncorrecta';

      const submitPromise = component.onSubmit();

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ message: 'Credenciales no válidas' }, { status: 401, statusText: 'Unauthorized' });

      await submitPromise;
      fixture.detectChanges();

      expect(component.errorMessage()).toContain('Credenciales no válidas');
      expect(component.email).toBe('usuario@example.test'); // R-04: data preserved
      expect(component.password).toBe(''); // sensitive password cleared

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('ui-message[kind="error"]')?.textContent).toContain('Credenciales no válidas');
    });
  });

  describe('Visibilidad de acciones según perfil institucional (PT-07)', () => {
    it('oculta acciones de creación a perfil CONSULTATION en el mapa', () => {
      authService.currentUser.set({
        userId: 2,
        displayName: 'Usuario Consulta',
        email: 'consulta@example.test',
        profiles: ['CONSULTATION']
      });
      const fixture = TestBed.createComponent(ProcessMapComponent);
      fixture.detectChanges();
      httpMock.expectOne('/api/management/map').flush({ macroprocessTypes: [] });

      fixture.componentInstance.map.set([
        {
          id: 1,
          name: 'Estratégicos',
          macroprocesses: [
            { id: 10, code: 'MP1', name: 'Macro 1', processTypes: [] }
          ]
        }
      ]);
      fixture.componentInstance.loading.set(false);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('a[href="/procesos/nuevo"]')).toBeNull();
      expect(el.querySelector('.macro-link')).not.toBeNull();
    });

    it('permite explorar macroprocesos a perfiles PROCESS_OWNER en el mapa sin acciones fuera de contexto', () => {
      authService.currentUser.set({
        userId: 1,
        displayName: 'Usuario Dueño',
        email: 'owner@example.test',
        profiles: ['PROCESS_OWNER']
      });
      const fixture = TestBed.createComponent(ProcessMapComponent);
      fixture.detectChanges();
      httpMock.expectOne('/api/management/map').flush({ macroprocessTypes: [] });

      fixture.componentInstance.map.set([
        {
          id: 1,
          name: 'Estratégicos',
          macroprocesses: [
            { id: 10, code: 'MP1', name: 'Macro 1', processTypes: [] }
          ]
        }
      ]);
      fixture.componentInstance.loading.set(false);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('a[href="/procesos/nuevo"]')).toBeNull();
      expect(el.querySelector('.macro-link')).not.toBeNull();
    });

    it('oculta administración de catálogos y creación a CONSULTATION en listado de procesos', () => {
      authService.currentUser.set({
        userId: 2,
        displayName: 'Usuario Consulta',
        email: 'consulta@example.test',
        profiles: ['CONSULTATION']
      });
      const fixture = TestBed.createComponent(ProcessListComponent);
      fixture.detectChanges();
      httpMock.expectOne('/api/management/process-types').flush([]);
      httpMock.expectOne('/api/management/units').flush([]);
      httpMock.expectOne('/api/management/processes').flush([]);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('a[href="/procesos/nuevo"]')).toBeNull();


    });

    it('muestra creación de procesos a ADMIN en listado de procesos', () => {
      authService.currentUser.set({
        userId: 1,
        displayName: 'Usuario Administrador',
        email: 'admin@example.test',
        profiles: ['ADMIN']
      });
      const fixture = TestBed.createComponent(ProcessListComponent);
      fixture.detectChanges();
      httpMock.expectOne('/api/management/process-types').flush([]);
      httpMock.expectOne('/api/management/units').flush([]);
      httpMock.expectOne('/api/management/processes').flush([]);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('a[href="/procesos/nuevo"]')).not.toBeNull();


    });
  });

  describe('authInterceptor', () => {
    it('agrega withCredentials: true a llamadas /api y redirige a /login ante 401', async () => {
      TestBed.resetTestingModule();
      sessionStorage.clear();
      TestBed.configureTestingModule({
        imports: [DummyProtectedComponent, LoginComponent],
        providers: [
          provideHttpClient(withInterceptors([authInterceptor])),
          provideHttpClientTesting(),
          provideRouter([
            { path: 'login', component: LoginComponent },
            { path: 'mapa', component: DummyProtectedComponent }
          ])
        ]
      });

      const http = TestBed.inject(HttpClient);
      const httpController = TestBed.inject(HttpTestingController);
      const auth = TestBed.inject(AuthService);
      const testRouter = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(testRouter, 'navigate');

      await testRouter.navigateByUrl('/mapa');

      auth.currentUser.set({
        userId: 1,
        displayName: 'Admin',
        email: 'admin@example.test',
        profiles: ['ADMIN']
      });
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(auth.currentUser()));

      let responseError = null;
      http.get('/api/users').subscribe({
        error: (err) => { responseError = err; }
      });

      const req = httpController.expectOne('/api/users');
      expect(req.request.withCredentials).toBe(true);
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      expect(responseError).toBeDefined();
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.currentUser()).toBeNull();
      expect(sessionStorage.getItem(USER_STORAGE_KEY)).toBeNull();
      expect(navigateSpy).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/mapa' } });
      httpController.verify();
    });
  });
});
