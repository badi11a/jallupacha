import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ExampleComponent } from './features/example/example.component';
import { AppSession } from './session';
import { UiDialogService, UiPaginationComponent } from './shared/ui';

describe('Consumidor neutral de la base', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }));
  it('salida limpia inmediata, descarte cancelado conserva valores, confirmar reinicia el ámbito', async () => {
    const fixture = TestBed.createComponent(ExampleComponent); fixture.detectChanges();
    const page = fixture.componentInstance, dialogs = TestBed.inject(UiDialogService);
    expect(page.confirmLeave()).toBe(true); expect(dialogs.active()).toBeNull();
    page.form.controls.name.setValue('Registro de prueba'); const first = page.cancel(); dialogs.settle(false); await first;
    expect(page.form.controls.name.value).toBe('Registro de prueba'); expect(page.isDirty()).toBe(true);
    const second = page.cancel(); dialogs.settle(true); await second; expect(page.isDirty()).toBe(false);
    fixture.destroy();
  });
  it('validación tipada y confirmación conservan valor sin fingir persistencia', () => {
    const fixture = TestBed.createComponent(ExampleComponent); const page = fixture.componentInstance;
    page.save(); expect(page.form.invalid).toBe(true); expect(page.notice()).toBe('');
    page.form.controls.name.setValue('Registro de prueba'); page.save();
    expect(page.isDirty()).toBe(false); expect(page.notice()).toContain('en esta pantalla'); fixture.destroy();
  });
  it('una sesión no válida no habilita identidad del consumidor', async () => {
    const session = TestBed.inject(AppSession), http = TestBed.inject(HttpTestingController);
    const ready = session.initialize(); http.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    await ready; expect(session.isAuthenticated()).toBe(false); http.verify();
  });
  it('consume los modos de paginación conservando el resumen predeterminado', () => {
    const fixture = TestBed.createComponent(UiPaginationComponent);
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('total', 25);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Página 2 · 25 elementos');
    fixture.componentRef.setInput('summaryMode', 'pages'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Página 2 de 3');
    expect(fixture.nativeElement.getAttribute('role')).toBe('navigation');
    fixture.destroy();
  });
});
