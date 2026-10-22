import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';
import { AuthService, USER_STORAGE_KEY } from './auth.service';
import { LoginComponent } from './login.component';

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
      imports: [LoginComponent, DummyProtectedComponent, DummyPublicComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
          { path: 'mapa', component: DummyProtectedComponent, canActivate: [authGuard] },
          { path: 'procesos', component: DummyProtectedComponent, canActivate: [authGuard] }
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

    it('inicia sesión exitosamente y almacena el usuario en sessionStorage', async () => {
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

      const stored = JSON.parse(sessionStorage.getItem(USER_STORAGE_KEY) || '{}');
      expect(stored.userId).toBe(1);
      expect(stored.email).toBe('admin@example.test');
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

  describe('authGuard & guestGuard', () => {
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

      expect(component.errorMessage()).toBe('Credenciales no válidas');
      expect(component.email).toBe('usuario@example.test'); // R-04: data preserved
      expect(component.password).toBe(''); // sensitive password cleared

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('ui-message[kind="error"]')?.textContent).toContain('Credenciales no válidas');
    });
  });
});
