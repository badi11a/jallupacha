import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProcessWorkspaceComponent } from './process-workspace.component';

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

describe('ProcessWorkspaceComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProcessWorkspaceComponent],
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

  it('shows the paginated list and complete read-only ficha to Consulta', async () => {
    const fixture = TestBed.createComponent(ProcessWorkspaceComponent);
    fixture.componentRef.setInput('userId', 9);
    fixture.componentRef.setInput('profiles', ['CONSULTATION']);
    fixture.detectChanges();
    http.expectOne('/api/processes?page=1&limit=20').flush({ ...emptyPage, items: [summary], total: 1 });
    http.expectOne('/api/macroprocesses').flush([]);
    http.expectOne('/api/process-types').flush([]);
    await settle(fixture);
    expect(fixture.componentInstance.processes).toEqual([summary]);

    let text = fixture.nativeElement.textContent as string;
    expect(text).toContain('PR8');
    expect(text).toContain('Proceso institucional');
    expect(text).not.toContain('Nuevo proceso');

    const openButton = [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent?.trim() === 'Ver ficha') as HTMLButtonElement;
    openButton.click();
    http.expectOne('/api/processes/8').flush(detail);
    await settle(fixture);
    http.expectOne('/api/processes?page=1&limit=100').flush({ ...emptyPage, items: [summary], total: 1, limit: 100 });
    await settle(fixture);

    text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Responsable actual · ID 7');
    expect(text).toContain('EstadoBorrador');
    expect(text).toContain('Modelo del proceso (BPMN)Sin información');
    expect(text).toContain('Unidades internasSin información');
    expect(text).not.toContain('Editar borrador');
    expect(text).not.toContain('Reasignar responsable');
    fixture.destroy();
  });

  it('lets a process owner start and save an incomplete draft without exposing workflow actions', async () => {
    const fixture = TestBed.createComponent(ProcessWorkspaceComponent);
    fixture.componentRef.setInput('userId', 7);
    fixture.componentRef.setInput('profiles', ['PROCESS_OWNER']);
    fixture.detectChanges();
    http.expectOne('/api/processes?page=1&limit=20').flush(emptyPage);
    http.expectOne('/api/macroprocesses').flush([{ id: 1, name: 'Estratégicos', isActive: 1 }]);
    http.expectOne('/api/process-types').flush([{ id: 2, name: 'Institucional', isActive: 1 }]);
    await settle(fixture);

    const createButton = [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent?.trim() === 'Nuevo proceso') as HTMLButtonElement;
    createButton.click();
    await settle(fixture);
    http.expectOne('/api/macroprocesses').flush([{ id: 1, name: 'Estratégicos', isActive: 1 }]);
    http.expectOne('/api/process-types').flush([{ id: 2, name: 'Institucional', isActive: 1 }]);
    http.expectOne('/api/processes?page=1&limit=100').flush(emptyPage);
    await settle(fixture);

    expect(fixture.nativeElement.textContent).toContain('Nuevo proceso');
    expect(fixture.nativeElement.textContent).toContain('se guardará en estado Borrador');
    expect(fixture.nativeElement.textContent).not.toMatch(/Enviar a revisión|Aprobar|Rechazar/i);
    expect(fixture.nativeElement.querySelector('#process-name')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#process-involvedParties')?.previousElementSibling?.textContent)
      .toContain('no nombres de personas');

    fixture.componentInstance.draft.macroprocessId = 1;
    fixture.componentInstance.draft.processTypeId = 2;
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('.process-editor') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const createRequest = http.expectOne('/api/processes');
    expect(createRequest.request.body).toMatchObject({
      macroprocessId: 1,
      processTypeId: 2,
      name: null,
      parentProcessId: null
    });
    createRequest.flush(detail);
    await settle(fixture);
    http.expectOne('/api/processes/8').flush(detail);
    await settle(fixture);
    http.expectOne('/api/processes?page=1&limit=20').flush(emptyPage);
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Borrador creado.');
    expect(fixture.nativeElement.textContent).not.toMatch(/Enviar a revisión|Aprobar|Rechazar/i);
    fixture.destroy();
  });

  it('lets the responsible process owner edit a draft and reload the saved ficha', async () => {
    const fixture = TestBed.createComponent(ProcessWorkspaceComponent);
    fixture.componentRef.setInput('userId', 7);
    fixture.componentRef.setInput('profiles', ['PROCESS_OWNER']);
    fixture.detectChanges();
    http.expectOne('/api/processes?page=1&limit=20').flush({ ...emptyPage, items: [summary], total: 1 });
    http.expectOne('/api/macroprocesses').flush([{ id: 1, name: 'Estratégicos', isActive: 1 }]);
    http.expectOne('/api/process-types').flush([{ id: 2, name: 'Institucional', isActive: 1 }]);
    await settle(fixture);

    [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent?.trim() === 'Ver ficha')!.click();
    http.expectOne('/api/processes/8').flush(detail);
    await settle(fixture);
    http.expectOne('/api/processes?page=1&limit=100').flush({ ...emptyPage, items: [summary], total: 1 });
    await settle(fixture);

    [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent?.trim() === 'Editar borrador')!.click();
    http.expectOne('/api/macroprocesses').flush([{ id: 1, name: 'Estratégicos', isActive: 1 }]);
    http.expectOne('/api/process-types').flush([{ id: 2, name: 'Institucional', isActive: 1 }]);
    http.expectOne('/api/processes?page=1&limit=100').flush({ ...emptyPage, items: [summary], total: 1 });
    await settle(fixture);

    fixture.componentInstance.draft['name'] = 'Proceso actualizado';
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.process-editor') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const update = http.expectOne('/api/processes/8');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toMatchObject({
      revision: 1,
      name: 'Proceso actualizado',
      macroprocessId: 1,
      processTypeId: 2
    });
    update.flush({ ...detail, revision: 2, name: 'Proceso actualizado' });
    await settle(fixture);
    http.expectOne('/api/processes/8').flush({ ...detail, revision: 2, name: 'Proceso actualizado' });
    await settle(fixture);
    http.expectOne('/api/processes?page=1&limit=20').flush({ ...emptyPage, items: [summary], total: 1 });
    await settle(fixture);

    expect(fixture.nativeElement.textContent).toContain('Borrador actualizado.');
    expect(fixture.nativeElement.textContent).toContain('Proceso actualizado');
    expect(fixture.componentInstance.selected?.revision).toBe(2);
    fixture.destroy();
  });

  it('lets an administrator reassign a draft and reload its current responsible user', async () => {
    const fixture = TestBed.createComponent(ProcessWorkspaceComponent);
    fixture.componentRef.setInput('userId', 1);
    fixture.componentRef.setInput('profiles', ['ADMIN']);
    fixture.detectChanges();
    http.expectOne('/api/processes?page=1&limit=20').flush({ ...emptyPage, items: [summary], total: 1 });
    http.expectOne('/api/macroprocesses').flush([]);
    http.expectOne('/api/process-types').flush([]);
    await settle(fixture);
    http.expectOne('/api/users/process-owners').flush([{ id: 9, displayName: 'Nueva responsable' }]);
    await settle(fixture);

    [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent?.trim() === 'Ver ficha')!.click();
    http.expectOne('/api/processes/8').flush(detail);
    await settle(fixture);
    http.expectOne('/api/processes?page=1&limit=100').flush({ ...emptyPage, items: [summary], total: 1 });
    await settle(fixture);

    [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent?.trim() === 'Reasignar responsable')!.click();
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Nueva responsable · ID 9');
    fixture.componentInstance.newOwnerId = 9;
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.process-editor') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const reassignment = http.expectOne('/api/processes/8/owner');
    expect(reassignment.request.method).toBe('PATCH');
    expect(reassignment.request.body).toEqual({ ownerUserId: 9, revision: 1 });
    reassignment.flush({ ...detail, ownerUserId: 9, ownerDisplayName: 'Nueva responsable' });
    await settle(fixture);
    http.expectOne('/api/processes/8').flush({
      ...detail,
      ownerUserId: 9,
      ownerDisplayName: 'Nueva responsable'
    });
    await settle(fixture);
    http.expectOne('/api/processes?page=1&limit=20').flush({
      ...emptyPage,
      items: [{ ...summary, ownerUserId: 9, ownerDisplayName: 'Nueva responsable' }],
      total: 1
    });
    await settle(fixture);

    expect(fixture.nativeElement.textContent).toContain('Responsable actualizado.');
    expect(fixture.nativeElement.textContent).toContain('Nueva responsable · ID 9');
    fixture.destroy();
  });
});

async function settle(fixture: ComponentFixture<ProcessWorkspaceComponent>): Promise<void> {
  await fixture.whenStable();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}
