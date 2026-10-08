import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter, withRouterConfig } from '@angular/router';
import { ProcessOutletData } from './access';
import { routes } from './app.routes';
import { UiDialogHostComponent } from './shared/ui';

const process = {
  id: 8, code: 'PR8', name: 'Planificación anual', ownerUserId: 7,
  macroprocessId: 1, macroprocessName: 'Estratégicos', processTypeId: 10, processTypeName: 'Planificación',
  ownerDisplayName: 'Usuario responsable', status: 'Borrador', revision: 1, versionNumber: 1, parentProcessId: null
};
const risk = {
  id: 3, processId: 8, description: 'Retraso en la consolidación', cause: 'Información incompleta',
  consequence: 'Plan desactualizado', riskTypeId: 1, riskTypeName: 'Operacional', riskLevelId: 3,
  riskLevelName: 'Alto', createdAt: '2026-10-08T12:30:00Z'
};
const riskPage = { items: [risk], total: 1, page: 1, limit: 100 };
const types = { items: [{ id: 1, name: 'Operacional', isActive: 1 }, { id: 2, name: 'Financiero', isActive: 0 }] };
const levels = { items: [
  { id: 3, name: 'Alto', isActive: 1 }, { id: 1, name: 'Bajo', isActive: 1 },
  { id: 4, name: 'Crítico', isActive: 1 }, { id: 2, name: 'Medio', isActive: 1 }
] };

@Component({
  imports: [RouterOutlet, UiDialogHostComponent],
  template: `<router-outlet [routerOutletData]="session" /><ui-dialog-host />`
})
class HostComponent {
  session: ProcessOutletData = { userId: 5, profiles: ['RISK_MANAGER'] };
}

describe('ProcessRisksComponent', () => {
  let http: HttpTestingController;
  let router: Router;
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideZoneChangeDetection(),
        provideRouter(routes, withRouterConfig({ canceledNavigationResolution: 'computed' })),
        provideHttpClient(),
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
    // Una ruta sin peticiones: el nuevo outlet no reactiva la pantalla anterior
    // y la navegación siguiente no se omite por repetir la misma dirección.
    await router.navigateByUrl('/sin-seccion');
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

  function text(): string {
    return fixture.nativeElement.textContent as string;
  }

  function query<T extends HTMLElement>(selector: string): T {
    return fixture.nativeElement.querySelector(selector) as T;
  }

  function control(label: string): HTMLElement | undefined {
    return [...fixture.nativeElement.querySelectorAll('a, button')]
      .find((element: HTMLElement) => element.textContent?.trim() === label) as HTMLElement | undefined;
  }

  function type(selector: string, value: string): void {
    const field = query<HTMLTextAreaElement>(selector);
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }

  async function flushManagerView(): Promise<void> {
    http.expectOne('/api/processes/8').flush(process);
    await settle();
    http.expectOne('/api/processes/8/risks?page=1&limit=100').flush(riskPage);
    await settle();
    http.expectOne('/api/risk-types').flush(types);
    http.expectOne('/api/risk-levels').flush(levels);
    await settle();
  }

  it('lets the risk manager read risks and register a valid risk with the five fields', async () => {
    await start('/procesos/8/riesgos', { userId: 5, profiles: ['RISK_MANAGER'] });
    await flushManagerView();

    const crumbs = [...fixture.nativeElement.querySelectorAll('ui-breadcrumbs a')].map((a: HTMLElement) => a.getAttribute('href'));
    expect(crumbs).toEqual(['/mapa', '/mapa/macroprocesos/1', '/procesos/8']);
    const badge = query<HTMLElement>('.risk-item ui-badge');
    expect(badge.textContent).toBe('Nivel Alto');
    expect(badge.classList).toContain('badge-danger');
    expect(text()).toContain('Información incompleta');
    expect(text()).toContain('2026-10-08 12:30');

    expect([...query<HTMLSelectElement>('#risk-type').options].map((o) => o.textContent)).toEqual(['Seleccione un tipo', 'Operacional']);
    expect([...query<HTMLSelectElement>('#risk-level').options].map((o) => o.textContent))
      .toEqual(['Seleccione un nivel', 'Bajo', 'Medio', 'Alto', 'Crítico']);

    query<HTMLFormElement>('.process-editor').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await settle();
    http.expectNone({ method: 'POST', url: '/api/processes/8/risks' });
    expect(text()).toContain('Seleccione un tipo de riesgo.');
    expect(text()).toContain('Seleccione un nivel de riesgo.');
    expect(query<HTMLElement>('#risk-type').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(query('#risk-type'));

    type('#risk-description', '  Pérdida de trazabilidad  ');
    type('#risk-cause', 'Registro <b>manual</b>');
    type('#risk-consequence', 'Decisiones sin respaldo');
    const typeSelect = query<HTMLSelectElement>('#risk-type');
    typeSelect.value = typeSelect.options[1].value;
    typeSelect.dispatchEvent(new Event('change'));
    const levelSelect = query<HTMLSelectElement>('#risk-level');
    levelSelect.value = levelSelect.options[2].value;
    levelSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(text()).toContain('No se admite marcado HTML.');

    type('#risk-cause', 'Registro manual');
    fixture.detectChanges();
    query<HTMLFormElement>('.process-editor').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const request = http.expectOne({ method: 'POST', url: '/api/processes/8/risks' });
    expect(request.request.body).toEqual({
      description: 'Pérdida de trazabilidad', cause: 'Registro manual', consequence: 'Decisiones sin respaldo',
      riskTypeId: 1, riskLevelId: 2
    });
    request.flush({ ...risk, id: 4 });
    await settle();
    http.expectOne('/api/processes/8/risks?page=1&limit=100').flush({ ...riskPage, items: [risk, { ...risk, id: 4 }], total: 2 });
    await settle();
    expect(text()).toContain('Riesgo registrado.');
    expect(fixture.nativeElement.querySelectorAll('.risk-item')).toHaveLength(2);
    expect(query<HTMLTextAreaElement>('#risk-description').value).toBe('');
  });

  it('lets the responsible process owner read the risks of their own process without registering', async () => {
    await start('/procesos/8/riesgos', { userId: 7, profiles: ['PROCESS_OWNER'] });
    http.expectOne('/api/processes/8').flush(process);
    await settle();
    http.expectOne('/api/processes/8/risks?page=1&limit=100').flush(riskPage);
    await settle();
    expect(text()).toContain('Retraso en la consolidación');
    expect(query('.process-editor')).toBeNull();
    http.expectNone('/api/risk-types');
    http.expectNone('/api/risk-levels');
  });

  it('does not request risks for Consulta or for an owner of another process', async () => {
    for (const session of [{ userId: 4, profiles: ['CONSULTATION'] }, { userId: 9, profiles: ['PROCESS_OWNER'] }]) {
      await start('/procesos/8/riesgos', session);
      http.expectOne('/api/processes/8').flush(process);
      await settle();
      http.expectNone('/api/processes/8/risks?page=1&limit=100');
      expect(text()).toContain('Los riesgos de este proceso no están disponibles para su perfil.');
      expect(query('.risk-list')).toBeNull();
      fixture.destroy();
    }
  });

  it('respects a server denial even when the interface would allow reading', async () => {
    await start('/procesos/8/riesgos', { userId: 7, profiles: ['PROCESS_OWNER'] });
    http.expectOne('/api/processes/8').flush(process);
    await settle();
    http.expectOne('/api/processes/8/risks?page=1&limit=100').flush({}, { status: 403, statusText: 'Forbidden' });
    await settle();
    expect(text()).toContain('Los riesgos de este proceso no están disponibles para su perfil.');
    expect(query('.risk-list')).toBeNull();
  });

  it('asks before leaving a risk with unregistered data', async () => {
    await start('/procesos/8/riesgos', { userId: 5, profiles: ['RISK_MANAGER'] });
    await flushManagerView();
    type('#risk-description', 'Borrador de riesgo');
    fixture.detectChanges();

    (control('Volver a la ficha') as HTMLAnchorElement).click();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    const dialog = query<HTMLDialogElement>('dialog');
    expect(dialog.textContent).toContain('El riesgo tiene datos sin registrar.');
    ([...dialog.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Seguir editando')!).click();
    await settle();
    expect(router.url).toBe('/procesos/8/riesgos');
  });

  it('shows the risks link in the ficha only to profiles that can read them', async () => {
    const cases: [ProcessOutletData, boolean][] = [
      [{ userId: 5, profiles: ['RISK_MANAGER'] }, true],
      [{ userId: 1, profiles: ['ADMIN'] }, true],
      [{ userId: 7, profiles: ['PROCESS_OWNER'] }, true],
      [{ userId: 9, profiles: ['PROCESS_OWNER'] }, false],
      [{ userId: 4, profiles: ['CONSULTATION'] }, false]
    ];
    for (const [session, visible] of cases) {
      await start('/procesos/8', session);
      http.expectOne('/api/processes/8').flush(process);
      await settle();
      http.expectOne('/api/processes?page=1&limit=100').flush({ items: [], total: 0, page: 1, limit: 100 });
      await settle();
      if (session.profiles.includes('ADMIN')) {
        http.expectOne('/api/users/process-owners').flush([]);
        await settle();
      }
      const link = control('Riesgos del proceso');
      expect(!!link).toBe(visible);
      if (link) expect(link.getAttribute('href')).toBe('/procesos/8/riesgos');
      fixture.destroy();
    }
  });
});
