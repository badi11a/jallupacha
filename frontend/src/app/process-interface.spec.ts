import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { FICHA_FIELDS } from './features/processes/process-api.service';
import { AuthService } from './core/auth/auth.service';

const MAP = {
  macroprocessTypes: [{
    id: 1, name: 'Estratégicos', macroprocesses: [{
      id: 2, code: 'MP1', name: 'Estrategia', description: 'Define los objetivos de la entidad y supervisa el avance de sus metas.', processTypes: [{
        id: 3, name: 'Planificación', processes: [
          { id: 4, code: 'PR4', name: 'Plan anual', status: 'Borrador' }
        ]
      }]
    }]
  }]
};
const ITEM = { id: 4, code: 'PR4', name: 'Plan anual', processType: 'Planificación', status: 'Borrador', responsibleUnit: 'Dirección' };

describe('Interfaz base de esquema — adaptación visual', () => {
  beforeEach(() => {
    sessionStorage.setItem('jallupacha_user', JSON.stringify({
      userId: 1,
      displayName: 'Usuario Administrador',
      email: 'admin@example.test',
      profiles: ['ADMIN', 'RISK_MANAGER']
    }));
    const identity = JSON.parse(sessionStorage.getItem('jallupacha_user')!);
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideZoneChangeDetection(), provideRouter(routes), provideHttpClient(), provideHttpClientTesting()]
    });
    TestBed.inject(AuthService).currentUser.set(identity);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('muestra acciones de riesgos solo al perfil autorizado por el servidor', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/procesos/4');
    fixture.detectChanges();
    http.expectOne('/api/management/processes/4').flush({
      ...Object.fromEntries(FICHA_FIELDS.map(field => [field.key, 'Información del proceso'])),
      id: 4, code: 'PR4', name: 'Plan anual', macroprocessId: 2, macroprocess: 'Estrategia', processType: 'Planificación',
      status: 'Borrador', completeness: { complete: true, missing: [] }, possibleDuplicates: [],
      parent: null, subprocesses: [], units: [],
      risks: [{ id: 9, description: 'Riesgo de prueba', cause: 'Causa', consequence: 'Consecuencia', type: 'Operativo', level: 'Bajo' }],
      relations: { outgoing: [], incoming: [] }
    });
    const auth = TestBed.inject(AuthService);
    const root = fixture.nativeElement as HTMLElement;
    for (const profile of ['ADMIN', 'PROCESS_OWNER', 'CONSULTATION', 'VALIDATOR', 'RISK_MANAGER'] as const) {
      auth.currentUser.update(user => user ? { ...user, profiles: [profile] } : user);
      fixture.detectChanges();
      const risks = [...root.querySelectorAll('ui-section')].find(section => section.querySelector('h3')?.textContent === 'Riesgos')!;
      const actions = [...risks.querySelectorAll('button')].map(button => button.textContent?.trim());
      for (const label of ['Agregar riesgo', 'Editar', 'Eliminar']) {
        expect(actions.includes(label), `${profile}: ${label}`).toBe(profile === 'RISK_MANAGER');
      }
    }
    fixture.destroy();
    http.verify();
  });

  it('renderiza la navegación local del módulo de forma estable, identifica la sección activa y no reproduce datos ficticios de B', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    const expectations = {
      '/mapa': 'Mapa',
      '/procesos': 'Procesos',
      '/unidades': 'Unidades internas',
      '/tipos-de-proceso': 'Tipos de proceso'
    };
    for (const [path, activeLabel] of Object.entries(expectations)) {
      await router.navigateByUrl(path);
      fixture.detectChanges();
      http.match(() => true).forEach(request => {
        expect(request.request.url).toMatch(/^\/api\/management\//);
        request.flush(request.request.url.endsWith('/map') ? { macroprocessTypes: [] } : []);
      });
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('ui-module-nav')).not.toBeNull();
      expect(root.querySelector('main router-outlet')).not.toBeNull();
      expect(root.querySelector('#map-filter') !== null).toBe(path === '/mapa');

      const activeLink = root.querySelector('ui-module-nav a[aria-current="page"]');
      expect(activeLink?.textContent?.trim()).toBe(activeLabel);

      expect(root.querySelector('.topbar, .app-nav, .sidebar, .shell-navigation, .app-footer, .account')).toBeNull();
      expect(root.textContent).not.toMatch(/\bAdmin\b|Cambiar Sede|Favoritos|533|En revisión/);
    }
    fixture.destroy();
    http.verify();
  });

  it('muestra nombres sin códigos en las tarjetas y permite buscar por código o nombre', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/mapa');
    fixture.detectChanges();
    http.expectOne('/api/management/map').flush({
      macroprocessTypes: [{
        id: 1, name: 'Estratégicos', macroprocesses: [{
          id: 2, code: 'MP1', name: 'Estratégicos', processTypes: [{
            id: 3, name: 'Planificación', processes: [
              { id: 4, code: 'PR4', name: 'Plan anual', status: 'Borrador' },
              { id: 5, code: 'PR5', name: 'Seguimiento', status: 'Borrador' }
            ]
          }]
        }]
      }]
    });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect([...root.querySelectorAll('.macro-link')].map(a => a.getAttribute('href'))).toEqual(['/mapa/macroprocesos/2']);
    expect(root.textContent).toContain('2 procesos');
    const search = root.querySelector('#map-filter') as HTMLInputElement;
    for (const [term, count] of [['mp1', 1], ['ESTRATEGICOS', 1], ['inexistente', 0], ['', 1]] as const) {
      search.value = term;
      search.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(root.querySelectorAll('.macro-link')).toHaveLength(count);
    }
    expect(root.querySelectorAll('.macro-link')).toHaveLength(1);
    expect(root.querySelectorAll('.map-hero, .map-panel')).toHaveLength(2);
    expect(root.querySelector('.map-bottom a')).toBeNull();
    expect(root.querySelector('.map-heading a[href="/procesos/nuevo"]')).toBeNull();
    expect(root.querySelector('.macro-link')?.textContent).not.toContain('MP1');
    expect(root.querySelector('.macro-title')?.textContent).toBe('Estratégicos');
    expect(root.querySelector('.macro-desc')).toBeNull();
    expect(root.textContent).not.toMatch(/533|46 tipos|UTA 2026|Macro Región Andina|Dirección y Desarrollo Estratégico/);
    fixture.destroy();
    http.verify();
  });

  it('anuncia carga y error de API sin ofrecer tarjetas ficticias', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/mapa');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Cargando información');
    http.expectOne('/api/management/map').flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No fue posible cargar el mapa');
    expect(root.querySelectorAll('.macro-link')).toHaveLength(0);
    fixture.destroy();
    http.verify();
  });

  it('combina búsqueda y clasificación y conserva el color de familia', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/mapa'); fixture.detectChanges();
    http.expectOne('/api/management/map').flush({
      macroprocessTypes: [
        ...MAP.macroprocessTypes,
        { id: 8, name: 'Misionales', macroprocesses: [{ id: 9, code: 'MP2', name: 'Servicios', processTypes: [] }] },
        { id: 10, name: 'De apoyo', macroprocesses: [{ id: 11, code: 'MP3', name: 'Soporte', processTypes: [] }] }
      ]
    });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const button = (name: string) => [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === name)!;
    button('Misionales').click(); fixture.detectChanges();
    expect(root.querySelectorAll('.family')).toHaveLength(1);
    expect(root.querySelector('.family')?.getAttribute('data-tone')).toBe('mission');
    expect(button('Misionales').getAttribute('aria-pressed')).toBe('true');
    const search = root.querySelector('#map-filter') as HTMLInputElement;
    search.value = 'soporte'; search.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(root.querySelectorAll('.macro-link')).toHaveLength(0);
    button('Todos').click(); fixture.detectChanges();
    expect(root.querySelectorAll('.macro-link')).toHaveLength(1);
    expect(root.querySelector('.family')?.getAttribute('data-tone')).toBe('support');
    expect(root.querySelector('.macro-link')?.getAttribute('href')).toBe('/mapa/macroprocesos/11?mapQ=soporte');
    expect(root.querySelector('.help-button')).toBeNull();
    fixture.destroy(); http.verify();
  });

  it('abre el macroproceso desde el mapa y conserva filtros en URL y contrato API', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await router.navigateByUrl('/mapa'); fixture.detectChanges();
    http.expectOne('/api/management/map').flush(MAP); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.macro-desc')?.textContent).toBe(MAP.macroprocessTypes[0].macroprocesses[0].description);
    expect(root.querySelector('.macro-title')?.nextElementSibling?.className).toBe('macro-desc');
    (root.querySelector('.macro-link') as HTMLAnchorElement).click();
    await fixture.whenStable(); fixture.detectChanges();
    expect(router.url).toBe('/mapa/macroprocesos/2');
    http.expectOne('/api/management/map').flush(MAP);
    http.expectOne('/api/management/units').flush([{ id: 7, name: 'Dirección', isActive: true }]);
    http.expectOne(r => r.url.endsWith('/processes') && r.params.get('macroprocessId') === '2').flush([ITEM]);
    fixture.detectChanges();
    expect(root.querySelector('#macro-title')?.textContent).toBe('Estrategia');
    expect(root.querySelector('.hero-desc')?.textContent).toBe(MAP.macroprocessTypes[0].macroprocesses[0].description);
    expect(root.querySelector('#macro-title')?.nextElementSibling?.className).toBe('hero-desc');
    expect(root.textContent).not.toContain('Tipos y procesos del mapa completo de este macroproceso. Las unidades se cuentan en los resultados filtrados, hasta 300.');
    expect(root.querySelector('#map-filter')).toBeNull();
    expect(root.querySelector('.topbar, .app-nav, .sidebar, .app-footer')).toBeNull();
    expect(root.querySelector('.process-row')?.getAttribute('href')).toBe('/procesos/4?returnTo=%2Fmapa%2Fmacroprocesos%2F2');
    expect(root.querySelector('ui-module-nav a[aria-current="location"]')?.textContent?.trim()).toBe('Mapa');

    await router.navigateByUrl('/mapa/macroprocesos/2?type=3&q=plan&unit=7'); fixture.detectChanges();
    http.expectOne('/api/management/map').flush({ macroprocessTypes: [{ ...MAP.macroprocessTypes[0], macroprocesses: [{ ...MAP.macroprocessTypes[0].macroprocesses[0], description: '   ' }] }] });
    http.expectOne('/api/management/units').flush([]);
    http.expectOne(r => r.url.endsWith('/processes') && r.params.get('macroprocessId') === '2'
      && r.params.get('processTypeId') === '3' && r.params.get('q') === 'plan' && r.params.get('unitId') === '7').flush([]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelector('.hero-desc')).toBeNull();
    expect((root.querySelector('input[name="q"]') as HTMLInputElement).value).toBe('plan');
    expect(root.querySelector('.type-filters [aria-current="true"]')?.textContent).toContain('Planificación');
    expect(root.textContent).toContain('Ningún proceso coincide');

    await router.navigateByUrl('/mapa/macroprocesos/99'); fixture.detectChanges();
    http.expectOne('/api/management/map').flush(MAP);
    http.expectOne('/api/management/units').flush([]);
    http.expectOne(r => r.url.endsWith('/processes') && r.params.get('macroprocessId') === '99').flush([]);
    fixture.detectChanges();
    expect(root.textContent).toContain('Macroproceso no encontrado');
    expect(root.querySelector('.process-row')).toBeNull();
    fixture.destroy(); http.verify();
  });

  it('conserva el origen filtrado en la ficha y su enlace de edición (FE-04)', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await router.navigateByUrl('/procesos/4?returnTo=%2Fprocesos%3Fq%3Dejemplo'); fixture.detectChanges();
    http.expectOne('/api/management/processes/4').flush({
      ...Object.fromEntries(FICHA_FIELDS.map(field => [field.key, null])),
      id: 4, code: 'PR4', name: 'Proceso de ejemplo', macroprocessId: 2, processTypeId: 3,
      macroprocess: 'Gestión de la entidad', processType: 'Gestión', status: 'Borrador',
      completeness: { complete: false, missing: [] }, possibleDuplicates: [], parent: null, subprocesses: [],
      units: [], risks: [], relations: { outgoing: [], incoming: [] }
    }); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('a[href="/mapa/macroprocesos/2?type=3"]')).not.toBeNull();
    expect(root.querySelector('a[href="/procesos/4/editar?returnTo=%2Fprocesos%3Fq%3Dejemplo"]')).not.toBeNull();
    expect([...root.querySelectorAll('button')].some(button => button.textContent?.trim() === 'Volver a resultados')).toBe(true);
    expect(root.textContent).not.toContain('contacto.unidad@');
    expect(root.textContent).not.toContain('Anexo institucional:');
    fixture.destroy(); http.verify();
  });

  it('presenta todos los campos de ficha, gobernanza, avisos y acciones sin inventar contenido', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/procesos/4'); fixture.detectChanges();
    const detail = {
      ...Object.fromEntries(FICHA_FIELDS.map(field => [field.key, `Valor de ${field.key}`])),
      id: 4, code: 'PR4', name: 'Plan anual', macroprocessId: 2, macroprocess: 'Estrategia', macroprocessType: 'Estratégicos', processType: 'Planificación',
      status: 'Borrador', completeness: { complete: false, missing: ['Entradas'] }, possibleDuplicates: [{ id: 5, code: 'PR5', name: 'Plan similar' }],
      parent: { id: 6, code: 'PR6', name: 'Padre' }, subprocesses: [{ id: 7, code: 'PR7', name: 'Hijo' }],
      units: [{ unitId: 8, name: 'Dirección', isActive: false, role: 'PARTICIPANTE', function: 'Coordinar' }],
      risks: [{ id: 9, description: 'Riesgo de prueba', cause: 'Causa', consequence: 'Consecuencia', type: 'Operativo', level: 'Crítico' }],
      relations: { outgoing: [{ id: 10, processId: 5, code: 'PR5', name: 'Destino', type: 'FLUJO', description: 'Entrega' }], incoming: [] }
    };
    http.expectOne('/api/management/processes/4').flush(detail); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    for (const field of FICHA_FIELDS) expect(root.textContent, field.key).toContain(`Valor de ${field.key}`);
    expect(root.querySelector('.topbar, .app-nav, .sidebar, .app-footer')).toBeNull();
    expect(root.querySelector('ui-module-nav a[aria-current="location"]')?.textContent?.trim()).toBe('Procesos');
    expect(root.querySelector('.purpose')?.textContent).toContain('Valor de objective');
    expect(root.querySelector('.governance')?.textContent).toContain('Coordinar');
    expect(root.querySelector('.governance')?.textContent).toContain('Inactiva');
    expect(root.textContent).toContain('Faltan campos mínimos: Entradas');
    expect(root.textContent).toContain('Posibles duplicados');
    expect(root.textContent).toContain('Crítico');
    expect(root.textContent).not.toMatch(/Diagrama disponible|Medio-Alto|direccion.planificacion@/);
    expect(root.querySelector('.trio-box')?.textContent).toContain('ÁREA DE NEGOCIO');
    expect(root.querySelector('.trio-box')?.textContent).not.toContain('UNIDAD RESPONSABLE');
    expect(root.querySelector('.governance')?.textContent).toContain('UNIDAD RESPONSABLE');
    expect(root.querySelector('a[href="/mapa/macroprocesos/2"]')).not.toBeNull();
    expect(root.querySelector('a[href="/procesos/4/editar"]')).not.toBeNull();
    expect(root.querySelector('a[href="/procesos/4/editar"]')?.classList.contains('quiet-button')).toBe(true);
    for (const label of ['Agregar riesgo', 'Agregar relación', 'Editar', 'Eliminar']) {
      expect([...root.querySelectorAll('button, a')].some(el => el.textContent?.trim() === label), label).toBe(true);
    }
    const addRisk = [...root.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Agregar riesgo')!;
    addRisk.click(); fixture.detectChanges();
    const form = root.querySelector('form[aria-label="Nuevo riesgo"]') as HTMLFormElement;
    for (const [name, value] of Object.entries({ description: 'Nuevo riesgo', cause: 'Causa nueva', consequence: 'Consecuencia nueva', type: 'Operativo', level: 'Alto' })) {
      const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement;
      input.value = value; input.dispatchEvent(new Event(name === 'level' ? 'change' : 'input'));
    }
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const request = http.expectOne({ method: 'POST', url: '/api/management/processes/4/risks' });
    expect(request.request.body).toEqual({ description: 'Nuevo riesgo', cause: 'Causa nueva', consequence: 'Consecuencia nueva', type: 'Operativo', level: 'Alto' });
    request.flush({});
    http.expectOne('/api/management/processes/4').flush(detail); fixture.detectChanges();
    expect(root.textContent).toContain('Riesgo guardado');

    // Confirmación modal accesible para eliminar riesgo (R-07.1)
    const removeRiskBtn = [...root.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Eliminar')!;
    removeRiskBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();
    const dialog = root.querySelector('dialog') as HTMLDialogElement;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('¿Confirmas la eliminación definitiva de este riesgo?');
    const confirmDelete = [...dialog.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Eliminar')!;
    expect(confirmDelete.classList.contains('danger-button')).toBe(true);
    confirmDelete.click();
    await fixture.whenStable();
    fixture.detectChanges();
    const delReq = http.expectOne({ method: 'DELETE', url: '/api/management/processes/4/risks/9' });
    delReq.flush({});
    http.expectOne('/api/management/processes/4').flush(detail);
    fixture.detectChanges();
    expect(root.textContent).toContain('Riesgo eliminado');

    fixture.destroy(); http.verify();
  });

  it('valida campos obligatorios in-situ y protege cambios no guardados en el formulario de proceso', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await router.navigateByUrl('/procesos/nuevo');
    fixture.detectChanges();
    http.expectOne('/api/management/process-types').flush([
      { id: 10, name: 'Planificación', macroprocessId: 2, macroprocessCode: 'MP1', macroprocessName: 'Estrategia', processCount: 0, isActive: true }
    ]);
    http.expectOne('/api/management/units').flush([{ id: 8, name: 'Dirección', isActive: true }]);
    http.expectOne('/api/management/processes').flush([]);
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    // Señalización de obligatoriedad (R-05.4)
    expect(root.querySelector('label[for="field-name"]')?.textContent).toContain('(obligatorio)');
    expect(root.querySelector('label[for="field-macro"]')?.textContent).toContain('(obligatorio)');
    expect(root.querySelector('label[for="field-type"]')?.textContent).toContain('(obligatorio)');

    // Validación in-situ (R-06.1)
    const submitBtn = [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Guardar proceso')!;
    submitBtn.click();
    fixture.detectChanges();

    const nameInput = root.querySelector('#field-name') as HTMLInputElement;
    expect(nameInput.getAttribute('aria-invalid')).toBe('true');
    expect(root.querySelector('#error-name')?.textContent).toContain('El nombre es obligatorio');

    // Modificar datos para activar dirty state (R-07.2)
    nameInput.value = 'Proceso modificado';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    // Intentar cancelar o navegar fuera debe pedir confirmación modal
    const cancelBtn = [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Cancelar')!;
    cancelBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const dialog = root.querySelector('dialog') as HTMLDialogElement;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Hay modificaciones pendientes en el formulario');

    // Si cancela el diálogo, permanece en la pantalla
    const stayBtn = [...dialog.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Continuar editando')!;
    stayBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/procesos/nuevo');

    // Si confirma descartar, permite salir
    cancelBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();
    const discardDialog = root.querySelector('dialog') as HTMLDialogElement;
    const leaveBtn = [...discardDialog.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Descartar cambios')!;
    leaveBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toBe('/procesos');
    http.expectOne('/api/management/process-types').flush([]);
    http.expectOne('/api/management/units').flush([]);
    http.expectOne('/api/management/processes').flush([]);

    fixture.destroy(); http.verify();
  });

  it('muestra botones Desactivar con nivel secundario y confirmación modal en unidades y tipos', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await router.navigateByUrl('/unidades');
    fixture.detectChanges();
    http.expectOne('/api/management/units').flush([{ id: 1, name: 'Unidad A', parentUnitId: null, processCount: 0, isActive: true }]);
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const deactBtn = [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Desactivar')!;
    expect(deactBtn.classList.contains('quiet-button')).toBe(true);
    expect(deactBtn.classList.contains('danger-button')).toBe(false);

    // Confirmación modal accesible (R-07.1)
    deactBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();
    const dialog = root.querySelector('dialog') as HTMLDialogElement;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('¿Desactivar la unidad "Unidad A"?');
    const confirmBtn = [...dialog.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Desactivar')!;
    confirmBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const deactReq = http.expectOne({ method: 'PATCH', url: '/api/management/units/1/deactivate' });
    deactReq.flush({});
    http.expectOne('/api/management/units').flush([{ id: 1, name: 'Unidad A', parentUnitId: null, processCount: 0, isActive: false }]);
    fixture.detectChanges();
    expect(root.textContent).toContain('Unidad desactivada');

    fixture.destroy(); http.verify();
  });

  it('permite salir del formulario sin confirmación cuando no existen cambios modificados (R-07.2)', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await router.navigateByUrl('/procesos/nuevo');
    fixture.detectChanges();
    http.expectOne('/api/management/process-types').flush([
      { id: 10, name: 'Planificación', macroprocessId: 2, macroprocessCode: 'MP1', macroprocessName: 'Estrategia', processCount: 0, isActive: true }
    ]);
    http.expectOne('/api/management/units').flush([{ id: 8, name: 'Dirección', isActive: true }]);
    http.expectOne('/api/management/processes').flush([]);
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('dialog')).toBeNull();

    // 1. Salir usando el botón "Cancelar" sin haber modificado ningún campo
    const cancelBtn = [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Cancelar')!;
    cancelBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    // Debe navegar a /procesos directamente sin levantar modal de confirmación
    expect(root.querySelector('dialog')).toBeNull();
    expect(router.url).toBe('/procesos');
    http.expectOne('/api/management/process-types').flush([]);
    http.expectOne('/api/management/units').flush([]);
    http.expectOne('/api/management/processes').flush([]);

    // 2. Comprobar navegación directa mediante router o migas de pan desde /procesos/nuevo sin cambios
    await router.navigateByUrl('/procesos/nuevo');
    fixture.detectChanges();
    http.expectOne('/api/management/process-types').flush([]);
    http.expectOne('/api/management/units').flush([]);
    http.expectOne('/api/management/processes').flush([]);
    fixture.detectChanges();
    await fixture.whenStable();

    // Navegar a otra ruta (ej. /mapa): el guard evalúa isDirty() === false y permite la navegación inmediata
    await router.navigateByUrl('/mapa');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.querySelector('dialog')).toBeNull();
    expect(router.url).toBe('/mapa');
    http.expectOne('/api/management/map').flush(MAP);

    fixture.destroy();
    http.verify();
  });

  it('protege cambios no guardados en el subformulario de riesgos de la ficha (R-07.2)', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await router.navigateByUrl('/procesos/4');
    fixture.detectChanges();
    const detail = {
      id: 4, code: 'PR4', name: 'Plan anual', macroprocessId: 2, macroprocess: 'Estrategia', macroprocessType: 'Estratégicos', processType: 'Planificación',
      status: 'Borrador', completeness: { complete: true, missing: [] }, possibleDuplicates: [],
      parent: null, subprocesses: [],
      units: [], risks: [], relations: { outgoing: [], incoming: [] }
    };
    http.expectOne('/api/management/processes/4').flush(detail);
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;

    // 1. Abrir subformulario de riesgo y cancelar SIN cambios: se cierra sin diálogo
    const addRisk = [...root.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Agregar riesgo')!;
    addRisk.click();
    fixture.detectChanges();
    expect(root.querySelector('form[aria-label="Nuevo riesgo"]')).not.toBeNull();

    const cancelClean = [...root.querySelectorAll<HTMLButtonElement>('form[aria-label="Nuevo riesgo"] button')].find(b => b.textContent?.trim() === 'Cancelar')!;
    cancelClean.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelector('dialog')).toBeNull();
    expect(root.querySelector('form[aria-label="Nuevo riesgo"]')).toBeNull();

    // 2. Abrir subformulario de riesgo, escribir texto y pulsar Cancelar: requiere confirmación modal
    const addRisk2 = [...root.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Agregar riesgo')!;
    addRisk2.click();
    fixture.detectChanges();
    const descInput = root.querySelector('form[aria-label="Nuevo riesgo"] textarea[name="description"]') as HTMLTextAreaElement;
    descInput.value = 'Riesgo con cambios pendientes';
    descInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    const cancelDirty = [...root.querySelectorAll<HTMLButtonElement>('form[aria-label="Nuevo riesgo"] button')].find(b => b.textContent?.trim() === 'Cancelar')!;
    cancelDirty.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const dialog = root.querySelector('dialog') as HTMLDialogElement;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Hay cambios sin guardar en el riesgo');

    // Confirmar descarte cierra el formulario
    const discardBtn = [...dialog.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Descartar cambios')!;
    discardBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelector('form[aria-label="Nuevo riesgo"]')).toBeNull();

    // 3. Abrir riesgo con cambios e intentar navegar fuera por router: el guard R-07.2 lo intercepta
    const addRisk3 = [...root.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Agregar riesgo')!;
    addRisk3.click();
    fixture.detectChanges();
    const descInput2 = root.querySelector('form[aria-label="Nuevo riesgo"] textarea[name="description"]') as HTMLTextAreaElement;
    descInput2.value = 'Riesgo no guardado para navegación';
    descInput2.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    // Iniciar navegación a /mapa: el guard se ejecuta asíncronamente
    const navPromise = router.navigateByUrl('/mapa');
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();

    const leaveDialog = root.querySelector('dialog') as HTMLDialogElement;
    expect(leaveDialog).not.toBeNull();
    expect(leaveDialog.textContent).toContain('Hay modificaciones pendientes en el formulario de la ficha');

    // Continuar editando rechaza la navegación y permanece en la ficha
    const stayBtn = [...leaveDialog.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Continuar editando')!;
    stayBtn.click();
    const navResult = await navPromise;
    expect(navResult).toBe(false);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/procesos/4');

    // Iniciar navegación a /mapa y confirmar descarte: permite salir al mapa
    const navPromise2 = router.navigateByUrl('/mapa');
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();

    const leaveDialog2 = root.querySelector('dialog') as HTMLDialogElement;
    const leaveBtn = [...leaveDialog2.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Descartar cambios')!;
    leaveBtn.click();
    const navResult2 = await navPromise2;
    expect(navResult2).toBe(true);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(router.url).toBe('/mapa');
    http.expectOne('/api/management/map').flush(MAP);

    fixture.destroy();
    http.verify();
  });
});
