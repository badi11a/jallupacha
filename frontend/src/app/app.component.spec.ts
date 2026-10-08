import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideZoneChangeDetection(),
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

  it('keeps the admin dashboard labels neutral and shows one local-access notice', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.user = {
      userId: 1,
      displayName: 'Usuario administrador',
      email: 'admin@example.test',
      profiles: ['ADMIN']
    };
    fixture.componentInstance.macroprocesses = [
      { id: 1, code: 'MP1', name: 'Estratégicos', description: null, order: 1, isActive: 1 }
    ];
    fixture.componentInstance.processTypes = [{ id: 1, name: 'Institucional', isActive: 1 }];
    fixture.componentInstance.users = [
      { id: 1, displayName: 'Usuario administrador', email: 'admin@example.test', isActive: 1, profiles: 'ADMIN' },
      { id: 2, displayName: 'Usuario consulta', email: 'consultation@example.test', isActive: 1, profiles: 'CONSULTATION' }
    ];
    fixture.detectChanges();
    http.expectOne('/api/auth/me').flush({ statusCode: 401 }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    http.expectOne('/api/auth/demo/identities').flush([]);
    await fixture.whenStable();
    await flushProcessWorkspaceRequests(http, true, fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Perfiles de usuario');
    expect(text).toContain('Macroprocesos');
    expect(text).toContain('Tipos de proceso');
    expect(text).toContain('Auditoría reciente');
    expect(text).toContain('admin@example.test');
    expect(text).toContain('consultation@example.test');
    expect(fixture.nativeElement.querySelectorAll('.environment-notice')).toHaveLength(1);
    expect(text).toContain('Entorno local: acceso de prueba.');
    expect(text).not.toMatch(/demo|fictici|simulad|prototipo/i);
    fixture.destroy();
  });

  it('asks for confirmation in a dialog before deactivating a catalog entry', async () => {
    const fixture = await renderAdminDashboard();
    const root = fixture.nativeElement as HTMLElement;

    buttonByText(root, 'Desactivar')!.click();
    fixture.detectChanges();
    expect(root.querySelector('dialog')?.textContent).toContain('¿Desactivar el macroproceso «Estratégicos»?');
    buttonByText(root.querySelector('dialog')!, 'Cancelar')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelector('dialog')).toBeNull();
    http.expectNone('/api/macroprocesses/1/deactivate');

    buttonByText(root, 'Desactivar')!.click();
    fixture.detectChanges();
    buttonByText(root.querySelector('dialog')!, 'Desactivar')!.click();
    await fixture.whenStable();
    http.expectOne({ method: 'POST', url: '/api/macroprocesses/1/deactivate' }).flush({});
    await fixture.whenStable();
    http.expectOne('/api/macroprocesses').flush([]);
    http.expectOne('/api/process-types').flush([]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.textContent).toContain('Macroproceso desactivado y auditado.');
    fixture.destroy();
  });

  it('edits a macroprocess through a validated dialog', async () => {
    const fixture = await renderAdminDashboard();
    const root = fixture.nativeElement as HTMLElement;

    buttonByText(root, 'Editar')!.click();
    fixture.detectChanges();
    const dialog = root.querySelector('dialog') as HTMLDialogElement;
    const name = dialog.querySelector('#ui-dialog-field-name') as HTMLInputElement;
    const order = dialog.querySelector('#ui-dialog-field-order') as HTMLInputElement;
    expect(name.value).toBe('Estratégicos');
    expect(order.value).toBe('1');
    order.value = '-1';
    order.dispatchEvent(new Event('input'));
    buttonByText(dialog, 'Guardar')!.click();
    fixture.detectChanges();
    http.expectNone({ method: 'PATCH', url: '/api/macroprocesses/1' });
    expect(dialog.textContent).toContain('Ingrese un valor entre 0 y 999999.');

    name.value = '  Estratégicos institucionales ';
    name.dispatchEvent(new Event('input'));
    order.value = '2';
    order.dispatchEvent(new Event('input'));
    buttonByText(dialog, 'Guardar')!.click();
    await fixture.whenStable();
    const request = http.expectOne({ method: 'PATCH', url: '/api/macroprocesses/1' });
    expect(request.request.body).toEqual({ name: 'Estratégicos institucionales', description: null, order: 2 });
    request.flush({});
    await fixture.whenStable();
    http.expectOne('/api/macroprocesses').flush([]);
    http.expectOne('/api/process-types').flush([]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.textContent).toContain('Macroproceso actualizado y auditado.');
    fixture.destroy();
  });

  it('does not show the administrator panels to a consultation user', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.user = {
      userId: 4,
      displayName: 'Usuario consulta',
      email: 'consultation@example.test',
      profiles: ['CONSULTATION']
    };
    fixture.componentInstance.macroprocesses = [
      { id: 1, code: 'MP1', name: 'Estratégicos', description: null, order: 1, isActive: 1 }
    ];
    fixture.detectChanges();
    http.expectOne('/api/auth/me').flush({ statusCode: 401 }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    http.expectOne('/api/auth/demo/identities').flush([]);
    await fixture.whenStable();
    await flushProcessWorkspaceRequests(http, false, fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Macroprocesos');
    expect(text).toContain('Tipos de proceso');
    expect(text).not.toContain('Perfiles de usuario');
    expect(text).not.toContain('Auditoría reciente');
    expect(buttonByText(fixture.nativeElement, 'Desactivar')).toBeUndefined();
    expect(buttonByText(fixture.nativeElement, 'Editar')).toBeUndefined();
    expect(fixture.nativeElement.querySelectorAll('.environment-notice')).toHaveLength(1);
    expect(text).not.toMatch(/demo|fictici|simulad|prototipo/i);
    fixture.destroy();
  });

  async function renderAdminDashboard(): Promise<ComponentFixture<AppComponent>> {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.user = {
      userId: 1,
      displayName: 'Usuario administrador',
      email: 'admin@example.test',
      profiles: ['ADMIN']
    };
    fixture.componentInstance.macroprocesses = [
      { id: 1, code: 'MP1', name: 'Estratégicos', description: null, order: 1, isActive: 1 }
    ];
    fixture.detectChanges();
    http.expectOne('/api/auth/me').flush({ statusCode: 401 }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    http.expectOne('/api/auth/demo/identities').flush([]);
    await fixture.whenStable();
    await flushProcessWorkspaceRequests(http, true, fixture);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }
});

function buttonByText(root: HTMLElement, text: string): HTMLButtonElement | undefined {
  return [...root.querySelectorAll('button')].find((button) => button.textContent?.trim() === text);
}

async function flushProcessWorkspaceRequests(
  http: HttpTestingController,
  isAdmin: boolean,
  fixture: ComponentFixture<AppComponent>
): Promise<void> {
  http.expectOne('/api/processes?page=1&limit=20').flush({
    items: [],
    total: 0,
    page: 1,
    limit: 20
  });
  http.expectOne('/api/macroprocesses').flush([]);
  http.expectOne('/api/process-types').flush([]);
  await fixture.whenStable();
  if (isAdmin) http.expectOne('/api/users/process-owners').flush([]);
}
