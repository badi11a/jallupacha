import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { ProcessOutletData } from '../access';
import { routes } from '../app.routes';
import { UiDialogHostComponent } from '../shared/ui';

const MACROPROCESS = { id: 1, code: 'MP1', name: 'Estratégicos', description: null, order: 1, isActive: 1 };
const PROCESS_TYPE = { id: 2, name: 'Institucional', isActive: 1 };
const USERS = [
  { id: 1, displayName: 'Usuario administrador', email: 'admin@example.test', isActive: 1, profiles: 'ADMIN' },
  { id: 4, displayName: 'Usuario consulta', email: 'consultation@example.test', isActive: 1, profiles: 'CONSULTATION' }
];
const AUDIT = { items: [{
  id: 7, createdAt: '2026-10-08T12:00:00Z', actorUserId: 1, action: 'MACROPROCESS_UPDATED',
  entityType: 'MACROPROCESS', entityId: '1', beforeValue: '{"order":1}', afterValue: '{"order":2}'
}] };

@Component({
  imports: [RouterOutlet, UiDialogHostComponent],
  template: `<router-outlet [routerOutletData]="session" /><ui-dialog-host />`
})
class HostComponent {
  session: ProcessOutletData = { userId: 1, profiles: ['ADMIN'] };
}

describe('Administración (C-008)', () => {
  let http: HttpTestingController;
  let router: Router;
  let fixture: ComponentFixture<HostComponent>;
  let refreshes = 0;

  beforeEach(() => {
    refreshes = 0;
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideZoneChangeDetection(), provideRouter(routes), provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    fixture?.destroy();
    http.verify();
  });

  async function open(url: string, profiles: string[], userId = 1): Promise<void> {
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.session = { userId, profiles, refreshSession: async () => { refreshes++; } };
    fixture.detectChanges();
    await router.navigateByUrl(url);
    await settle();
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  async function flushCatalogs(): Promise<void> {
    http.expectOne('/api/macroprocesses').flush([MACROPROCESS]);
    http.expectOne('/api/process-types').flush([PROCESS_TYPE]);
    await settle();
  }

  function text(): string {
    return fixture.nativeElement.textContent as string;
  }

  function button(label: string, root: HTMLElement = fixture.nativeElement): HTMLButtonElement | undefined {
    return [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === label) as HTMLButtonElement | undefined;
  }

  it('shows only the catalog panels on /administracion/catalogos, once (V2)', async () => {
    await open('/administracion/catalogos', ['ADMIN']);
    await flushCatalogs();
    const headings = [...fixture.nativeElement.querySelectorAll('ui-panel h2')].map((h: HTMLElement) => h.textContent);
    expect(headings).toEqual(['Macroprocesos', 'Tipos de proceso']);
    expect(text()).not.toMatch(/Perfiles de usuario|Auditoría reciente/);
    expect(text()).toContain('Agregar macroproceso');
    expect(text()).toContain('Agregar tipo');
  });

  it('keeps catalog creation, edition and deactivation for administrators (V3)', async () => {
    await open('/administracion/catalogos', ['ADMIN']);
    await flushCatalogs();
    const root = fixture.nativeElement as HTMLElement;

    const name = root.querySelector('#macro-name') as HTMLInputElement;
    name.value = 'Nuevo';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    root.querySelector('form.inline-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const created = http.expectOne({ method: 'POST', url: '/api/macroprocesses' });
    expect(created.request.body).toEqual({ name: 'Nuevo', description: null, order: 4 });
    created.flush({});
    await settle();
    await flushCatalogs();
    expect(text()).toContain('Macroproceso creado y auditado.');

    button('Editar')!.click();
    fixture.detectChanges();
    const dialog = root.querySelector('dialog') as HTMLDialogElement;
    const order = dialog.querySelector('#ui-dialog-field-order') as HTMLInputElement;
    order.value = '-1';
    order.dispatchEvent(new Event('input'));
    button('Guardar', dialog)!.click();
    fixture.detectChanges();
    http.expectNone({ method: 'PATCH', url: '/api/macroprocesses/1' });
    expect(dialog.textContent).toContain('Ingrese un valor entre 0 y 999999.');
    order.value = '2';
    order.dispatchEvent(new Event('input'));
    button('Guardar', dialog)!.click();
    await settle();
    const patch = http.expectOne({ method: 'PATCH', url: '/api/macroprocesses/1' });
    expect(patch.request.body).toEqual({ name: 'Estratégicos', description: null, order: 2 });
    patch.flush({});
    await settle();
    await flushCatalogs();
    expect(text()).toContain('Macroproceso actualizado y auditado.');

    button('Desactivar')!.click();
    fixture.detectChanges();
    expect(root.querySelector('dialog')?.textContent).toContain('¿Desactivar el macroproceso «Estratégicos»?');
    button('Cancelar', root.querySelector('dialog')!)!.click();
    await settle();
    http.expectNone('/api/macroprocesses/1/deactivate');
    button('Desactivar')!.click();
    fixture.detectChanges();
    button('Desactivar', root.querySelector('dialog')!)!.click();
    await settle();
    http.expectOne({ method: 'POST', url: '/api/macroprocesses/1/deactivate' }).flush({});
    await settle();
    await flushCatalogs();
    expect(text()).toContain('Macroproceso desactivado y auditado.');
  });

  it('lets other profiles read catalogs without actions (V3)', async () => {
    await open('/administracion/catalogos', ['CONSULTATION'], 4);
    await flushCatalogs();
    expect(text()).toContain('Estratégicos');
    expect(text()).toContain('Institucional');
    expect(fixture.nativeElement.querySelector('form.inline-form')).toBeNull();
    expect(button('Editar')).toBeUndefined();
    expect(button('Desactivar')).toBeUndefined();
  });

  it('keeps profile assignment for administrators without editing their own profile (V2, V3)', async () => {
    await open('/administracion/perfiles', ['ADMIN']);
    http.expectOne('/api/users').flush(USERS);
    await settle();
    const headings = [...fixture.nativeElement.querySelectorAll('ui-panel h2')].map((h: HTMLElement) => h.textContent);
    expect(headings).toEqual(['Perfiles de usuario']);
    expect(text()).toContain('consultation@example.test');
    const own = fixture.nativeElement.querySelector('fieldset input') as HTMLInputElement;
    expect(own.disabled).toBe(true);

    const consultationRow = [...fixture.nativeElement.querySelectorAll('.user-row')][1] as HTMLElement;
    const ownerBox = [...consultationRow.querySelectorAll('label')]
      .find((label) => label.textContent?.includes('Dueño de proceso'))!.querySelector('input') as HTMLInputElement;
    ownerBox.click();
    const put = http.expectOne({ method: 'PUT', url: '/api/users/4/profiles' });
    expect(put.request.body).toEqual({ profiles: ['CONSULTATION', 'PROCESS_OWNER'] });
    put.flush({});
    await settle();
    http.expectOne('/api/users').flush(USERS);
    await settle();
    expect(text()).toContain('Perfiles actualizados y auditados.');
    expect(refreshes).toBe(1);
  });

  it('keeps the recent audit with refresh for administrators (V2, V3)', async () => {
    await open('/administracion/auditoria', ['ADMIN']);
    http.expectOne('/api/audit?page=1&limit=50').flush(AUDIT);
    await settle();
    const headings = [...fixture.nativeElement.querySelectorAll('ui-panel h2')].map((h: HTMLElement) => h.textContent);
    expect(headings).toEqual(['Auditoría reciente']);
    expect(text()).toContain('MACROPROCESS_UPDATED');
    expect(text()).toContain('2026-10-08 12:00:00');
    button('Actualizar')!.click();
    http.expectOne('/api/audit?page=1&limit=50').flush({ items: [] });
    await settle();
    expect(text()).toContain('No hay cambios auditados.');
  });

  it('does not request profiles or audit without the administrator profile (V4)', async () => {
    for (const url of ['/administracion/perfiles', '/administracion/auditoria']) {
      await open(url, ['PROCESS_OWNER', 'RISK_MANAGER'], 5);
      expect(text()).toContain('La acción no está autorizada para este perfil.');
      http.expectNone('/api/users');
      http.expectNone('/api/audit?page=1&limit=50');
      expect(button('Actualizar')).toBeUndefined();
      fixture.destroy();
      await router.navigateByUrl('/sin-seccion');
    }
  });

  it('shows the server denial if an administrator loses the profile meanwhile (V4)', async () => {
    await open('/administracion/auditoria', ['ADMIN']);
    http.expectOne('/api/audit?page=1&limit=50').flush({}, { status: 403, statusText: 'Forbidden' });
    await settle();
    expect(text()).toContain('La acción no está autorizada para este perfil.');
  });
});
