import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuditComponent } from './features/audit/audit.component';
import { AuditApiService, AuditResponse } from './features/audit/audit.service';
import { AuthService } from './core/auth/auth.service';

describe('AuditComponent (REQ-27)', () => {
  let mockAuditApi: Partial<AuditApiService>;
  let mockAuth: any;

  const sampleAuditResponse: AuditResponse = {
    items: [
      {
        id: 1,
        createdAt: '2026-10-22T12:00:00Z',
        actorUserId: 10,
        actorDisplayName: 'Admin Principal',
        actorEmail: 'admin@entidad.gob',
        action: 'PROCESS_APPROVED',
        entityType: 'PROCESS',
        entityId: 'PR1',
        beforeValue: '{"status":"En revisión"}',
        afterValue: '{"status":"Vigente"}'
      },
      {
        id: 2,
        createdAt: '2026-10-22T11:00:00Z',
        actorUserId: null,
        actorDisplayName: null,
        actorEmail: null,
        action: 'SECURITY_EVENT',
        entityType: 'SYSTEM',
        entityId: 'SYS',
        beforeValue: null,
        afterValue: null
      }
    ],
    page: 1,
    limit: 25,
    total: 2
  };

  beforeEach(() => {
    mockAuditApi = {
      list: vi.fn(() => of({ ...sampleAuditResponse }))
    };

    mockAuth = {
      isAdmin: vi.fn(() => true),
      currentUser: vi.fn(() => ({ userId: 1, displayName: 'Admin User', email: 'admin@example.test', profiles: ['ADMIN'] }))
    };

    TestBed.configureTestingModule({
      imports: [AuditComponent],
      providers: [
        provideRouter([{ path: 'auditoria', component: AuditComponent }]),
        provideLocationMocks(),
        { provide: AuditApiService, useValue: mockAuditApi },
        { provide: AuthService, useValue: mockAuth }
      ]
    });
  });

  it('loads and lists audit entries on initialization', () => {
    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.items().length).toBe(2);
    expect(comp.total()).toBe(2);
    expect(comp.loading()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Admin Principal');
    expect(compiled.textContent).toContain('PROCESS_APPROVED');
    expect(compiled.textContent).toContain('Sistema / Proceso');
  });

  it('toggles detail expansion to show before and after values', () => {
    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.isExpanded(1)).toBe(false);

    comp.toggleDetail(1);
    expect(comp.isExpanded(1)).toBe(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Valores anteriores:');
    expect(compiled.textContent).toContain('Valores posteriores:');
    expect(compiled.textContent).toContain('En revisión');
    expect(compiled.textContent).toContain('Vigente');

    comp.toggleDetail(1);
    expect(comp.isExpanded(1)).toBe(false);
  });

  it('filters by entity type and action', async () => {
    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.entityType = 'PROCESS';
    comp.action = 'PROCESS_APPROVED';
    comp.search();
    await fixture.whenStable();

    expect(mockAuditApi.list).toHaveBeenCalledWith(1, 25, 'PROCESS', 'PROCESS_APPROVED');
  });

  it('navigates between pages', async () => {
    mockAuditApi.list = vi.fn(() => of({
      ...sampleAuditResponse,
      total: 60,
      limit: 25
    }));

    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.totalPages()).toBe(3);

    comp.goToPage(2);
    await fixture.whenStable();
    expect(comp.page()).toBe(2);
    expect(mockAuditApi.list).toHaveBeenCalledWith(2, 25, '', '');
  });

  it('C-050: pagina con el kit conservando filtros, extremos e historial', async () => {
    mockAuditApi.list = vi.fn(() => of({ ...sampleAuditResponse, total: 60 }));
    const router = TestBed.inject(Router);
    router.setUpLocationChangeListener();
    await router.navigateByUrl('/auditoria?entityType=PROCESS&action=PROCESS_APPROVED');
    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const pagination = () => root.querySelector('ui-pagination')!;
    const control = (text: string) => [...pagination().querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === text)!;
    expect(pagination().textContent).toContain('Página 1 de 3');
    expect(control('Anterior').disabled).toBe(true);
    control('Siguiente').click(); await fixture.whenStable(); fixture.detectChanges();
    expect(pagination().textContent).toContain('Página 2 de 3');
    expect(mockAuditApi.list).toHaveBeenLastCalledWith(2, 25, 'PROCESS', 'PROCESS_APPROVED');
    expect(router.url).toContain('entityType=PROCESS');
    expect(router.url).toContain('action=PROCESS_APPROVED');
    expect(router.url).toContain('page=2');
    control('Siguiente').click(); await fixture.whenStable(); fixture.detectChanges();
    expect(control('Siguiente').disabled).toBe(true);
    TestBed.inject(Location).back();
    await vi.waitFor(() => expect(router.url).toContain('page=2'));
    await fixture.whenStable(); fixture.detectChanges();
    expect(pagination().textContent).toContain('Página 2 de 3');
    fixture.destroy();
  });

  it('C-050: conserva la consulta al fallar una página y muestra una página vacía tras filtrar', async () => {
    mockAuditApi.list = vi.fn(() => of({ ...sampleAuditResponse, total: 60 }));
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/auditoria?entityType=PROCESS');
    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const next = root.querySelector('ui-pagination button:last-child') as HTMLButtonElement;
    vi.mocked(mockAuditApi.list!).mockReturnValueOnce(throwError(() => new Error('Fallo de prueba')));
    next.click(); await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('ui-pagination')).toBeNull();
    expect(router.url).toContain('entityType=PROCESS');
    expect(router.url).toContain('page=2');
    [...root.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'Reintentar consulta')!.click();
    await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('ui-pagination')?.textContent).toContain('Página 2 de 3');
    vi.mocked(mockAuditApi.list!).mockReturnValueOnce(of({ items: [], total: 0, page: 1, limit: 25 }));
    fixture.componentInstance.action = 'PROCESS_UPDATED';
    fixture.componentInstance.search(); await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('ui-pagination')?.textContent).toContain('Página 1 de 1');
    expect([...root.querySelectorAll<HTMLButtonElement>('ui-pagination button')].every(button => button.disabled)).toBe(true);
    expect(router.url).not.toContain('page=');
    expect(mockAuditApi.list).toHaveBeenLastCalledWith(1, 25, 'PROCESS', 'PROCESS_UPDATED');
    fixture.destroy();
  });

  it('handles API errors gracefully', () => {
    mockAuditApi.list = vi.fn(() => throwError(() => new Error('Error al conectar con la base de datos')));

    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.error()).toBe('No se pudo completar la operación.');
    expect(comp.loading()).toBe(false);
  });
});
