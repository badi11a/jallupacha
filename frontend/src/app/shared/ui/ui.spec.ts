import { ApplicationRef, Component, provideZoneChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  UiAppShellComponent,
  UiBadgeComponent,
  UiBreadcrumbsComponent,
  UiCharCounterComponent,
  UiSectionComponent,
  charCountState,
  countCharacters,
  UiDialogService,
  UiDialogValues,
  UiMessageComponent,
  UiPaginationComponent,
  UiPanelComponent,
  validateDialogFields
} from './index';

@Component({
  imports: [UiAppShellComponent, UiPanelComponent, UiMessageComponent, UiPaginationComponent],
  template: `
    <ui-app-shell appName="Aplicación" brandMark="A" footerText="Pie" [accountLabel]="account"
      [environmentNotice]="notice" (logout)="logouts = logouts + 1">
      <ui-panel eyebrow="SECCIÓN" heading="Listado" headingId="list-title">
        <button panelActions type="button">Acción</button>
        <ui-message kind="error">Falló</ui-message>
        <ui-message kind="success">Listo</ui-message>
        <ui-pagination [page]="page" [pageSize]="10" [total]="25" itemLabel="registros" (pageChange)="page = $event" />
      </ui-panel>
    </ui-app-shell>
  `
})
class HostComponent {
  account = 'Persona · Perfil';
  notice = 'Aviso';
  logouts = 0;
  page = 1;
}

@Component({
  imports: [UiBadgeComponent, UiBreadcrumbsComponent, UiSectionComponent, UiCharCounterComponent],
  template: `
    <ui-badge tone="info">Borrador</ui-badge>
    <ui-breadcrumbs [items]="[{ label: 'Inicio', link: '/inicio' }, { label: 'Actual' }]" />
    <ui-section heading="Datos"><p>Contenido</p></ui-section>
    <ui-char-counter [value]="text()" [max]="10" />
  `
})
class KitPartsComponent {
  readonly text = signal('abc');
}

function buttonByText(root: HTMLElement, text: string): HTMLButtonElement {
  return [...root.querySelectorAll('button')].find((button) => button.textContent?.trim() === text) as HTMLButtonElement;
}

describe('shared/ui', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent, KitPartsComponent],
      providers: [provideZoneChangeDetection(), provideRouter([])]
    });
  });

  it('renders the shell with one environment notice, account and logout', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.brand')?.getAttribute('aria-label')).toBe('Aplicación, inicio');
    expect(root.querySelectorAll('.environment-notice')).toHaveLength(1);
    expect(root.querySelector('.account')?.textContent).toContain('Persona · Perfil');
    buttonByText(root, 'Cerrar sesión').click();
    expect(fixture.componentInstance.logouts).toBe(1);
    expect(root.querySelector('footer')?.textContent).toContain('Pie');

    fixture.componentInstance.account = '';
    fixture.componentInstance.notice = '';
    fixture.detectChanges();
    expect(root.querySelector('.account')).toBeNull();
    expect(root.querySelector('.environment-notice')).toBeNull();
  });

  it('labels panels by their heading and projects actions', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('ui-panel') as HTMLElement;
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.getAttribute('aria-labelledby')).toBe('list-title');
    expect(panel.querySelector('#list-title')?.textContent).toBe('Listado');
    expect(panel.querySelector('.panel-actions')?.textContent).toContain('Acción');
  });

  it('announces errors as alerts and other messages as status', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const [error, success] = fixture.nativeElement.querySelectorAll('ui-message') as NodeListOf<HTMLElement>;
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.classList).toContain('error');
    expect(success.getAttribute('role')).toBe('status');
    expect(success.classList).toContain('success');
  });

  it('pages forward and backward within the total', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('ui-pagination')?.textContent).toContain('Página 1 · 25 registros');
    expect(buttonByText(root, 'Anterior').disabled).toBe(true);
    buttonByText(root, 'Siguiente').click();
    fixture.detectChanges();
    expect(buttonByText(root, 'Anterior').disabled).toBe(false);
    buttonByText(root, 'Siguiente').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.page).toBe(3);
    expect(buttonByText(root, 'Siguiente').disabled).toBe(true);
  });

  it('resolves a confirmation dialog with confirm or cancel', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const dialogs = TestBed.inject(UiDialogService);
    const root = fixture.nativeElement as HTMLElement;

    const accepted = dialogs.confirm({ title: 'Retirar', message: '¿Retirar «A»?', confirmLabel: 'Retirar', tone: 'danger' });
    fixture.detectChanges();
    const dialog = root.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.getAttribute('aria-labelledby')).toBe('ui-dialog-title');
    expect(dialog.textContent).toContain('¿Retirar «A»?');
    expect(buttonByText(root, 'Retirar').className).toBe('danger-button');
    buttonByText(root, 'Retirar').click();
    await expect(accepted).resolves.toBe(true);
    fixture.detectChanges();
    expect(root.querySelector('dialog')).toBeNull();

    const declined = dialogs.confirm({ title: 'Retirar', message: '¿Retirar «B»?' });
    fixture.detectChanges();
    buttonByText(root, 'Cancelar').click();
    await expect(declined).resolves.toBe(false);
  });

  it('validates form dialog fields before resolving trimmed values', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const dialogs = TestBed.inject(UiDialogService);
    const root = fixture.nativeElement as HTMLElement;
    let result: UiDialogValues | null | undefined;
    void dialogs.form({
      title: 'Editar',
      fields: [
        { key: 'name', label: 'Nombre', value: 'Actual', required: true, maxLength: 10 },
        { key: 'order', label: 'Orden', type: 'number', value: 2, required: true, min: 0, max: 9 }
      ]
    }).then((values) => (result = values));
    fixture.detectChanges();

    const name = root.querySelector('#ui-dialog-field-name') as HTMLInputElement;
    const order = root.querySelector('#ui-dialog-field-order') as HTMLInputElement;
    expect(name.value).toBe('Actual');
    expect(order.value).toBe('2');
    name.value = '   ';
    name.dispatchEvent(new Event('input'));
    order.value = '12';
    order.dispatchEvent(new Event('input'));
    buttonByText(root, 'Guardar').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(result).toBeUndefined();
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(root.querySelector('#ui-dialog-field-name-error')?.textContent).toContain('Complete este campo.');
    expect(root.querySelector('#ui-dialog-field-order-error')?.textContent).toContain('Ingrese un valor entre 0 y 9.');

    name.value = '  Nuevo  ';
    name.dispatchEvent(new Event('input'));
    order.value = '7';
    order.dispatchEvent(new Event('input'));
    buttonByText(root, 'Guardar').click();
    await fixture.whenStable();
    expect(result).toEqual({ name: 'Nuevo', order: 7 });
  });

  it('cancels the previous dialog when another opens', async () => {
    const dialogs = TestBed.inject(UiDialogService);
    const first = dialogs.confirm({ title: 'Uno', message: 'Primero' });
    void dialogs.confirm({ title: 'Dos', message: 'Segundo' });
    await expect(first).resolves.toBe(false);
  });

  it('counts characters with the server criterion', () => {
    expect(countCharacters('  hola  ')).toBe(4);
    expect(countCharacters('a😀b')).toBe(3);
    expect(countCharacters('❤️')).toBe(1);
    expect(countCharacters(null)).toBe(0);
    expect(charCountState(224, 250)).toBe('ok');
    expect(charCountState(225, 250)).toBe('near');
    expect(charCountState(251, 250)).toBe('over');
  });

  it('renders badges, breadcrumbs and sections accessibly', () => {
    const view = TestBed.createComponent(KitPartsComponent);
    view.detectChanges();
    const root = view.nativeElement as HTMLElement;
    expect(root.querySelector('ui-badge')?.className).toBe('badge badge-info');
    const nav = root.querySelector('nav.breadcrumbs') as HTMLElement;
    expect(nav.getAttribute('aria-label')).toBe('Ubicación');
    expect(nav.querySelector('a')?.getAttribute('href')).toBe('/inicio');
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe('Actual');
    const section = root.querySelector('ui-section') as HTMLElement;
    expect(section.getAttribute('role')).toBe('group');
    expect(section.querySelector(`#${section.getAttribute('aria-labelledby')}`)?.textContent).toBe('Datos');
    const counter = root.querySelector('ui-char-counter') as HTMLElement;
    expect(counter.hidden).toBe(true);
    view.componentInstance.text.set('x'.repeat(9));
    view.detectChanges();
    expect(counter.hidden).toBe(false);
    expect(counter.textContent?.trim()).toBe('9 / 10');
  });

  it('moves focus to the main content from the skip link without navigating (C-007 R1)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const before = location.href;
    const skip = fixture.nativeElement.querySelector('.skip-link') as HTMLAnchorElement;
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    skip.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('main-content');
    expect(location.href).toBe(before);
    fixture.destroy();
  });

  it('returns focus to the control that opened a dialog once it closes (C-007 R2)', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const opener = buttonByText(root, 'Acción');
    opener.focus();
    const dialogs = TestBed.inject(UiDialogService);

    const answer = dialogs.confirm({ title: 'Confirmar', message: '¿Continuar?' });
    fixture.detectChanges();
    expect(root.querySelector('dialog')?.contains(document.activeElement)).toBe(true);
    // Un <dialog> modal real impide enfocar fuera de él: cuando el foco vuelve ya no debe estar abierto.
    let dialogOpenOnFocus: boolean | null = null;
    opener.addEventListener('focus', () => (dialogOpenOnFocus = !!root.querySelector('dialog[open]')), { once: true });
    buttonByText(root, 'Cancelar').click();
    await answer;
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
    await fixture.whenStable();
    expect(root.querySelector('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(dialogOpenOnFocus).toBe(false);
    fixture.destroy();
  });

  it('rejects non-integer and overlong values', () => {
    const { errors } = validateDialogFields(
      [
        { key: 'n', label: 'N', type: 'number' },
        { key: 't', label: 'T', maxLength: 3 },
        { key: 'o', label: 'O' }
      ],
      { n: '1.5', t: 'abcd', o: '' }
    );
    expect(errors).toEqual({ n: 'Ingrese un número entero.', t: 'Use como máximo 3 caracteres.' });
  });
});
