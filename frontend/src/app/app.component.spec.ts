import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { AuthService, CurrentUser } from './auth.service';

@Component({ standalone: true, template: '<p>Contenido ficticio</p>' })
class DummyViewComponent {}

describe('AppComponent — Navegación e identidad institucional', () => {
  let authMock: {
    isAuthenticated: () => boolean;
    isAdmin: () => boolean;
    profiles: () => string[];
    currentUser: () => CurrentUser | null;
    logout: () => Promise<void>;
  };

  beforeEach(() => {
    authMock = {
      isAuthenticated: () => false,
      isAdmin: () => false,
      profiles: () => [],
      currentUser: () => null,
      logout: vi.fn().mockResolvedValue(undefined)
    };

    return TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([{ path: 'mapa', component: DummyViewComponent }]),
        { provide: AuthService, useValue: authMock }
      ]
    });
  });

  it('no muestra la barra institucional cuando el usuario no está autenticado', () => {
    authMock.isAuthenticated = () => false;
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.app-header')).toBeNull();
    expect(root.querySelector('main')).not.toBeNull();
  });

  it('renderiza la cabecera institucional y navegación completa para perfil Administrador', () => {
    authMock.isAuthenticated = () => true;
    authMock.isAdmin = () => true;
    authMock.profiles = () => ['ADMIN'];
    authMock.currentUser = () => ({
      userId: 1,
      displayName: 'Administrador de Procesos',
      email: 'admin@example.test',
      profiles: ['ADMIN']
    });

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const header = root.querySelector('.app-header');
    expect(header).not.toBeNull();
    expect(header?.textContent).toContain('Gestión de Procesos');
    expect(header?.textContent).toContain('Administrador de Procesos');
    expect(header?.textContent).toContain('Administrador');

    const navLinks = [...header!.querySelectorAll('.nav-links a')].map(a => a.textContent?.trim());
    expect(navLinks).toEqual(['Mapa', 'Procesos', 'Usuarios', 'Auditoría', 'Unidades', 'Tipos de proceso']);

    const logoutBtn = header!.querySelector('.logout-btn') as HTMLButtonElement;
    expect(logoutBtn).not.toBeNull();
    expect(logoutBtn.textContent?.trim()).toBe('Cerrar sesión');
  });

  it('oculta módulos de administración para un usuario sin perfil ADMIN', () => {
    authMock.isAuthenticated = () => true;
    authMock.isAdmin = () => false;
    authMock.profiles = () => ['CONSULTATION'];
    authMock.currentUser = () => ({
      userId: 2,
      displayName: 'Usuario Consulta',
      email: 'consulta@example.test',
      profiles: ['CONSULTATION']
    });

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const header = root.querySelector('.app-header');
    expect(header).not.toBeNull();
    expect(header?.textContent).toContain('Usuario Consulta');
    expect(header?.textContent).toContain('Consulta');

    const navLinks = [...header!.querySelectorAll('.nav-links a')].map(a => a.textContent?.trim());
    expect(navLinks).toEqual(['Mapa', 'Procesos']);
    expect(navLinks).not.toContain('Usuarios');
    expect(navLinks).not.toContain('Auditoría');
  });

  it('ejecuta logout al presionar el botón de cerrar sesión', () => {
    authMock.isAuthenticated = () => true;
    authMock.isAdmin = () => true;
    authMock.profiles = () => ['ADMIN'];
    authMock.currentUser = () => ({
      userId: 1,
      displayName: 'Admin',
      email: 'admin@example.test',
      profiles: ['ADMIN']
    });

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const logoutBtn = fixture.nativeElement.querySelector('.logout-btn') as HTMLButtonElement;
    logoutBtn.click();
    expect(authMock.logout).toHaveBeenCalled();
  });
});
