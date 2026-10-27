import { ApplicationRef, Component, ElementRef, inject, provideZoneChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  UiBadgeComponent,
  UiBreadcrumbsComponent,
  UiCharCounterComponent,
  UiDialogHostComponent,
  UiSectionComponent,
  charCountState,
  countCharacters,
  UiDialogService,
  UiDialogValues,
  UiTextLengthMode,
  nativeMaxLength,
  UiMessageComponent,
  UiPaginationComponent,
  UiModuleNavComponent,
  UiModuleNavItem,
  UiPanelComponent,
  validateDialogFields
} from './index';

@Component({
  imports: [UiPanelComponent, UiMessageComponent, UiPaginationComponent, UiDialogHostComponent],
  template: `
    <a class="skip-link" href="#main-content" (click)="skipToContent($event)">Ir al contenido principal</a>
    <main id="main-content" tabindex="-1">
      <ui-panel eyebrow="SECCIÓN" heading="Listado" headingId="list-title">
        <button panelActions type="button">Acción</button>
        <ui-message kind="error">Falló</ui-message>
        <ui-message kind="success">Listo</ui-message>
        <ui-pagination [page]="page" [pageSize]="10" [total]="25" itemLabel="registros" (pageChange)="page = $event" />
      </ui-panel>
    </main>
    <ui-dialog-host />
  `
})
class HostComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  page = 1;

  skipToContent(event: Event): void {
    event.preventDefault();
    const main = this.host.nativeElement.querySelector<HTMLElement>('#main-content');
    main?.focus({ preventScroll: true });
    main?.scrollIntoView?.({ block: 'start' });
  }
}

@Component({
  imports: [UiBadgeComponent, UiBreadcrumbsComponent, UiSectionComponent, UiCharCounterComponent],
  template: `
    <ui-badge tone="info">Borrador</ui-badge>
    <ui-breadcrumbs [items]="[{ label: 'Inicio', link: '/inicio', queryParams: { q: 'registro' } }, { label: 'Actual' }]" />
    <ui-section heading="Datos"><p>Contenido</p></ui-section>
    <ui-char-counter [value]="text()" [max]="10" [lengthMode]="lengthMode()" />
  `
})
class KitPartsComponent {
  readonly text = signal('abc');
  readonly lengthMode = signal<UiTextLengthMode>('utf16');
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

  it('summarizes page counts, labels navigation and disables pending or boundary actions', () => {
    const fixture = TestBed.createComponent(UiPaginationComponent);
    for (const [key, value] of Object.entries({ page: 1, pageSize: 25, total: 0, summaryMode: 'pages', label: 'Páginas del registro' })) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.getAttribute('role')).toBe('navigation');
    expect(root.getAttribute('aria-label')).toBe('Páginas del registro');
    expect(root.textContent).toContain('Página 1 de 1');
    expect(buttonByText(root, 'Anterior').disabled).toBe(true);
    expect(buttonByText(root, 'Siguiente').disabled).toBe(true);
    fixture.componentRef.setInput('total', 61);
    fixture.detectChanges();
    expect(root.textContent).toContain('Página 1 de 3');
    expect(buttonByText(root, 'Siguiente').disabled).toBe(false);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect(buttonByText(root, 'Siguiente').disabled).toBe(true);
    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('page', 3);
    fixture.detectChanges();
    const emitted: number[] = [];
    fixture.componentInstance.pageChange.subscribe(page => emitted.push(page));
    buttonByText(root, 'Siguiente').click();
    expect(emitted).toEqual([]);
    buttonByText(root, 'Anterior').click();
    expect(emitted).toEqual([2]);
    fixture.destroy();
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
    fixture.detectChanges();
    expect(name.getAttribute('aria-invalid')).toBeNull();
    expect(order.getAttribute('aria-invalid')).toBe('true');
    expect(order.getAttribute('aria-describedby')).toContain('ui-dialog-field-order-error');
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

  it('counts normalized input with the declared server criterion', () => {
    expect(countCharacters('  hola  ')).toBe(4);
    expect(countCharacters('a😀b')).toBe(4);
    expect(countCharacters('❤️')).toBe(2);
    expect(countCharacters('a😀b', 'validator')).toBe(3);
    expect(countCharacters('❤️', 'validator')).toBe(1);
    expect(countCharacters(null)).toBe(0);
    expect(charCountState(224, 250)).toBe('ok');
    expect(charCountState(225, 250)).toBe('near');
    expect(charCountState(251, 250)).toBe('over');
  });

  it('keeps counter and dialog validation aligned at Unicode boundaries without normalizing values', () => {
    for (const mode of ['utf16', 'validator'] as const) {
      for (const raw of ['abc', '😀', '❤️', 'e\u0301', 'é', '👩‍💻', '  😀e\u0301  ', '', '   ']) {
        const length = countCharacters(raw, mode);
        const result = validateDialogFields([{ key: 'text', label: 'Texto', maxLength: length, lengthMode: mode }], { text: raw });
        expect(result.errors, `${mode}: ${raw}`).toEqual({});
        expect(result.values['text']).toBe(raw.trim() || null);
        if (length > 0) {
          const over = validateDialogFields([{ key: 'text', label: 'Texto', maxLength: length - 1, lengthMode: mode }], { text: raw });
          expect(over.errors['text'], `${mode}: ${raw}`).toBeTruthy();
        }
      }
    }
    expect(countCharacters('e\u0301')).toBe(2);
    expect(countCharacters('é')).toBe(1);
    expect(nativeMaxLength({ key: 'a', label: 'Texto', maxLength: 2 })).toBe(2);
    expect(nativeMaxLength({ key: 'b', label: 'Texto', maxLength: 2, lengthMode: 'validator' })).toBeNull();
    expect(nativeMaxLength({ key: 'n', label: 'Número', type: 'number', maxLength: 2 })).toBeNull();
  });

  it('renders the selected length criterion and validates modal emoji input with it', async () => {
    const parts = TestBed.createComponent(KitPartsComponent);
    parts.componentInstance.text.set('😀'.repeat(6));
    parts.detectChanges();
    const counter = parts.nativeElement.querySelector('ui-char-counter') as HTMLElement;
    expect(counter.textContent?.trim()).toBe('12 / 10');
    expect(counter.classList.contains('char-counter-over')).toBe(true);
    parts.componentInstance.lengthMode.set('validator');
    parts.componentInstance.text.set('😀'.repeat(9));
    parts.detectChanges();
    expect(counter.textContent?.trim()).toBe('9 / 10');
    expect(counter.classList.contains('char-counter-near')).toBe(true);
    parts.destroy();

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const dialogs = TestBed.inject(UiDialogService);
    const answer = dialogs.form({ title: 'Editar registro', fields: [
      { key: 'text', label: 'Texto', maxLength: 1, lengthMode: 'validator', required: true }
    ] });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const input = root.querySelector('dialog input') as HTMLInputElement;
    expect(input.hasAttribute('maxlength')).toBe(false);
    input.value = '😀😀';
    input.dispatchEvent(new Event('input'));
    buttonByText(root, 'Guardar').click();
    fixture.detectChanges();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(input);
    input.value = ' 😀 ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    buttonByText(root, 'Guardar').click();
    await expect(answer).resolves.toEqual({ text: '😀' });
    fixture.destroy();
  });

  it('renders badges, breadcrumbs and sections accessibly', () => {
    const view = TestBed.createComponent(KitPartsComponent);
    view.detectChanges();
    const root = view.nativeElement as HTMLElement;
    expect(root.querySelector('ui-badge')?.className).toBe('badge badge-info');
    const nav = root.querySelector('nav.breadcrumbs') as HTMLElement;
    expect(nav.getAttribute('aria-label')).toBe('Ubicación');
    expect(nav.querySelector('a')?.getAttribute('href')).toBe('/inicio?q=registro');
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
