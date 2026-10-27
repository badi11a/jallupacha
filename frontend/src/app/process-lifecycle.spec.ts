import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthService, ProfileCode } from './core/auth/auth.service';
import { ProcessApi, ProcessDetail } from './features/processes/process-api.service';
import { ProcessDetailComponent } from './features/processes/process-detail.component';
import { UiDialogService } from './shared/ui';

describe('Process Lifecycle & Validation (REQ-07, REQ-09, REQ-56)', () => {
  let mockApi: Partial<ProcessApi>;
  let mockAuth: any;
  let mockDialogs: Partial<UiDialogService>;

  const baseDetail: ProcessDetail = {
    id: 10,
    code: 'PR10',
    status: 'Borrador',
    name: 'Gestión de Procesos Demo',
    macroprocessId: 1,
    processTypeId: 2,
    parentProcessId: null,
    macroprocessType: 'Estratégicos',
    macroprocess: 'Gestión Estratégica',
    processType: 'Planificación',
    risks: [],
    units: [{ unitId: 100, name: 'Dirección de Planificación', isActive: true, role: 'RESPONSABLE', function: null }],
    parent: null,
    subprocesses: [],
    relations: { outgoing: [], incoming: [] },
    completeness: { complete: true, missing: [] },
    possibleDuplicates: [],
    versionNumber: 1,
    revision: 1,
    versions: [{ id: 101, versionNumber: 1, status: 'Borrador', revision: 1 }],
    elaborator: 'Dueño de proceso',
    responsible: 'Jefe de Unidad',
    alias: null,
    businessArea: null,
    subprocessType: null,
    criticality: null,
    automationLevel: null,
    periodicity: null,
    description: 'Descripción completa',
    objective: 'Objetivo institucional',
    scope: 'Alcance global',
    inputs: 'Entradas definidas',
    outputs: 'Salidas definidas',
    suppliers: null,
    clients: null,
    involvedParties: null,
    documents: null,
    systemsUsed: null,
    indicators: null,
    improvementOpportunities: null,
    startsWhen: 'Inicio formal',
    endsWhen: 'Término formal',
    developmentPlan: null,
    operation: null,
    design: null,
    validation: null,
    bpmnModelReference: null
  };

  beforeEach(() => {
    mockApi = {
      process: vi.fn(() => of({ ...baseDetail })),
      listProcesses: vi.fn(() => of([])),
      submitProcess: vi.fn(() => of({ id: 10, status: 'En revisión' })),
      approveProcess: vi.fn(() => of({ id: 10, status: 'Vigente' })),
      rejectProcess: vi.fn((_id, reason) => of({ id: 10, status: 'Borrador', reason })),
      newVersion: vi.fn(() => of({ id: 10, status: 'Borrador', versionNumber: 2 })),
      retireProcess: vi.fn(() => of({ id: 10, status: 'Obsoleto' }))
    };

    mockAuth = {
      hasAnyProfile: vi.fn((...profiles: ProfileCode[]) => profiles.includes('PROCESS_OWNER') || profiles.includes('ADMIN')),
      isAdmin: vi.fn(() => true),
      currentUser: vi.fn(() => ({ userId: 1, displayName: 'Admin User', email: 'admin@example.test', profiles: ['ADMIN'] }))
    };

    mockDialogs = {
      confirm: vi.fn(async () => true)
    };

    TestBed.configureTestingModule({
      imports: [ProcessDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ProcessApi, useValue: mockApi },
        { provide: AuthService, useValue: mockAuth },
        { provide: UiDialogService, useValue: mockDialogs }
      ]
    });
  });

  it('renders "Enviar a revisión" when process is in Borrador and complete', () => {
    const fixture = TestBed.createComponent(ProcessDetailComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Enviar a revisión');
    expect(compiled.textContent).toContain('Borrador');
  });

  it('submits process to review and reloads detail', async () => {
    const fixture = TestBed.createComponent(ProcessDetailComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    await comp.submitForReview(10);
    expect(mockDialogs.confirm).toHaveBeenCalled();
    expect(mockApi.submitProcess).toHaveBeenCalledWith(10);
    expect(comp.notice()).toContain('Proceso enviado a revisión');
  });

  it('displays validator actions when process is En revisión', () => {
    mockApi.process = vi.fn(() => of({ ...baseDetail, status: 'En revisión' }));
    mockAuth.hasAnyProfile = vi.fn((...profiles: ProfileCode[]) => profiles.includes('VALIDATOR'));

    const fixture = TestBed.createComponent(ProcessDetailComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Aprobar proceso');
    expect(compiled.textContent).toContain('Rechazar con observaciones');
    expect(compiled.textContent).toContain('En revisión técnica');
  });

  it('approves process and sets status to Vigente', async () => {
    mockApi.process = vi.fn(() => of({ ...baseDetail, status: 'En revisión' }));
    mockAuth.hasAnyProfile = vi.fn((...profiles: ProfileCode[]) => profiles.includes('VALIDATOR'));

    const fixture = TestBed.createComponent(ProcessDetailComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    await comp.approveProcess(10);
    expect(mockApi.approveProcess).toHaveBeenCalledWith(10);
    expect(comp.notice()).toContain('aprobado y publicado');
  });

  it('opens rejection form and rejects with observations', () => {
    mockApi.process = vi.fn(() => of({ ...baseDetail, status: 'En revisión' }));
    mockAuth.hasAnyProfile = vi.fn((...profiles: ProfileCode[]) => profiles.includes('VALIDATOR'));

    const fixture = TestBed.createComponent(ProcessDetailComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.startReject();
    expect(comp.rejecting()).toBe(true);

    comp.rejectionReason = 'Falta detallar entradas del sistema.';
    expect(comp.isDirty()).toBe(true);

    comp.submitReject(10);
    expect(mockApi.rejectProcess).toHaveBeenCalledWith(10, 'Falta detallar entradas del sistema.');
    expect(comp.rejecting()).toBe(false);
  });

  it('allows creating a new version when process is Vigente', async () => {
    mockApi.process = vi.fn(() => of({ ...baseDetail, status: 'Vigente', versionNumber: 1 }));

    const fixture = TestBed.createComponent(ProcessDetailComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    await comp.createNewVersion(10);
    expect(mockApi.newVersion).toHaveBeenCalledWith(10);
    expect(comp.notice()).toContain('Nueva versión 2 creada');
  });

  it('allows retiring process when process is Vigente and user is Admin', async () => {
    mockApi.process = vi.fn(() => of({ ...baseDetail, status: 'Vigente' }));

    const fixture = TestBed.createComponent(ProcessDetailComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    await comp.retireProcess(10);
    expect(mockApi.retireProcess).toHaveBeenCalledWith(10);
    expect(comp.notice()).toContain('formalmente retirado a estado Obsoleto');
  });

  it('does not render help buttons or micro-help in process detail', () => {
    const fixture = TestBed.createComponent(ProcessDetailComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.help-button')).toBeNull();
    expect(compiled.querySelector('.info-icon-btn')).toBeNull();
    expect((fixture.componentInstance as any).openHelp).toBeUndefined();
  });
});
