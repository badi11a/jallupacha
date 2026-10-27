import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, inject } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { AuthService, ProfileCode } from './core/auth/auth.service';
import { UiDialogService } from './shared/ui';
import { LeavesWithConfirmation, unsavedChangesGuard } from './core/auth/unsaved-changes.guard';

@Component({ template: '<h1>Contenido de revisión</h1>' })
class CleanViewComponent {}

@Component({ template: '<h1>Formulario de revisión</h1><label>Nombre<input (input)="dirty = true" /></label>' })
class DirtyViewComponent implements LeavesWithConfirmation {
  private readonly dialogs = inject(UiDialogService);
  dirty = false;
  confirmations = 0;

  confirmLeave(): boolean | Promise<boolean> {
    this.confirmations++;
    return !this.dirty || this.dialogs.confirm({
      title: 'Cambios no guardados', message: 'Hay cambios pendientes.',
      confirmLabel: 'Descartar cambios', cancelLabel: 'Continuar editando'
    });
  }
}

describe('Navegación del módulo y cierre de sesión (C-030)', () => {
  let fixture: ComponentFixture<AppComponent>;
  let auth: AuthService;
  let http: HttpTestingController;
  let router: Router;
  let dialogs: UiDialogService;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([
        { path: 'login', component: CleanViewComponent, canActivate: [guestGuard] },
        { path: 'mapa', component: CleanViewComponent, canActivate: [authGuard] },
        { path: 'mapa/macroprocesos/:id', component: CleanViewComponent, canActivate: [authGuard] },
        { path: 'procesos', component: CleanViewComponent, canActivate: [authGuard] },
        { path: 'procesos/nuevo', component: DirtyViewComponent, canActivate: [authGuard], canDeactivate: [unsavedChangesGuard] },
        { path: 'procesos/:id', component: DirtyViewComponent, canActivate: [authGuard], canDeactivate: [unsavedChangesGuard] },
        { path: 'unidades', component: DirtyViewComponent, canActivate: [authGuard], canDeactivate: [unsavedChangesGuard] }
      ])]
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    dialogs = TestBed.inject(UiDialogService);
    setProfile('ADMIN');
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).classList.contains('ui-root')).toBe(true);
    await go('/mapa');
  });

  afterEach(() => {
    http.verify();
    fixture.destroy();
    sessionStorage.clear();
  });

  function setProfile(profile: ProfileCode): void {
    auth.currentUser.set({ userId: 1, displayName: 'Usuario de revisión', email: 'revision@example.test', profiles: [profile] });
  }

  async function go(url: string): Promise<void> {
    await router.navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function changeForm(): DirtyViewComponent {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'Cambio pendiente';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    return fixture.debugElement.query(By.directive(DirtyViewComponent)).componentInstance;
  }

  it('oculta la navegación en la pantalla de acceso sin sesión', async () => {
    auth.clearSession();
    await go('/login');
    expect(fixture.nativeElement.querySelector('ui-module-nav')).toBeNull();
  });

  it('mantiene los seis destinos completos y en orden para ADMIN', () => {
    const links = [...fixture.nativeElement.querySelectorAll('.module-nav-list a')] as HTMLAnchorElement[];
    expect(links.map(a => a.textContent?.trim())).toEqual([
      'Mapa', 'Procesos', 'Unidades internas', 'Tipos de proceso', 'Usuarios', 'Auditoría'
    ]);
  });

  it.each<ProfileCode>(['CONSULTATION', 'PROCESS_OWNER', 'VALIDATOR', 'RISK_MANAGER'])('muestra solo los destinos operativos para %s', profile => {
    setProfile(profile);
    fixture.detectChanges();
    const links = [...fixture.nativeElement.querySelectorAll('.module-nav-list a')] as HTMLAnchorElement[];
    expect(links.map(a => a.textContent?.trim())).toEqual(['Mapa', 'Procesos']);
  });

  it('evita duplicar el rol cuando el nombre de usuario ya expresa el perfil asignado', () => {
    auth.currentUser.set({ userId: 1, displayName: 'Usuario Administrador', email: 'admin@example.test', profiles: ['ADMIN'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.session-controls ui-badge')).toBeNull();
    expect(fixture.nativeElement.querySelector('.session-controls .user-name').textContent).toBe('Usuario Administrador');
  });

  it('muestra la insignia del perfil cuando el nombre de usuario no contiene el rol', () => {
    auth.currentUser.set({ userId: 1, displayName: 'Constanza Valenzuela', email: 'cvalenzuela@example.test', profiles: ['ADMIN'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.session-controls ui-badge')?.textContent?.trim()).toBe('Administrador');
    expect(fixture.nativeElement.querySelector('.session-controls .user-name').textContent).toBe('Constanza Valenzuela');
  });

  it.each([
    ['/mapa', 'Mapa', 'page'], ['/mapa/macroprocesos/2', 'Mapa', 'location'],
    ['/procesos?q=consulta', 'Procesos', 'page'], ['/procesos/nuevo', 'Procesos', 'location'],
    ['/procesos/4', 'Procesos', 'location']
  ])('distingue página y sección en %s', async (url, label, current) => {
    await go(url);
    const active = fixture.nativeElement.querySelector('.module-nav-list a.active') as HTMLAnchorElement;
    expect(active.textContent?.trim()).toBe(label);
    expect(active.getAttribute('aria-current')).toBe(current);
    expect(fixture.nativeElement.querySelectorAll('.module-nav-list a[aria-current]')).toHaveLength(1);
  });

  it('cierra desde un formulario limpio sin mostrar confirmación', async () => {
    await go('/procesos/nuevo');
    const closing = fixture.componentInstance.logout();
    await Promise.resolve();
    expect(dialogs.active()).toBeNull();
    http.expectOne('/api/auth/logout').flush(null);
    await closing;
    expect(router.url).toBe('/login');
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.logoutInProgress()).toBe(false);
  });

  it('conserva formulario y sesión cuando se cancela el cierre', async () => {
    await go('/procesos/nuevo');
    const form = changeForm();
    const closing = fixture.componentInstance.logout();
    expect(dialogs.active()?.options.title).toBe('Cambios no guardados');
    dialogs.settle(false);
    await closing;
    http.expectNone('/api/auth/logout');
    expect(router.url).toBe('/procesos/nuevo');
    expect(auth.isAuthenticated()).toBe(true);
    expect(form.dirty).toBe(true);
    expect(fixture.componentInstance.logoutBusy()).toBe(false);
  });

  it('confirma una sola vez y bloquea navegación y edición hasta terminar la revocación', async () => {
    await go('/procesos/nuevo');
    const form = changeForm();
    const closing = fixture.componentInstance.logout();
    dialogs.settle(true);
    await Promise.resolve();
    fixture.detectChanges();
    const request = http.expectOne('/api/auth/logout');
    expect(auth.isAuthenticated()).toBe(true);
    expect(fixture.nativeElement.querySelector('main').hasAttribute('inert')).toBe(true);
    expect(fixture.nativeElement.querySelector('ui-module-nav').hasAttribute('inert')).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Cerrando sesión');
    expect(await router.navigateByUrl('/unidades')).toBe(false);
    expect(await router.navigateByUrl('/login')).toBe(false);
    expect(router.url).toBe('/procesos/nuevo');
    await fixture.componentInstance.logout();
    http.expectNone('/api/auth/logout');
    request.flush(null);
    await closing;
    expect(router.url).toBe('/login');
    expect(form.confirmations).toBe(1);
    expect(dialogs.active()).toBeNull();
    expect(auth.logoutInProgress()).toBe(false);

    // Una sesión posterior sigue protegida: no queda ninguna excepción global.
    setProfile('ADMIN');
    await go('/procesos/nuevo');
    changeForm();
    const leaving = router.navigateByUrl('/mapa');
    await vi.waitFor(() => expect(dialogs.active()).not.toBeNull());
    dialogs.settle(false);
    expect(await leaving).toBe(false);
  });

  it('impide abrir formularios durante logout desde una pantalla sin canDeactivate', async () => {
    const closing = fixture.componentInstance.logout();
    const request = http.expectOne('/api/auth/logout');
    expect(await router.navigateByUrl('/procesos/nuevo')).toBe(false);
    request.flush(null);
    await closing;
    expect(router.url).toBe('/login');
  });
});
