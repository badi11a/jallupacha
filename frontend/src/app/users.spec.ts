import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthService, ProfileCode } from './auth.service';
import { UiDialogService } from './shared/ui';
import { UsersComponent } from './users.component';
import { UsersService } from './users.service';

describe('UsersComponent (REQ-26)', () => {
  let mockUsersService: Partial<UsersService>;
  let mockAuthService: any;
  let mockDialogService: Partial<UiDialogService>;

  const sampleUsers = [
    { id: 1, displayName: 'Admin User', email: 'admin@example.test', isActive: 1, profiles: 'ADMIN,VALIDATOR' },
    { id: 2, displayName: 'Operator User', email: 'operator@example.test', isActive: 1, profiles: 'PROCESS_OWNER' }
  ];

  beforeEach(() => {
    mockUsersService = {
      list: vi.fn(() => of(sampleUsers)),
      updateProfiles: vi.fn((_id: number, profiles: ProfileCode[]) => of({ userId: 2, profiles }))
    };

    mockAuthService = {
      currentUser: vi.fn(() => ({ userId: 1, displayName: 'Admin User', email: 'admin@example.test', profiles: ['ADMIN' as ProfileCode] })),
      isAdmin: vi.fn(() => true)
    };

    mockDialogService = {
      confirm: vi.fn(async () => true)
    };

    TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        provideRouter([]),
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UiDialogService, useValue: mockDialogService }
      ]
    });
  });

  it('loads and lists active users on initialization', () => {
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.users().length).toBe(2);
    expect(comp.loading()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Admin User');
    expect(compiled.textContent).toContain('Operator User');
  });

  it('identifies self user and does not allow self profile editing', () => {
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.isSelf(1)).toBe(true);
    expect(comp.isSelf(2)).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('(Usuario actual)');
  });

  it('opens profile editor for another user with current profiles pre-selected', async () => {
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    await comp.startEdit(sampleUsers[1]);
    fixture.detectChanges();

    expect(comp.editingUser()?.id).toBe(2);
    expect(comp.selectedProfiles()).toEqual(['PROCESS_OWNER']);
    expect(comp.isDirty()).toBe(false);

    // Toggle VALIDATOR on
    comp.toggleProfile('VALIDATOR');
    expect(comp.selectedProfiles()).toContain('VALIDATOR');
    expect(comp.isDirty()).toBe(true);
  });

  it('saves updated profiles and shows success notice', async () => {
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    await comp.startEdit(sampleUsers[1]);
    comp.toggleProfile('VALIDATOR');

    comp.saveProfiles();
    expect(mockUsersService.updateProfiles).toHaveBeenCalledWith(2, ['PROCESS_OWNER', 'VALIDATOR']);
    expect(comp.notice()).toContain('Perfiles actualizados');
    expect(comp.editingUser()).toBeNull();
  });

  it('shows error if attempting to remove all profiles', async () => {
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    await comp.startEdit(sampleUsers[1]);
    comp.toggleProfile('PROCESS_OWNER'); // remove only profile
    expect(comp.selectedProfiles().length).toBe(0);

    comp.saveProfiles();
    expect(mockUsersService.updateProfiles).not.toHaveBeenCalled();
    expect(comp.error()).toContain('El usuario debe conservar al menos un perfil asignado');
  });

  it('handles backend conflict or forbidden errors properly', async () => {
    mockUsersService.updateProfiles = vi.fn(() => throwError(() => new HttpErrorResponse({
      status: 409,
      error: { message: 'No se puede quitar el último perfil Administrador' }
    })));

    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    await comp.startEdit(sampleUsers[1]);
    comp.saveProfiles();

    expect(comp.error()).toBe('No se puede quitar el último perfil Administrador');
  });

  it('confirmLeave handles dirty state correctly', async () => {
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    // Clean state
    expect(await comp.confirmLeave()).toBe(true);
    expect(mockDialogService.confirm).not.toHaveBeenCalled();

    // Dirty state
    await comp.startEdit(sampleUsers[1]);
    comp.toggleProfile('ADMIN');
    expect(comp.isDirty()).toBe(true);

    const leave = await comp.confirmLeave();
    expect(leave).toBe(true);
    expect(mockDialogService.confirm).toHaveBeenCalled();
  });
});
