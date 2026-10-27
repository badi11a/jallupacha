import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UiMaterialInputDirective } from '../../shared/ui';
import { Component, ElementRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LeavesWithConfirmation, PendingChanges } from '../../core/platform';
import { UiDialogService, UiMessageComponent, focusFirstInvalid } from '../../shared/ui';

@Component({ imports: [MatButtonModule, MatFormFieldModule, MatInputModule, UiMaterialInputDirective, ReactiveFormsModule, UiMessageComponent], template: `
  <h1>Ejemplo de formulario</h1>
  <p>Muestra de interacción sin persistencia. Los datos se conservan solo en esta pantalla.</p>
  @if (notice()) { <ui-message kind="success">{{ notice() }}</ui-message> }
  <form class="ui-form" [formGroup]="form" (ngSubmit)="save()" novalidate>
    <div class="field"><label for="example-name">Nombre (obligatorio)</label>
      <mat-form-field appearance="outline" subscriptSizing="dynamic"><input matInput [uiInvalid]="invalid() ? true : null" id="example-name" formControlName="name" required maxlength="120"
        [attr.aria-invalid]="invalid() ? true : null" [aria-describedby]="invalid() ? 'example-error' : ''" /></mat-form-field>
      @if (invalid()) { <p class="field-error" id="example-error">Ingrese un nombre de hasta 120 caracteres.</p> }
    </div>
    <div class="ui-form-actions"><button matButton="filled" type="submit" class="primary-button">Confirmar ejemplo</button>
      <button matButton="outlined" type="button" class="quiet-button" (click)="cancel()">Cancelar</button></div>
  </form>` })
export class ExampleComponent implements LeavesWithConfirmation {
  private readonly dialogs = inject(UiDialogService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly form = new FormGroup({ name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }) });
  readonly notice = signal('');
  private readonly changes = new PendingChanges(() => this.form.getRawValue());
  constructor() { this.changes.reset(); }
  invalid(): boolean { return this.form.controls.name.touched && this.form.controls.name.invalid; }
  isDirty(): boolean { return this.changes.isDirty(); }
  confirmLeave(): boolean | Promise<boolean> {
    return !this.isDirty() || this.dialogs.confirm({ title: 'Cambios no guardados', message: 'Si sale, se perderán los cambios de esta muestra.',
      confirmLabel: 'Descartar cambios', cancelLabel: 'Continuar editando', tone: 'danger' });
  }
  async cancel(): Promise<void> { if (await this.confirmLeave()) { this.form.reset(); this.changes.reset(); this.notice.set(''); } }
  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); focusFirstInvalid(this.host.nativeElement); return; }
    this.changes.reset(); this.notice.set('Datos del ejemplo confirmados en esta pantalla.');
  }
}
