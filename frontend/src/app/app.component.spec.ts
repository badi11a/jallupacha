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

  it('offers only server-provided demo identities when there is no session', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    http.expectOne('/api/auth/me').flush({ statusCode: 401 }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    http.expectOne('/api/auth/demo/identities').flush([{ id: 1, displayName: 'Administración Demo' }]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.identities).toEqual([{ id: 1, displayName: 'Administración Demo' }]);
    expect(fixture.componentInstance.environment.demoMode).toBe(true);
    expect(fixture.nativeElement.outerHTML).toContain('Administración Demo');
    expect(fixture.nativeElement.textContent).toContain('no es el inicio de sesión institucional');
  });
});
