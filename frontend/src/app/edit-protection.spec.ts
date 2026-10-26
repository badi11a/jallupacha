import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZoneChangeDetection } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { FICHA_FIELDS, FichaKey, ProcessDetail, ProcessTypeItem, UnitItem } from './process-api.service';

const UNITS: UnitItem[] = [1, 2].map(id => ({
  id, code: `U${id}`, name: `Unidad ${id}`, isActive: true, parentUnitId: null, processCount: 0
}));
const TYPES: ProcessTypeItem[] = [1, 2].map(id => ({
  id, name: `Tipo ${id}`, isActive: true, macroprocessId: 1,
  macroprocessCode: 'MP1', macroprocessName: 'Gestión general', macroprocessTypeName: 'Estratégicos', processCount: 0
}));
const DETAIL = {
  ...Object.fromEntries(FICHA_FIELDS.map(field => [field.key, null])) as Record<FichaKey, string | null>,
  id: 4, code: 'PR4', name: 'Proceso de prueba', status: 'En revisión',
  macroprocessId: 1, macroprocess: 'Gestión general', macroprocessType: 'Estratégicos',
  processTypeId: 1, processType: 'Tipo 1', parentProcessId: null, parent: null, subprocesses: [],
  units: [], completeness: { complete: true, missing: [] }, possibleDuplicates: [],
  risks: [1, 2].map(id => ({ id, description: `Riesgo ${id}`, cause: 'Causa', consequence: 'Consecuencia', type: 'Operativo', level: 'Bajo' })),
  relations: {
    outgoing: [1, 2].map(id => ({ id, processId: id + 10, code: `PR${id + 10}`, name: `Proceso ${id}`, type: 'FLUJO', description: `Relación ${id}` })),
    incoming: []
  }
} as ProcessDetail;

describe('Protección de ediciones — C-032, R-04/R-05/R-07', () => {
  let fixture: ComponentFixture<AppComponent>;
  let root: HTMLElement;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    sessionStorage.setItem('jallupacha_user', JSON.stringify({
      userId: 1, displayName: 'Usuario de prueba', email: 'admin@example.test', profiles: ['ADMIN', 'RISK_MANAGER']
    }));
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideZoneChangeDetection(), provideRouter(routes), provideHttpClient(), provideHttpClientTesting()]
    });
    fixture = TestBed.createComponent(AppComponent);
    root = fixture.nativeElement;
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    fixture.destroy();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function renderPendingNavigation(): Promise<void> {
    // La navegación espera la confirmación: no esperar estabilidad hasta resolver el diálogo.
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  function button(label: string, scope: ParentNode = root): HTMLButtonElement {
    const result = [...scope.querySelectorAll<HTMLButtonElement>('button')].find(el => el.textContent?.trim() === label);
    expect(result, label).toBeDefined();
    return result!;
  }

  async function click(label: string, scope: ParentNode = root): Promise<void> {
    button(label, scope).click();
    await settle();
  }

  async function type(selector: string, value: string, scope: ParentNode = root): Promise<void> {
    const input = scope.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    expect(input, selector).not.toBeNull();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  }

  function submit(form: HTMLFormElement): void {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  function section(heading: string): HTMLElement {
    return [...root.querySelectorAll<HTMLElement>('ui-section')].find(el => el.querySelector('h3')?.textContent === heading)!;
  }

  async function openDetail(): Promise<void> {
    await router.navigateByUrl('/procesos/4');
    fixture.detectChanges();
    http.expectOne('/api/management/processes/4').flush(structuredClone(DETAIL));
    await settle();
  }

  async function expectPendingBlocksExit(url: string): Promise<void> {
    expect(await router.navigateByUrl('/mapa')).toBe(false);
    expect(router.url).toBe(url);
    await click('Cerrar sesión');
    http.expectNone('/api/auth/logout');
    expect(sessionStorage.getItem('jallupacha_user')).not.toBeNull();
    expect(root.querySelector('dialog')).toBeNull();
  }

  for (const catalog of [
    { route: '/unidades', endpoint: 'units', rows: UNITS, first: 'Unidad 1', second: 'Unidad 2', create: 'Nueva unidad' },
    { route: '/tipos-de-proceso', endpoint: 'process-types', rows: TYPES, first: 'Tipo 1', second: 'Tipo 2', create: 'Nuevo tipo de proceso' }
  ]) {
    async function openCatalog(): Promise<void> {
      await router.navigateByUrl(catalog.route);
      fixture.detectChanges();
      http.expectOne(`/api/management/${catalog.endpoint}`).flush(catalog.rows);
      await settle();
    }

    it(`${catalog.endpoint}: reemplazo limpio inmediato y cambio de registro con descarte aceptado o cancelado`, async () => {
      await openCatalog();
      await click('Editar', root.querySelectorAll('tbody tr')[0]);
      expect(root.querySelector('dialog')).toBeNull();
      await type('input[name=name]', 'Edición pendiente');
      await click('Editar', root.querySelectorAll('tbody tr')[0]);
      expect((root.querySelector('input[name=name]') as HTMLInputElement).value).toBe('Edición pendiente');
      expect(root.querySelector('dialog')).toBeNull();
      await click('Editar', root.querySelectorAll('tbody tr')[1]);
      expect(root.querySelectorAll('dialog')).toHaveLength(1);
      await click('Continuar editando', root.querySelector('dialog')!);
      expect((root.querySelector('input[name=name]') as HTMLInputElement).value).toBe('Edición pendiente');
      await click('Editar', root.querySelectorAll('tbody tr')[1]);
      await click('Descartar cambios', root.querySelector('dialog')!);
      expect((root.querySelector('input[name=name]') as HTMLInputElement).value).toBe(catalog.second);
      await click('Cancelar', root.querySelector('form')!);
      expect(root.querySelector('form')).toBeNull();
      expect(root.querySelector('dialog')).toBeNull();
    });

    it(`${catalog.endpoint}: iniciar un registro nuevo protege la edición y descarta solo al confirmar`, async () => {
      await openCatalog();
      await click('Editar', root.querySelectorAll('tbody tr')[0]);
      await type('input[name=name]', 'Pendiente');
      await click(catalog.create);
      await click('Continuar editando', root.querySelector('dialog')!);
      expect((root.querySelector('input[name=name]') as HTMLInputElement).value).toBe('Pendiente');
      await click(catalog.create);
      await click('Descartar cambios', root.querySelector('dialog')!);
      expect((root.querySelector('input[name=name]') as HTMLInputElement).value).toBe('');
      await click('Cancelar', root.querySelector('form')!);
      expect(root.querySelector('dialog')).toBeNull();
    });

    it(`${catalog.endpoint}: guardado pendiente bloquea salida, doble envío y cambios; el fallo conserva datos y permite reintentar`, async () => {
      await openCatalog();
      await click('Editar', root.querySelectorAll('tbody tr')[0]);
      await type('input[name=name]', 'Nombre conservado');
      const form = root.querySelector('form')!;
      submit(form);
      const save = http.expectOne({ method: 'PATCH', url: `/api/management/${catalog.endpoint}/1` });
      await settle();
      expect((form.querySelector('input') as HTMLInputElement).disabled).toBe(true);
      expect(root.textContent).toContain('Guardando cambios…');
      submit(form);
      http.expectNone(req => req.method === 'PATCH');
      await expectPendingBlocksExit(catalog.route);
      save.flush({ message: 'No se pudo guardar.' }, { status: 503, statusText: 'Unavailable' });
      await settle();
      expect((form.querySelector('input') as HTMLInputElement).value).toBe('Nombre conservado');
      expect((form.querySelector('input') as HTMLInputElement).disabled).toBe(false);
      submit(form);
      http.expectOne(req => req.method === 'PATCH').flush({});
      http.expectOne(`/api/management/${catalog.endpoint}`).flush(catalog.rows);
      await settle();
      expect(root.querySelector('form')).toBeNull();
    });
  }

  it('riesgos: cambiar de riesgo conserva datos al cancelar y reemplaza únicamente al confirmar', async () => {
    await openDetail();
    await click('Editar', section('Riesgos').querySelectorAll('article')[0]);
    await type('textarea[name=description]', 'Riesgo pendiente');
    await click('Editar', section('Riesgos').querySelector('article')!);
    await click('Continuar editando', root.querySelector('dialog')!);
    expect((root.querySelector('textarea[name=description]') as HTMLTextAreaElement).value).toBe('Riesgo pendiente');
    await click('Editar', section('Riesgos').querySelector('article')!);
    await click('Descartar cambios', root.querySelector('dialog')!);
    expect((root.querySelector('textarea[name=description]') as HTMLTextAreaElement).value).toBe('Riesgo 2');
  });

  it('relaciones: cambiar de relación protege la descripción pendiente', async () => {
    await openDetail();
    const relations = section('Relaciones con otros procesos');
    await click('Editar', relations.querySelectorAll('article')[0]);
    await type('textarea[name=relationDescription]', 'Relación pendiente');
    await click('Editar', relations.querySelector('article')!);
    await click('Continuar editando', root.querySelector('dialog')!);
    expect((root.querySelector('textarea[name=relationDescription]') as HTMLTextAreaElement).value).toBe('Relación pendiente');
    await click('Editar', relations.querySelector('article')!);
    await click('Descartar cambios', root.querySelector('dialog')!);
    expect((root.querySelector('textarea[name=relationDescription]') as HTMLTextAreaElement).value).toBe('Relación 2');
  });

  it('observaciones: reabrir no borra; cancelar exige confirmación solo si hay modificaciones', async () => {
    await openDetail();
    await click('Rechazar con observaciones');
    await type('textarea[name=rejectionReason]', 'Observaciones pendientes');
    await click('Rechazar con observaciones');
    expect((root.querySelector('textarea[name=rejectionReason]') as HTMLTextAreaElement).value).toBe('Observaciones pendientes');
    const reject = root.querySelector('section[aria-labelledby=reject-title]')!;
    await click('Cancelar', reject);
    await click('Continuar editando', root.querySelector('dialog')!);
    expect((root.querySelector('textarea[name=rejectionReason]') as HTMLTextAreaElement).value).toBe('Observaciones pendientes');
    await click('Cancelar', reject);
    await click('Descartar cambios', root.querySelector('dialog')!);
    expect(root.querySelector('textarea[name=rejectionReason]')).toBeNull();
    await click('Rechazar con observaciones');
    await click('Cancelar', root.querySelector('section[aria-labelledby=reject-title]')!);
    expect(root.querySelector('dialog')).toBeNull();
  });

  for (const saved of ['risk', 'relation'] as const) {
    it(`guardar ${saved} conserva la otra edición, incluso durante la recarga`, async () => {
      await openDetail();
      await click('Editar', section('Riesgos').querySelector('article')!);
      await type('textarea[name=description]', 'Riesgo pendiente');
      await click('Editar', section('Relaciones con otros procesos').querySelector('article')!);
      await type('textarea[name=relationDescription]', 'Relación pendiente');
      const label = saved === 'risk' ? 'Editar riesgo' : 'Editar relación';
      const form = root.querySelector<HTMLFormElement>(`form[aria-label="${label}"]`)!;
      submit(form);
      const save = http.expectOne(req => req.method === 'PATCH');
      expect(form.closest('[inert]')).not.toBeNull();
      submit(form);
      http.expectNone(req => req.method === 'PATCH');
      await expectPendingBlocksExit('/procesos/4');
      save.flush({});
      const reload = http.expectOne('/api/management/processes/4');
      await expectPendingBlocksExit('/procesos/4');
      reload.flush(structuredClone(DETAIL));
      await settle();
      expect(root.querySelector(`form[aria-label="${label}"]`)).toBeNull();
      const selector = saved === 'risk' ? 'textarea[name=relationDescription]' : 'textarea[name=description]';
      expect((root.querySelector(selector) as HTMLTextAreaElement).value).toBe(saved === 'risk' ? 'Relación pendiente' : 'Riesgo pendiente');
      const navigation = router.navigateByUrl('/mapa');
      await renderPendingNavigation();
      await click('Continuar editando', root.querySelector('dialog')!);
      expect(await navigation).toBe(false);
      expect(router.url).toBe('/procesos/4');
    });
  }

  it('un fallo al recargar tras guardar no oculta la otra edición pendiente', async () => {
    await openDetail();
    await click('Editar', section('Riesgos').querySelector('article')!);
    await type('textarea[name=description]', 'Riesgo conservado');
    await click('Editar', section('Relaciones con otros procesos').querySelector('article')!);
    submit(root.querySelector('form[aria-label="Editar relación"]')!);
    http.expectOne(req => req.method === 'PATCH').flush({});
    http.expectOne('/api/management/processes/4').flush({ message: 'No fue posible actualizar la vista.' }, { status: 503, statusText: 'Unavailable' });
    await settle();
    expect((root.querySelector('textarea[name=description]') as HTMLTextAreaElement).value).toBe('Riesgo conservado');
    expect(root.querySelector('form[aria-label="Editar riesgo"]')?.closest('[inert]')).toBeNull();
    expect(root.textContent).toContain('No fue posible actualizar la vista.');
  });

  async function openProcessForm(): Promise<void> {
    await router.navigateByUrl('/procesos/4/editar'); fixture.detectChanges();
    http.expectOne('/api/management/process-types').flush(TYPES);
    http.expectOne('/api/management/units').flush(UNITS);
    http.expectOne('/api/management/processes').flush([]);
    http.expectOne('/api/management/processes/4').flush({ ...structuredClone(DETAIL), status: 'Borrador' });
    await settle();
  }

  it('proceso: mantiene datos y sesión durante guardado pendiente; un fallo permite reintentar y completar la navegación', async () => {
    await openProcessForm();
    await type('#field-name', 'Nombre de proceso conservado');
    const form = root.querySelector('form')!;
    submit(form);
    const save = http.expectOne({ method: 'PATCH', url: '/api/management/processes/4' });
    expect(form.querySelector('fieldset')?.disabled).toBe(true);
    expect(root.textContent).toContain('Guardando proceso…');
    submit(form);
    http.expectNone(req => req.method === 'PATCH');
    await expectPendingBlocksExit('/procesos/4/editar');
    save.flush({ message: 'No se pudo guardar.' }, { status: 503, statusText: 'Unavailable' });
    await settle();
    expect((root.querySelector('#field-name') as HTMLInputElement).value).toBe('Nombre de proceso conservado');
    expect(form.querySelector('fieldset')?.disabled).toBe(false);
    submit(form);
    http.expectOne(req => req.method === 'PATCH').flush({ id: 4 });
    await settle();
    http.expectOne('/api/management/processes/4').flush(structuredClone(DETAIL));
    await settle();
    expect(router.url).toBe('/procesos/4');
    expect(root.querySelector('dialog')).toBeNull();
  });

  it('proceso: si el destino de guardado no se abre, nuevas modificaciones vuelven a quedar protegidas', async () => {
    await openProcessForm();
    await type('#field-name', 'Nombre guardado');
    vi.spyOn(router, 'navigate').mockResolvedValue(false);
    submit(root.querySelector('form')!);
    http.expectOne(req => req.method === 'PATCH').flush({ id: 4 });
    await settle();
    expect(root.querySelector('fieldset')?.disabled).toBe(false);
    await type('#field-name', 'Cambio posterior');
    const navigation = router.navigateByUrl('/mapa');
    await renderPendingNavigation();
    await click('Continuar editando', root.querySelector('dialog')!);
    expect(await navigation).toBe(false);
    expect((root.querySelector('#field-name') as HTMLInputElement).value).toBe('Cambio posterior');
  });

  it('perfiles: durante guardado no permite cambiar selección, editar otra cuenta, salir o cerrar sesión', async () => {
    await router.navigateByUrl('/usuarios'); fixture.detectChanges();
    http.expectOne('/api/users').flush([1, 2, 3].map(id => ({
      id, displayName: `Persona ${id}`, email: `person${id}@example.test`, isActive: 1, profiles: id === 1 ? 'ADMIN' : 'CONSULTATION'
    })));
    await settle();
    await click('Modificar perfiles', root.querySelectorAll('tbody tr')[1]);
    const checkbox = root.querySelector<HTMLInputElement>('input[type=checkbox]')!;
    checkbox.click(); await settle();
    await click('Guardar perfiles');
    const save = http.expectOne({ method: 'PUT', url: '/api/users/2/profiles' });
    expect(checkbox.matches(':disabled')).toBe(true);
    expect(button('Modificar perfiles', root.querySelectorAll('tbody tr')[2]).disabled).toBe(true);
    await expectPendingBlocksExit('/usuarios');
    save.flush({ message: 'No se pudo guardar.' }, { status: 503, statusText: 'Unavailable' });
    await settle();
    expect(checkbox.checked).toBe(true);
    expect(checkbox.matches(':disabled')).toBe(false);
    expect(root.textContent).toContain('Persona 2');
  });
});
