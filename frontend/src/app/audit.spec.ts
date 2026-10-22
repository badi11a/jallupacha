import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuditComponent } from './audit.component';
import { AuditApiService, AuditResponse } from './audit.service';
import { AuthService } from './auth.service';

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
        provideRouter([]),
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

  it('filters by entity type and action', () => {
    const fixture = TestBed.createComponent(AuditComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.entityType = 'PROCESS';
    comp.action = 'PROCESS_APPROVED';
    comp.search();

    expect(mockAuditApi.list).toHaveBeenCalledWith(1, 25, 'PROCESS', 'PROCESS_APPROVED');
  });

  it('navigates between pages', () => {
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
    expect(comp.page()).toBe(2);
    expect(mockAuditApi.list).toHaveBeenCalledWith(2, 25, '', '');
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
