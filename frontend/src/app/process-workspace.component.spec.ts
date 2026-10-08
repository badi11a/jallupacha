import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, RouterOutlet, provideRouter, withRouterConfig } from '@angular/router';
import { routes } from './app.routes';
import { ProcessOutletData, ProcessWorkspaceComponent } from './process-workspace.component';
import { UiDialogHostComponent } from './shared/ui';

const emptyPage = { items: [], total: 0, page: 1, limit: 20 };
const summary = {
  id: 8,
  code: 'PR8',
  name: 'Proceso institucional',
  macroprocessId: 1,
  macroprocessName: 'Estratégicos',
  processTypeId: 2,
  processTypeName: 'Institucional',
  ownerUserId: 7,
  ownerDisplayName: 'Responsable actual',
  status: 'Borrador',
  revision: 1
};
const detail = {
  ...summary,
  versionNumber: 1,
  parentProcessId: null,
  alias: null,
  description: null,
  objective: null,
  scope: null,
  inputs: null,
  outputs: null,
  suppliers: null,
  clients: null,
  involvedParties: null,
  startsWhen: null,
  endsWhen: null,
  developmentPlan: null,
  operation: null,
  design: null,
  validation: null,
  businessArea: null,
  subprocessType: null,
  criticality: null,
  automationLevel: null,
  periodicity: null,
  internalUnits: null,
  bpmnModel: null
};
const macroprocesses = [{ id: 1, name: 'Estratégicos', isActive: 1 }];
const processTypes = [{ id: 2, name: 'Institucional', isActive: 1 }];

@Component({
  imports: [RouterOutlet, UiDialogHostComponent],
  template: `<router-outlet [routerOutletData]="session" /><ui-dialog-host />`
})
class HostComponent {
  session: ProcessOutletData = { userId: 9, profiles: ['CONSULTATION'] };
}

describe('ProcessWorkspaceComponent', () => {
  let http: HttpTestingController;
  let router: Router;
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideZoneChangeDetection(),
        provideRouter(routes, withRouterConfig({ canceledNavigationResolution: 'computed' })),
        provideHttpClient(withXsrfConfiguration({
          cookieName: 'jallupacha_csrf',
          headerName: 'X-CSRF-Token'
        })),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    fixture?.destroy();
    http.verify();
  });

  async function start(url: string, session: ProcessOutletData): Promise<void> {
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.session = session;
    fixture.detectChanges();
    await router.navigateByUrl(url);
    await settle();
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  // Sin whenStable: una navegación detenida en una guarda mantiene la aplicación ocupada.
  async function tick(): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  function workspace(): ProcessWorkspaceComponent {
    return fixture.debugElement.query(By.directive(ProcessWorkspaceComponent)).componentInstance;
  }

  function text(): string {
    return fixture.nativeElement.textContent as string;
  }

  function control(label: string): HTMLElement | undefined {
    return [...fixture.nativeElement.querySelectorAll('a, button')]
      .find((element: HTMLElement) => element.textContent?.trim() === label) as HTMLElement | undefined;
  }

  async function flushDetail(record = detail): Promise<void> {
    http.expectOne('/api/processes/8').flush(record);
    await settle();
    http.expectOne('/api/processes?page=1&limit=100').flush({ ...emptyPage, items: [summary], total: 1, limit: 100 });
    await settle();
  }

  async function flushEditor(record = detail): Promise<void> {
    http.expectOne('/api/processes/8').flush(record);
    await settle();
    http.expectOne('/api/macroprocesses').flush(macroprocesses);
    http.expectOne('/api/process-types').flush(processTypes);
    http.expectOne('/api/processes?page=1&limit=100').flush({ ...emptyPage, items: [summary], total: 1, limit: 100 });
    await settle();
  }

  it('shows the paginated list and opens the complete read-only ficha by link for Consulta', async () => {
    await start('/procesos', { userId: 9, profiles: ['CONSULTATION'] });
    http.expectOne('/api/processes?page=1&limit=20').flush({ ...emptyPage, items: [summary], total: 1 });
    await settle();
    expect(workspace().processes).toEqual([summary]);
    expect(text()).toContain('PR8');
    expect(text()).toContain('Proceso institucional');
    expect(control('Nuevo proceso')).toBeUndefined();

    const openLink = control('Ver ficha') as HTMLAnchorElement;
    expect(openLink.tagName).toBe('A');
    expect(openLink.getAttribute('href')).toBe('/procesos/8');
    openLink.click();
    await settle();
    await flushDetail();

    expect(router.url).toBe('/procesos/8');
    expect(text()).toContain('Responsable actual · ID 7');
    expect(text()).toContain('EstadoBorrador');
    expect(text()).toContain('Modelo del proceso (BPMN)Sin información');
    expect(text()).toContain('Unidades internasSin información');
    expect(control('Editar borrador')).toBeUndefined();
    expect(control('Reasignar responsable')).toBeUndefined();
    expect(control('Volver al listado')?.getAttribute('href')).toBe('/procesos');
  });

  it('groups every REQ-06 field of the ficha in sections, empty values included', async () => {
    await start('/procesos/8', { userId: 9, profiles: ['CONSULTATION'] });
    await flushDetail();

    const sections = [...fixture.nativeElement.querySelectorAll('ui-section h3')].map((h: HTMLElement) => h.textContent);
    expect(sections).toEqual(['Identificación', 'Propósito', 'Organización', 'Entradas y salidas', 'Operación', 'Desarrollo y diseño']);
    const labels = [...fixture.nativeElement.querySelectorAll('.process-details dt')].map((dt: HTMLElement) => dt.textContent?.trim());
    expect(labels.sort()).toEqual([
      'Código', 'Nombre', 'Alias', 'Descripción', 'Objetivo', 'Alcance', 'Macroproceso', 'Tipo de proceso',
      'Proceso padre', 'Tipo de subproceso', 'Unidades internas', 'Área de negocio', 'Responsable', 'Involucrados',
      'Entradas', 'Salidas', 'Proveedores', 'Clientes', 'Criticidad', 'Grado de automatización', 'Periodicidad',
      'Cuándo inicia', 'Cuándo termina', 'Plan de desarrollo', 'Operación del proceso', 'Diseño del proceso',
      'Validación del proceso', 'Estado', 'Modelo del proceso (BPMN)'
    ].sort());
    expect(fixture.nativeElement.querySelectorAll('.process-details dd')).toHaveLength(29);
    expect(text()).toContain('ObjetivoSin información');

    const crumbs = fixture.nativeElement.querySelector('ui-breadcrumbs nav') as HTMLElement;
    expect(crumbs.getAttribute('aria-label')).toBe('Ubicación en procesos');
    const links = [...crumbs.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')]);
    expect(links).toEqual([['Mapa de procesos', '/mapa'], ['Estratégicos', '/mapa/macroprocesos/1']]);
    expect(crumbs.querySelector('[aria-current="page"]')?.textContent).toBe('PR8 · Proceso institucional');
    expect(control('Riesgos del proceso')).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.process-details ui-badge')?.textContent).toBe('Borrador');
  });

  it('shows loading, empty and status states in the list', async () => {
    await start('/procesos', { userId: 7, profiles: ['PROCESS_OWNER'] });
    expect(text()).toContain('Cargando procesos…');
    expect(text()).not.toContain('No hay procesos.');
    http.expectOne('/api/processes?page=1&limit=20').flush(emptyPage);
    await settle();
    expect(text()).toContain('No hay procesos.');
    expect(text()).toContain('Use «Nuevo proceso» para registrar el primero.');

    await router.navigateByUrl('/procesos?pagina=2');
    await settle();
    http.expectOne('/api/processes?page=2&limit=20').flush({ ...emptyPage, items: [summary], total: 21, page: 2 });
    await settle();
    const badge = fixture.nativeElement.querySelector('tbody ui-badge') as HTMLElement;
    expect(badge.textContent).toBe('Borrador');
    expect(badge.classList).toContain('badge-info');
    expect(fixture.nativeElement.querySelector('td[data-label="Estado"]')).not.toBeNull();
  });

  it('shows editor errors next to the fields instead of sending an invalid draft', async () => {
    await start('/procesos/nuevo', { userId: 7, profiles: ['PROCESS_OWNER'] });
    http.expectOne('/api/macroprocesses').flush(macroprocesses);
    http.expectOne('/api/process-types').flush(processTypes);
    http.expectOne('/api/processes?page=1&limit=100').flush(emptyPage);
    await settle();
    expect(fixture.nativeElement.querySelector('ui-breadcrumbs [aria-current="page"]')?.textContent).toBe('Nuevo proceso');
    expect(fixture.nativeElement.querySelectorAll('.process-editor ui-section')).toHaveLength(6);
    for (const key of ['name', 'alias', 'description', 'objective', 'scope', 'inputs', 'outputs', 'suppliers', 'clients',
      'involvedParties', 'startsWhen', 'endsWhen', 'developmentPlan', 'operation', 'design', 'validation', 'businessArea',
      'subprocessType', 'criticality', 'automationLevel', 'periodicity']) {
      expect(fixture.nativeElement.querySelector(`#process-${key}`)).not.toBeNull();
    }
    expect((fixture.nativeElement.querySelector('#process-name') as HTMLInputElement).hasAttribute('maxlength')).toBe(false);

    const name = fixture.nativeElement.querySelector('#process-name') as HTMLInputElement;
    name.value = 'x'.repeat(251);
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.process-editor') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle();
    http.expectNone('/api/processes');

    const macro = fixture.nativeElement.querySelector('#process-macroprocess') as HTMLSelectElement;
    expect(macro.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(macro);
    expect(text()).toContain('Seleccione un macroproceso.');
    expect(text()).toContain('Seleccione un tipo de proceso.');
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(name.getAttribute('aria-describedby')).toBe('process-name-count process-name-error');
    expect(text()).toContain('Use como máximo 250 caracteres.');

    name.value = 'Nombre válido';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(name.hasAttribute('aria-invalid')).toBe(false);
    expect(text()).not.toContain('Use como máximo 250 caracteres.');
  });

  it('shows the character counter only near the limit and announces threshold changes once', async () => {
    await start('/procesos/nuevo', { userId: 7, profiles: ['PROCESS_OWNER'] });
    http.expectOne('/api/macroprocesses').flush(macroprocesses);
    http.expectOne('/api/process-types').flush(processTypes);
    http.expectOne('/api/processes?page=1&limit=100').flush(emptyPage);
    await settle();

    const alias = fixture.nativeElement.querySelector('#process-alias') as HTMLInputElement;
    const counter = fixture.nativeElement.querySelector('#process-alias-count') as HTMLElement;
    const live = fixture.nativeElement.querySelector('[aria-live="polite"]') as HTMLElement;
    const type = async (value: string) => {
      alias.value = value;
      alias.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };

    await type('Alias breve');
    expect(counter.hidden).toBe(true);
    expect(alias.hasAttribute('aria-describedby')).toBe(false);
    expect(live.textContent?.trim()).toBe('');

    await type('a'.repeat(230));
    expect(counter.hidden).toBe(false);
    expect(counter.textContent?.trim()).toBe('230 / 250');
    expect(alias.getAttribute('aria-describedby')).toBe('process-alias-count');
    expect(live.textContent?.trim()).toBe('Alias: quedan 20 caracteres.');

    await type('a'.repeat(231));
    expect(live.textContent?.trim()).toBe('Alias: quedan 20 caracteres.');

    await type('a'.repeat(251));
    expect(counter.classList).toContain('char-counter-over');
    expect(live.textContent?.trim()).toBe('Alias: supera el máximo de 250 caracteres.');
  });

  it('keeps the list page in the address', async () => {
    await start('/procesos?pagina=2', { userId: 9, profiles: ['CONSULTATION'] });
    http.expectOne('/api/processes?page=2&limit=20').flush({ ...emptyPage, items: [summary], total: 25, page: 2 });
    await settle();
    expect(text()).toContain('Página 2 · 25 procesos');

    (control('Anterior') as HTMLButtonElement).click();
    await settle();
    expect(router.url).toBe('/procesos');
    http.expectOne('/api/processes?page=1&limit=20').flush({ ...emptyPage, items: [summary], total: 25 });
    await settle();
    expect(text()).toContain('Página 1 · 25 procesos');
  });

  it('lets a process owner create an incomplete draft and lands on its ficha', async () => {
    await start('/procesos', { userId: 7, profiles: ['PROCESS_OWNER'] });
    http.expectOne('/api/processes?page=1&limit=20').flush(emptyPage);
    await settle();

    (control('Nuevo proceso') as HTMLAnchorElement).click();
    await settle();
    expect(router.url).toBe('/procesos/nuevo');
    http.expectOne('/api/macroprocesses').flush(macroprocesses);
    http.expectOne('/api/process-types').flush(processTypes);
    http.expectOne('/api/processes?page=1&limit=100').flush(emptyPage);
    await settle();

    expect(text()).toContain('Nuevo proceso');
    expect(text()).toContain('se guardará en estado Borrador');
    expect(text()).not.toMatch(/Enviar a revisión|Aprobar|Rechazar/i);
    expect(fixture.nativeElement.querySelector('#process-name')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#process-involvedParties')?.previousElementSibling?.textContent)
      .toContain('no nombres de personas');

    workspace().draft.macroprocessId = 1;
    workspace().draft.processTypeId = 2;
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.process-editor') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const createRequest = http.expectOne('/api/processes');
    expect(createRequest.request.body).toMatchObject({ macroprocessId: 1, processTypeId: 2, name: null, parentProcessId: null });
    createRequest.flush(detail);
    await settle();
    await flushDetail();

    expect(router.url).toBe('/procesos/8');
    expect(text()).toContain('Borrador creado.');
    expect(text()).not.toMatch(/Enviar a revisión|Aprobar|Rechazar/i);
  });

  it('opens the editor by direct address and returns to the saved ficha', async () => {
    await start('/procesos/8/editar', { userId: 7, profiles: ['PROCESS_OWNER'] });
    await flushEditor();
    expect((fixture.nativeElement.querySelector('#process-name') as HTMLInputElement).value).toBe('Proceso institucional');

    workspace().draft['name'] = 'Proceso actualizado';
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.process-editor') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const update = http.expectOne('/api/processes/8');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toMatchObject({ revision: 1, name: 'Proceso actualizado', macroprocessId: 1, processTypeId: 2 });
    update.flush({ ...detail, revision: 2, name: 'Proceso actualizado' });
    await settle();
    await flushDetail({ ...detail, revision: 2, name: 'Proceso actualizado' });

    expect(router.url).toBe('/procesos/8');
    expect(text()).toContain('Borrador actualizado.');
    expect(text()).toContain('Proceso actualizado');
    expect(workspace().selected?.revision).toBe(2);
  });

  it('asks before leaving an editor with unsaved changes', async () => {
    await start('/procesos/8/editar', { userId: 7, profiles: ['PROCESS_OWNER'] });
    await flushEditor();

    const name = fixture.nativeElement.querySelector('#process-name') as HTMLInputElement;
    name.value = 'Cambio pendiente';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);

    (control('Cancelar') as HTMLAnchorElement).click();
    await tick();
    let dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.textContent).toContain('El borrador tiene cambios sin guardar.');
    ([...dialog.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Seguir editando')!).click();
    await settle();
    expect(router.url).toBe('/procesos/8/editar');
    expect(workspace().draft['name']).toBe('Cambio pendiente');

    (control('Cancelar') as HTMLAnchorElement).click();
    await tick();
    dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    ([...dialog.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Salir sin guardar')!).click();
    await settle();
    expect(router.url).toBe('/procesos/8');
    await flushDetail();
    http.expectNone({ method: 'PATCH', url: '/api/processes/8' });
  });

  it('leaves an unchanged editor without asking', async () => {
    await start('/procesos/8/editar', { userId: 7, profiles: ['PROCESS_OWNER'] });
    await flushEditor();
    (control('Cancelar') as HTMLAnchorElement).click();
    await settle();
    expect(fixture.nativeElement.querySelector('dialog')).toBeNull();
    expect(router.url).toBe('/procesos/8');
    await flushDetail();
  });

  it('does not open the editor by address without permission to edit', async () => {
    await start('/procesos/8/editar', { userId: 9, profiles: ['CONSULTATION'] });
    http.expectOne('/api/processes/8').flush(detail);
    await settle();
    expect(text()).toContain('La acción no está autorizada para este perfil.');
    expect(fixture.nativeElement.querySelector('.process-editor')).toBeNull();
  });

  it('rejects invalid process addresses and unknown sections without calling the API', async () => {
    await start('/procesos/abc', { userId: 9, profiles: ['CONSULTATION'] });
    expect(text()).toContain('El proceso solicitado ya no está disponible.');

    await router.navigateByUrl('/otra-seccion');
    await settle();
    expect(text()).toContain('Página no encontrada');
    expect(control('Ir a Procesos')?.getAttribute('href')).toBe('/procesos');
  });

  it('lets an administrator reassign a draft and reload its current responsible user', async () => {
    await start('/procesos/8', { userId: 1, profiles: ['ADMIN'] });
    await flushDetail();
    http.expectOne('/api/users/process-owners').flush([{ id: 9, displayName: 'Nueva responsable' }]);
    await settle();

    (control('Reasignar responsable') as HTMLButtonElement).click();
    await settle();
    expect(text()).toContain('Nueva responsable · ID 9');
    workspace().newOwnerId = 9;
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.process-editor') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const reassignment = http.expectOne('/api/processes/8/owner');
    expect(reassignment.request.method).toBe('PATCH');
    expect(reassignment.request.body).toEqual({ ownerUserId: 9, revision: 1 });
    reassignment.flush({ ...detail, ownerUserId: 9, ownerDisplayName: 'Nueva responsable' });
    await settle();
    http.expectOne('/api/processes/8').flush({ ...detail, ownerUserId: 9, ownerDisplayName: 'Nueva responsable' });
    await settle();

    expect(text()).toContain('Responsable actualizado.');
    expect(text()).toContain('Nueva responsable · ID 9');
  });
});
