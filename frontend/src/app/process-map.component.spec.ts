import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { ProcessOutletData } from './access';
import { routes } from './app.routes';

const map = {
  macroprocesses: [
    {
      id: 1, code: 'MP1', name: 'Estratégicos', order: 1,
      processTypes: [
        { id: 10, name: 'Planificación', processes: [
          { id: 8, code: 'PR8', name: 'Planificación anual', status: 'Borrador', processTypeId: 10 },
          { id: 9, code: 'PR9', name: null, status: 'Vigente', processTypeId: 10 }
        ] },
        { id: 11, name: 'Seguimiento y evaluación', processes: [
          { id: 12, code: 'PR12', name: 'Seguimiento de metas', status: 'Borrador', processTypeId: 11 }
        ] }
      ]
    },
    { id: 2, code: 'MP2', name: 'Misionales', order: 2, processTypes: [] }
  ]
};

@Component({
  imports: [RouterOutlet],
  template: `<router-outlet [routerOutletData]="session" />`
})
class HostComponent {
  session: ProcessOutletData = { userId: 4, profiles: ['CONSULTATION'] };
}

describe('ProcessMapComponent', () => {
  let http: HttpTestingController;
  let router: Router;
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideZoneChangeDetection(), provideRouter(routes), provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  async function open(url: string): Promise<void> {
    await router.navigateByUrl(url);
    await settle();
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  function text(): string {
    return fixture.nativeElement.textContent as string;
  }

  it('is the entry point and lists macroprocesses with process and type counts for any profile', async () => {
    await open('/');
    expect(router.url).toBe('/mapa');
    expect(text()).toContain('Cargando mapa…');
    http.expectOne('/api/process-map').flush(map);
    await settle();

    const cards = [...fixture.nativeElement.querySelectorAll('a.map-card')] as HTMLAnchorElement[];
    expect(cards.map((card) => card.getAttribute('href'))).toEqual(['/mapa/macroprocesos/1', '/mapa/macroprocesos/2']);
    expect(cards[0].textContent).toContain('Estratégicos');
    expect(cards[0].textContent).toContain('3 procesos · 2 tipos');
    expect(cards[1].textContent).toContain('0 procesos · 0 tipos');
  });

  it('opens a macroprocess grouped by type, Borradores included, and links each process to its ficha', async () => {
    await open('/mapa/macroprocesos/1');
    http.expectOne('/api/process-map').flush(map);
    await settle();

    expect(text()).toContain('MP1 · 3 procesos · 2 tipos de proceso');
    const crumb = fixture.nativeElement.querySelector('ui-breadcrumbs a') as HTMLAnchorElement;
    expect(crumb.getAttribute('href')).toBe('/mapa');
    const sections = [...fixture.nativeElement.querySelectorAll('ui-section h3')].map((h: HTMLElement) => h.textContent);
    expect(sections).toEqual(['Planificación (2)', 'Seguimiento y evaluación (1)']);
    const links = [...fixture.nativeElement.querySelectorAll('.process-link-list a')] as HTMLAnchorElement[];
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['PR8 · Planificación anual', '/procesos/8'],
      ['PR9 · Sin nombre', '/procesos/9'],
      ['PR12 · Seguimiento de metas', '/procesos/12']
    ]);
    expect([...fixture.nativeElement.querySelectorAll('.process-link-list ui-badge')].map((b: HTMLElement) => b.textContent))
      .toEqual(['Borrador', 'Vigente', 'Borrador']);
  });

  it('regroups by status in the address without requesting the map again', async () => {
    await open('/mapa/macroprocesos/1');
    http.expectOne('/api/process-map').flush(map);
    await settle();

    const byStatus = [...fixture.nativeElement.querySelectorAll('.segmented button')]
      .find((button: HTMLButtonElement) => button.textContent === 'Por estado') as HTMLButtonElement;
    byStatus.click();
    await settle();
    expect(router.url).toBe('/mapa/macroprocesos/1?agrupar=estado');
    expect(byStatus.getAttribute('aria-pressed')).toBe('true');
    const sections = [...fixture.nativeElement.querySelectorAll('ui-section h3')].map((h: HTMLElement) => h.textContent);
    expect(sections).toEqual(['Borrador (2)', 'Vigente (1)']);
    expect(text()).toContain('Seguimiento y evaluación');
    http.expectNone('/api/process-map');
  });

  it('reports an unknown macroprocess and a failed map request', async () => {
    await open('/mapa/macroprocesos/99');
    http.expectOne('/api/process-map').flush(map);
    await settle();
    expect(text()).toContain('El macroproceso solicitado no está disponible.');

    await open('/mapa');
    http.expectOne('/api/process-map').flush({}, { status: 500, statusText: 'Error' });
    await settle();
    expect(text()).toContain('No fue posible cargar el mapa de procesos.');
    expect(fixture.nativeElement.querySelector('a.map-card')).toBeNull();
  });
});
