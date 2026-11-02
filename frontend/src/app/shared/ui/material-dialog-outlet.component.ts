import { Component, DestroyRef, ElementRef, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UiDialogField, UiDialogRequest, UiDialogService, UiDialogValues, nativeMaxLength, validateDialogFields } from './dialog.service';
import { UiMaterialInputDirective } from './material-input.directive';

/** Contenido Material de confirmación/captura; conserva valores y validación del kit. */
@Component({
  host: { class: 'ui-root ui-dialog-content' },
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, UiMaterialInputDirective],
  styles: ['.ui-dialog { padding: var(--ui-space-5); } form { display: grid; gap: var(--ui-space-4); } p { margin: 0; } .ui-dialog-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--ui-space-2); }'],
  template: `
    @if (request(); as current) {
      <div class="ui-dialog" aria-labelledby="ui-dialog-title"
        [attr.aria-describedby]="description() ? 'ui-dialog-description' : null"
>
        <form novalidate (submit)="submit($event)">
          <h2 id="ui-dialog-title">{{ current.options.title }}</h2>
          @if (description()) { <p id="ui-dialog-description">{{ description() }}</p> }
          @if (current.kind === 'form') {
            @for (field of current.options.fields; track field.key) {
              <div class="field">
                <label [for]="inputId(field)">{{ field.label }}</label>
                @if (field.hint) { <small [id]="inputId(field) + '-hint'">{{ field.hint }}</small> }
                <mat-form-field appearance="outline" subscriptSizing="dynamic"><input matInput [uiInvalid]="!!errors()[field.key]" [id]="inputId(field)" [name]="field.key"
                  [type]="field.type === 'number' ? 'number' : 'text'"
                  [attr.inputmode]="field.type === 'number' ? 'numeric' : null"
                  [attr.maxlength]="nativeMaxLength(field)"
                  [attr.min]="field.min ?? null" [attr.max]="field.max ?? null"
                  [attr.aria-required]="field.required ? 'true' : null"
                  [attr.aria-invalid]="errors()[field.key] ? 'true' : null"
                  [aria-describedby]="describedBy(field) ?? ''"
                  [value]="values()[field.key] ?? ''"
                  (input)="setValue(field.key, $event)"></mat-form-field>
                @if (errors()[field.key]) {
                  <p class="field-error" [id]="inputId(field) + '-error'">{{ errors()[field.key] }}</p>
                }
              </div>
            }
          }
          <div class="ui-dialog-actions">
            <button matButton="text" class="text-button" type="button" (click)="finish(null)">
              {{ current.options.cancelLabel ?? 'Cancelar' }}
            </button>
            <button matButton="filled" type="submit" [class]="danger() ? 'danger-button' : 'primary-button'">{{ submitLabel() }}</button>
          </div>
        </form>
      </div>
    }
  `
})
export class UiMaterialDialogComponent {
  protected readonly nativeMaxLength = nativeMaxLength;
  protected readonly request = signal(inject<UiDialogRequest>(MAT_DIALOG_DATA));
  private readonly ref = inject(MatDialogRef<UiMaterialDialogComponent>);
  private readonly dialog = inject<ElementRef<HTMLElement>>(ElementRef);

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

  protected finish(result: boolean | UiDialogValues | null): void { this.ref.close(result); }

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
    this.finish(null);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const current = this.request();
    if (!current) return;
    if (current.kind === 'confirm') {
      this.finish(true);
      return;
    }
    this.submitted.set(true);
    const result = this.validate();
    if (result) {
      this.finish(result);
      return;
    }
    const firstInvalid = current.options.fields.find((field) => this.errors()[field.key]);
    if (firstInvalid) this.dialog.nativeElement.querySelector<HTMLElement>(`#${this.inputId(firstInvalid)}`)?.focus();
  }

  private validate() {
    const current = this.request();
    if (current?.kind !== 'form') return null;
    const { values, errors } = validateDialogFields(current.options.fields, this.values());
    this.errors.set(errors);
    return Object.keys(errors).length ? null : values;
  }
}

/** One host, one request. Overlay variables come from the owning consumer. */
@Component({ selector: 'ui-material-dialog-outlet', imports: [MatDialogModule], template: '' })
export class UiMaterialDialogOutletComponent {
  private readonly dialogs = inject(UiDialogService);
  private readonly material = inject(MatDialog);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private ref?: MatDialogRef<UiMaterialDialogComponent>;
  private current: UiDialogRequest | null = null;
  constructor() {
    effect(() => {
      const request = this.dialogs.active();
      if (this.current === request) return;
      this.ref?.close();
      this.current = request;
      if (!request) return;
      const root = this.host.nativeElement.closest('.ui-root');
      const style = root?.ownerDocument.defaultView?.getComputedStyle(root);
      const ref = this.material.open(UiMaterialDialogComponent, {
        data: request, panelClass: ['ui-dialog-panel', 'ui-overlay-root'], width: '480px', maxWidth: 'calc(100vw - 2rem)',
        ariaLabelledBy: 'ui-dialog-title', ariaDescribedBy: request.kind === 'confirm' || request.options.description ? 'ui-dialog-description' : undefined,
        autoFocus: request.kind === 'confirm' ? 'button' : 'input', restoreFocus: false, delayFocusTrap: false,
        enterAnimationDuration: 0, exitAnimationDuration: 0, closeOnNavigation: false
      });
      // Scope the theme to this owned panel, preserving unrelated overlays in the host.
      const panel = ref.componentRef?.location.nativeElement.closest('.ui-dialog-panel') as HTMLElement | null;
      if (style && panel) for (const property of Array.from(style)) {
        if (property.startsWith('--ui-') || property.startsWith('--brand-')) panel.style.setProperty(property, style.getPropertyValue(property));
      }
      this.ref = ref;
      ref.afterClosed().subscribe(value => { if (this.dialogs.active() === request) this.dialogs.settle(value ?? null); });
    });
    inject(DestroyRef).onDestroy(() => { this.ref?.close(); if (this.dialogs.active() === this.current) this.dialogs.settle(null); });
  }
}
