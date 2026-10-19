import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { FICHA_FIELDS } from './mvp-v14-api.service';

const MAP = { macroprocessTypes: [{ id: 1, name: 'Estratégicos', macroprocesses: [{
  id: 2, code: 'MP1', name: 'Estrategia', processTypes: [{ id: 3, name: 'Planificación', processes: [
    { id: 4, code: 'PR4', name: 'Plan anual', status: 'Borrador' }
  ] }]
}] }] };
const ITEM = { id: 4, code: 'PR4', name: 'Plan anual', processType: 'Planificación', status: 'Borrador', responsibleUnit: 'Dirección' };

describe('Interfaz MVP v14 — adaptación visual', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [AppComponent],
    providers: [provideZoneChangeDetection(), provideRouter(routes), provideHttpClient(), provideHttpClientTesting()]
  }));

  it('conserva las rutas sin cabecera, menú lateral ni pie de aplicación', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    for (const path of ['/mapa', '/procesos', '/unidades', '/tipos-de-proceso']) {
      await router.navigateByUrl(path);
      fixture.detectChanges();
      http.match(() => true).forEach(request => {
        expect(request.request.url).toMatch(/^\/api\/mvp-v14\//);
        request.flush(request.request.url.endsWith('/map') ? { macroprocessTypes: [] } : []);
      });
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('.topbar, .app-nav, .sidebar, .shell-navigation, .app-footer')).toBeNull();
      expect(root.querySelector('main router-outlet')).not.toBeNull();
      expect(root.querySelector('#map-filter') !== null).toBe(path === '/mapa');
      expect(root.querySelector('.account')).toBeNull();
      expect(root.textContent).not.toMatch(/Admin|Cambiar Sede|Favoritos|533|En revisión/);
    }
    fixture.destroy();
    http.verify();
  });

  it('muestra macroprocesos de la API y busca por código o nombre sin copiar datos de B', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/mapa');
    fixture.detectChanges();
    http.expectOne('/api/mvp-v14/map').flush({ macroprocessTypes: [{
      id: 1, name: 'Estratégicos', macroprocesses: [{ id: 2, code: 'MP1', name: 'Estratégicos', processTypes: [{
        id: 3, name: 'Planificación', processes: [
          { id: 4, code: 'PR4', name: 'Plan anual', status: 'Borrador' },
          { id: 5, code: 'PR5', name: 'Seguimiento', status: 'Borrador' }
        ]
      }] }]
    }] });
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
    expect(root.querySelector('a[href="/procesos"]')?.textContent).toContain('Buscar procesos');
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
    http.expectOne('/api/mvp-v14/map').flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No fue posible cargar el mapa');
    expect(root.querySelectorAll('.macro-link')).toHaveLength(0);
    fixture.destroy();
    http.verify();
  });

  it('combina búsqueda y clasificación, conserva el color de familia y abre ayuda', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/mapa'); fixture.detectChanges();
    http.expectOne('/api/mvp-v14/map').flush({ macroprocessTypes: [
      ...MAP.macroprocessTypes,
      { id: 8, name: 'Misionales', macroprocesses: [{ id: 9, code: 'MP2', name: 'Servicios', processTypes: [] }] },
      { id: 10, name: 'De apoyo', macroprocesses: [{ id: 11, code: 'MP3', name: 'Soporte', processTypes: [] }] }
    ] });
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
    expect(root.querySelector('.macro-link')?.getAttribute('href')).toBe('/mapa/macroprocesos/11');
    button('ⓘ Ayuda').click(); fixture.detectChanges();
    expect(root.querySelector('dialog')?.textContent).toContain('Cómo explorar el mapa');
    button('Entendido').click(); fixture.detectChanges();
    expect(root.querySelector('dialog')).toBeNull();
    fixture.destroy(); http.verify();
  });

  it('abre el macroproceso desde el mapa y conserva filtros en URL y contrato API', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await router.navigateByUrl('/mapa'); fixture.detectChanges();
    http.expectOne('/api/mvp-v14/map').flush(MAP); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.macro-link') as HTMLAnchorElement).click();
    await fixture.whenStable(); fixture.detectChanges();
    expect(router.url).toBe('/mapa/macroprocesos/2');
    http.expectOne('/api/mvp-v14/map').flush(MAP);
    http.expectOne('/api/mvp-v14/units').flush([{ id: 7, name: 'Dirección', isActive: true }]);
    http.expectOne(r => r.url.endsWith('/processes') && r.params.get('macroprocessId') === '2').flush([ITEM]);
    fixture.detectChanges();
    expect(root.querySelector('#macro-title')?.textContent).toBe('Estrategia');
    expect(root.querySelector('#map-filter')).toBeNull();
    expect(root.querySelector('.topbar, .app-nav, .sidebar, .app-footer')).toBeNull();
    expect(root.querySelector('.process-row')?.getAttribute('href')).toBe('/procesos/4');

    await router.navigateByUrl('/mapa/macroprocesos/2?type=3&q=plan&unit=7'); fixture.detectChanges();
    http.expectOne('/api/mvp-v14/map').flush(MAP);
    http.expectOne('/api/mvp-v14/units').flush([]);
    http.expectOne(r => r.url.endsWith('/processes') && r.params.get('macroprocessId') === '2'
      && r.params.get('processTypeId') === '3' && r.params.get('q') === 'plan' && r.params.get('unitId') === '7').flush([]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect((root.querySelector('input[name="q"]') as HTMLInputElement).value).toBe('plan');
    expect(root.querySelector('.type-filters [aria-current="true"]')?.textContent).toContain('Planificación');
    expect(root.textContent).toContain('Ningún proceso coincide');

    await router.navigateByUrl('/mapa/macroprocesos/99'); fixture.detectChanges();
    http.expectOne('/api/mvp-v14/map').flush(MAP);
    http.expectOne('/api/mvp-v14/units').flush([]);
    http.expectOne(r => r.url.endsWith('/processes') && r.params.get('macroprocessId') === '99').flush([]);
    fixture.detectChanges();
    expect(root.textContent).toContain('Macroproceso no encontrado');
    expect(root.querySelector('.process-row')).toBeNull();
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
    http.expectOne('/api/mvp-v14/processes/4').flush(detail); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    for (const field of FICHA_FIELDS) expect(root.textContent, field.key).toContain(`Valor de ${field.key}`);
    expect(root.querySelector('.topbar, .app-nav, .sidebar, .app-footer')).toBeNull();
    expect(root.querySelector('.purpose')?.textContent).toContain('Valor de objective');
    expect(root.querySelector('.governance')?.textContent).toContain('Coordinar');
    expect(root.querySelector('.governance')?.textContent).toContain('Inactiva');
    expect(root.textContent).toContain('Faltan campos mínimos: Entradas');
    expect(root.textContent).toContain('Posibles duplicados');
    expect(root.textContent).toContain('Crítico');
    expect(root.textContent).not.toMatch(/Diagrama disponible|Medio-Alto|direccion.planificacion@/);
    expect(root.querySelector('a[href="/mapa/macroprocesos/2"]')).not.toBeNull();
    expect(root.querySelector('a[href="/procesos/4/editar"]')).not.toBeNull();
    for (const label of ['Agregar riesgo', 'Agregar relación', 'Editar', 'Eliminar']) {
      expect([...root.querySelectorAll('button')].some(button => button.textContent?.trim() === label), label).toBe(true);
    }
    const addRisk = [...root.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Agregar riesgo')!;
    addRisk.click(); fixture.detectChanges();
    const form = root.querySelector('form[aria-label="Nuevo riesgo"]') as HTMLFormElement;
    for (const [name, value] of Object.entries({ description: 'Nuevo riesgo', cause: 'Causa nueva', consequence: 'Consecuencia nueva', type: 'Operativo', level: 'Alto' })) {
      const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement;
      input.value = value; input.dispatchEvent(new Event(name === 'level' ? 'change' : 'input'));
    }
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const request = http.expectOne({ method: 'POST', url: '/api/mvp-v14/processes/4/risks' });
    expect(request.request.body).toEqual({ description: 'Nuevo riesgo', cause: 'Causa nueva', consequence: 'Consecuencia nueva', type: 'Operativo', level: 'Alto' });
    request.flush({});
    http.expectOne('/api/mvp-v14/processes/4').flush(detail); fixture.detectChanges();
    expect(root.textContent).toContain('Riesgo guardado');
    fixture.destroy(); http.verify();
  });
});
