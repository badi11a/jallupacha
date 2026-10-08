import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { routes } from './app.routes';

const ADMIN = { userId: 1, displayName: 'Usuario administrador', email: 'admin@example.test', profiles: ['ADMIN'] };
const CONSULTATION = { userId: 4, displayName: 'Usuario consulta', email: 'consultation@example.test', profiles: ['CONSULTATION'] };
const PROCESS = {
  id: 8, code: 'PR8', name: 'Proceso', macroprocessId: 1, macroprocessName: 'Estratégicos', processTypeId: 2,
  processTypeName: 'Institucional', ownerUserId: 1, ownerDisplayName: 'Usuario administrador', status: 'Borrador',
  revision: 1, versionNumber: 1, parentProcessId: null
};
// Paneles que C-008 retira de la estructura común.
const ADMIN_PANELS = /Estructura|Clasificación|Perfiles de usuario|Auditoría reciente/i;

describe('AppComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideZoneChangeDetection(),
        provideRouter(routes),
        provideHttpClient(withXsrfConfiguration({
          cookieName: 'jallupacha_csrf',
          headerName: 'X-CSRF-Token'
        })),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Responde todas las peticiones pendientes de las pantallas de procesos con datos mínimos. */
  function flushScreens(): void {
    http.match(() => true).forEach((request: TestRequest) => {
      const url = request.request.urlWithParams;
      if (url === '/api/process-map') request.flush({ macroprocesses: [] });
      else if (url.startsWith('/api/processes?')) request.flush({ items: [], total: 0, page: 1, limit: 20 });
      else if (url.endsWith('/risks?page=1&limit=100')) request.flush({ items: [], total: 0, page: 1, limit: 100 });
      else if (url === '/api/processes/8') request.flush(PROCESS);
      else request.flush([]);
    });
  }

  async function settle(fixture: ComponentFixture<AppComponent>): Promise<void> {
    for (let round = 0; round < 4; round++) {
      fixture.detectChanges();
      await fixture.whenStable();
      flushScreens();
    }
    fixture.detectChanges();
  }

  async function render(user: typeof ADMIN, url: string): Promise<ComponentFixture<AppComponent>> {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.user = user;
    fixture.detectChanges();
    http.expectOne('/api/auth/me').flush({ statusCode: 401 }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    http.expectOne('/api/auth/demo/identities').flush([]);
    await TestBed.inject(Router).navigateByUrl(url);
    await settle(fixture);
    return fixture;
  }

  function navLabels(fixture: ComponentFixture<AppComponent>): string[] {
    return [...fixture.nativeElement.querySelectorAll('.app-nav a')].map((a: HTMLElement) => a.textContent?.trim() ?? '');
  }

  it('presents the local access screen with neutral user labels and names', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    http.expectOne('/api/auth/me').flush({ statusCode: 401 }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    http.expectOne('/api/auth/demo/identities').flush([
      { id: 1, displayName: 'Usuario administrador' },
      { id: 2, displayName: 'Usuario responsable' },
      { id: 3, displayName: 'Usuario de riesgos' },
      { id: 4, displayName: 'Usuario consulta' },
      { id: 5, displayName: 'Usuario responsable y de riesgos' }
    ]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.brand')?.textContent).toContain('Sistema de Procesos Institucionales');
    expect(fixture.nativeElement.querySelector('label[for="identity"]')?.textContent).toContain('Usuario de prueba');
    expect(fixture.nativeElement.querySelector('button.primary-button')?.textContent.trim()).toBe('Ingresar');
    expect(fixture.nativeElement.textContent).toContain('Usuario administrador');
    expect(fixture.nativeElement.textContent).toContain('Usuario consulta');
    expect(fixture.nativeElement.textContent).not.toMatch(/demo|fictici|simulad|prototipo/i);
    fixture.destroy();
  });

  it('keeps only the common structure around every process screen (C-008 V1)', async () => {
    const fixture = await render(ADMIN, '/mapa');
    for (const url of ['/mapa', '/mapa/macroprocesos/1', '/procesos', '/procesos/8', '/procesos/8/riesgos']) {
      await TestBed.inject(Router).navigateByUrl(url);
      await settle(fixture);
      const text = fixture.nativeElement.textContent as string;
      expect(text, url).not.toMatch(ADMIN_PANELS);
      expect(fixture.nativeElement.querySelector('.brand'), url).not.toBeNull();
      expect(text, url).toContain('Usuario administrador · Administrador');
      expect(fixture.nativeElement.querySelector('.app-nav'), url).not.toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.environment-notice'), url).toHaveLength(1);
      expect(text, url).not.toMatch(/demo|fictici|simulad|prototipo/i);
    }
    fixture.destroy();
  });

  it('offers Perfiles and Auditoría in the navigation only to administrators (C-008 V4)', async () => {
    const admin = await render(ADMIN, '/mapa');
    expect(navLabels(admin)).toEqual(['Mapa de procesos', 'Procesos', 'Catálogos', 'Perfiles', 'Auditoría']);
    expect([...admin.nativeElement.querySelectorAll('.app-nav a')].map((a: HTMLElement) => a.getAttribute('href')))
      .toEqual(['/mapa', '/procesos', '/administracion/catalogos', '/administracion/perfiles', '/administracion/auditoria']);
    admin.destroy();

    const consultation = await render(CONSULTATION, '/mapa');
    expect(navLabels(consultation)).toEqual(['Mapa de procesos', 'Procesos', 'Catálogos']);
    consultation.destroy();
  });

  it('navigates home from the brand through the router without reloading (C-008 R10)', async () => {
    const fixture = await render(ADMIN, '/procesos');
    const brand = fixture.nativeElement.querySelector('.brand') as HTMLAnchorElement;
    expect(brand.getAttribute('href')).toBe('/mapa');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    brand.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    await settle(fixture);
    expect(TestBed.inject(Router).url).toBe('/mapa');
    fixture.destroy();
  });

  it('closes the session through the router when there are no pending changes', async () => {
    const fixture = await render(ADMIN, '/procesos');
    const root = fixture.nativeElement as HTMLElement;
    buttonByText(root, 'Cerrar sesión')!.click();
    await fixture.whenStable();
    http.match('/api/process-map').forEach((request) => request.flush({ macroprocesses: [] }));
    http.expectOne({ method: 'POST', url: '/api/auth/logout' }).flush({});
    await fixture.whenStable();
    http.expectOne('/api/auth/demo/identities').flush([{ id: 1, displayName: 'Usuario administrador' }]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/mapa');
    expect(root.querySelector('label[for="identity"]')?.textContent).toContain('Usuario de prueba');
    fixture.destroy();
  });

  it('keeps the session when leaving an editor with unsaved changes is declined', async () => {
    const fixture = await render(ADMIN, '/procesos');
    const root = fixture.nativeElement as HTMLElement;
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/procesos/8/editar');
    await settle(fixture);
    const name = root.querySelector('#process-name') as HTMLInputElement;
    name.value = 'Cambio pendiente';
    name.dispatchEvent(new Event('input'));

    buttonByText(root, 'Cerrar sesión')!.click();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    buttonByText(root.querySelector('dialog')!, 'Seguir editando')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    http.expectNone('/api/auth/logout');
    expect(router.url).toBe('/procesos/8/editar');
    expect(root.textContent).toContain('Cerrar sesión');
    fixture.destroy();
  });
});

function buttonByText(root: HTMLElement, text: string): HTMLButtonElement | undefined {
  return [...root.querySelectorAll('button')].find((button) => button.textContent?.trim() === text);
}
