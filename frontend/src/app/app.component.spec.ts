import { provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppComponent],
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

  it('presents the local access screen with neutral user labels and names', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    http.expectOne('/api/auth/me').flush({ statusCode: 401 }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    http.expectOne('/api/auth/demo/identities').flush([
      { id: 1, displayName: 'Usuario administrador' },
      { id: 2, displayName: 'Usuario responsable' },
      { id: 3, displayName: 'Usuario de riesgos' },
      { id: 4, displayName: 'Usuario consulta' },
      { id: 5, displayName: 'Usuario responsable y de riesgos' }
    ]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.brand')?.textContent).toContain('Sistema de Procesos Institucionales');
    expect(fixture.nativeElement.querySelector('label[for="identity"]')?.textContent).toContain('Usuario de prueba');
    expect(fixture.nativeElement.querySelector('button.primary-button')?.textContent.trim()).toBe('Ingresar');
    expect(fixture.nativeElement.textContent).toContain('Usuario administrador');
    expect(fixture.nativeElement.textContent).toContain('Usuario consulta');
    expect(fixture.nativeElement.textContent).not.toMatch(/demo|fictici|simulad|prototipo/i);
    fixture.destroy();
  });

  it('keeps the admin dashboard labels neutral and shows one local-access notice', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.user = {
      userId: 1,
      displayName: 'Usuario administrador',
      email: 'admin@example.test',
      profiles: ['ADMIN']
    };
    fixture.componentInstance.macroprocesses = [
      { id: 1, code: 'MP1', name: 'Estratégicos', description: null, order: 1, isActive: 1 }
    ];
    fixture.componentInstance.processTypes = [{ id: 1, name: 'Institucional', isActive: 1 }];
    fixture.componentInstance.users = [
      { id: 1, displayName: 'Usuario administrador', email: 'admin@example.test', isActive: 1, profiles: 'ADMIN' },
      { id: 2, displayName: 'Usuario consulta', email: 'consultation@example.test', isActive: 1, profiles: 'CONSULTATION' }
    ];
    fixture.detectChanges();
    http.expectOne('/api/auth/me').flush({ statusCode: 401 }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    http.expectOne('/api/auth/demo/identities').flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Perfiles de usuario');
    expect(text).toContain('Macroprocesos');
    expect(text).toContain('Tipos de proceso');
    expect(text).toContain('Auditoría reciente');
    expect(text).toContain('admin@example.test');
    expect(text).toContain('consultation@example.test');
    expect(fixture.nativeElement.querySelectorAll('.environment-notice')).toHaveLength(1);
    expect(text).toContain('Entorno local: acceso de prueba.');
    expect(text).not.toMatch(/demo|fictici|simulad|prototipo/i);
    fixture.destroy();
  });

  it('does not show the administrator panels to a consultation user', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.componentInstance.user = {
      userId: 4,
      displayName: 'Usuario consulta',
      email: 'consultation@example.test',
      profiles: ['CONSULTATION']
    };
    fixture.detectChanges();
    http.expectOne('/api/auth/me').flush({ statusCode: 401 }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    http.expectOne('/api/auth/demo/identities').flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Macroprocesos');
    expect(text).toContain('Tipos de proceso');
    expect(text).not.toContain('Perfiles de usuario');
    expect(text).not.toContain('Auditoría reciente');
    expect(fixture.nativeElement.querySelectorAll('.environment-notice')).toHaveLength(1);
    expect(text).not.toMatch(/demo|fictici|simulad|prototipo/i);
    fixture.destroy();
  });
});
