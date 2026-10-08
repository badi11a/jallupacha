import { Component, ElementRef, computed, effect, inject, linkedSignal, signal, viewChild } from '@angular/core';
import { UiDialogField, UiDialogService, validateDialogFields } from './dialog.service';

/** Presenta el diálogo activo de `UiDialogService` con un `<dialog>` modal nativo. */
@Component({
  selector: 'ui-dialog-host',
  template: `
    @if (request(); as current) {
      <dialog #dialog class="ui-dialog" aria-labelledby="ui-dialog-title"
        [attr.aria-describedby]="description() ? 'ui-dialog-description' : null"
        (cancel)="cancel($event)">
        <form novalidate (submit)="submit($event)">
          <h2 id="ui-dialog-title">{{ current.options.title }}</h2>
          @if (description()) { <p id="ui-dialog-description">{{ description() }}</p> }
          @if (current.kind === 'form') {
            @for (field of current.options.fields; track field.key) {
              <div class="field">
                <label [for]="inputId(field)">{{ field.label }}</label>
                @if (field.hint) { <small [id]="inputId(field) + '-hint'">{{ field.hint }}</small> }
                <input [id]="inputId(field)" [name]="field.key"
                  [type]="field.type === 'number' ? 'number' : 'text'"
                  [attr.inputmode]="field.type === 'number' ? 'numeric' : null"
                  [attr.maxlength]="field.maxLength ?? null"
                  [attr.min]="field.min ?? null" [attr.max]="field.max ?? null"
                  [attr.aria-required]="field.required ? 'true' : null"
                  [attr.aria-invalid]="errors()[field.key] ? 'true' : null"
                  [attr.aria-describedby]="describedBy(field)"
                  [value]="values()[field.key] ?? ''"
                  (input)="setValue(field.key, $event)">
                @if (errors()[field.key]) {
                  <p class="field-error" [id]="inputId(field) + '-error'">{{ errors()[field.key] }}</p>
                }
              </div>
            }
          }
          <div class="ui-dialog-actions">
            <button class="text-button" type="button" (click)="dialogs.settle(null)">
              {{ current.options.cancelLabel ?? 'Cancelar' }}
            </button>
            <button type="submit" [class]="danger() ? 'danger-button' : 'primary-button'">{{ submitLabel() }}</button>
          </div>
        </form>
      </dialog>
    }
  `
})
export class UiDialogHostComponent {
  protected readonly dialogs = inject(UiDialogService);
  protected readonly request = this.dialogs.active;
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly values = linkedSignal<Record<string, string>>(() => {
    const current = this.request();
    if (current?.kind !== 'form') return {};
    return Object.fromEntries(current.options.fields.map((field) => [field.key, field.value == null ? '' : String(field.value)]));
  });
  protected readonly errors = linkedSignal<Record<string, string>>(() => {
    this.request();
    return {};
  });
  protected readonly description = computed(() => {
    const current = this.request();
    if (!current) return '';
    return current.kind === 'confirm' ? current.options.message : current.options.description ?? '';
  });
  protected readonly danger = computed(() => {
    const current = this.request();
    return current?.kind === 'confirm' && current.options.tone === 'danger';
  });
  protected readonly submitLabel = computed(() => {
    const current = this.request();
    if (current?.kind === 'confirm') return current.options.confirmLabel ?? 'Confirmar';
    return current?.options.submitLabel ?? 'Guardar';
  });
  private readonly submitted = signal(false);

  constructor() {
    effect(() => {
      const element = this.dialog()?.nativeElement;
      if (!element || element.open) return;
      this.submitted.set(false);
      if (typeof element.showModal === 'function') {
        element.showModal();
      } else {
        // Entornos sin soporte de <dialog> (p. ej. jsdom): se muestra sin capa modal.
        element.setAttribute('open', '');
        element.querySelector<HTMLElement>('input, button')?.focus();
      }
    });
  }

  protected inputId(field: UiDialogField): string {
    return `ui-dialog-field-${field.key}`;
  }

  protected describedBy(field: UiDialogField): string | null {
    const ids = [
      field.hint ? `${this.inputId(field)}-hint` : '',
      this.errors()[field.key] ? `${this.inputId(field)}-error` : ''
    ].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  }

  protected setValue(key: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.values.update((current) => ({ ...current, [key]: value }));
    if (this.submitted()) this.validate();
  }

  protected cancel(event: Event): void {
    event.preventDefault();
    this.dialogs.settle(null);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const current = this.request();
    if (!current) return;
    if (current.kind === 'confirm') {
      this.dialogs.settle(true);
      return;
    }
    this.submitted.set(true);
    const result = this.validate();
    if (result) {
      this.dialogs.settle(result);
      return;
    }
    const firstInvalid = current.options.fields.find((field) => this.errors()[field.key]);
    if (firstInvalid) this.dialog()?.nativeElement.querySelector<HTMLElement>(`#${this.inputId(firstInvalid)}`)?.focus();
  }

  private validate() {
    const current = this.request();
    if (current?.kind !== 'form') return null;
    const { values, errors } = validateDialogFields(current.options.fields, this.values());
    this.errors.set(errors);
    return Object.keys(errors).length ? null : values;
  }
}
