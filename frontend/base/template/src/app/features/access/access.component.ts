import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AppSession } from '../../session';
import { LeavesWithConfirmation } from '../../core/platform';
import { UiDialogService, UiMessageComponent } from '../../shared/ui';

@Component({ imports: [ReactiveFormsModule, UiMessageComponent], template: `
  <h1>Acceso</h1>
  @if (error()) { <ui-message kind="error">{{ error() }}</ui-message> }
  @if (busy()) { <p role="status">Verificando acceso…</p> }
  <form class="ui-form" [formGroup]="form" (ngSubmit)="login()" [attr.aria-busy]="busy()" novalidate>
    <div class="field"><label for="access-email">Correo (obligatorio)</label>
      <input id="access-email" type="email" formControlName="email" required autocomplete="username"
        [attr.aria-invalid]="invalid('email') ? true : null" [attr.aria-describedby]="invalid('email') ? 'email-error' : null" />
      @if (invalid('email')) { <p id="email-error" class="field-error">Ingrese un correo válido.</p> }
    </div>
    <div class="field"><label for="access-password">Contraseña (obligatorio)</label>
      <input id="access-password" type="password" formControlName="password" required autocomplete="current-password"
        [attr.aria-invalid]="invalid('password') ? true : null" [attr.aria-describedby]="invalid('password') ? 'password-error' : null" />
      @if (invalid('password')) { <p id="password-error" class="field-error">Ingrese su contraseña.</p> }
    </div><button class="primary-button" type="submit" [disabled]="busy()">Ingresar</button>
  </form>` })
export class AccessComponent implements LeavesWithConfirmation {
  private readonly session = inject(AppSession);
  private readonly router = inject(Router);
  private readonly dialogs = inject(UiDialogService);
  private completed = false;
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });
  invalid(field: 'email' | 'password'): boolean { return this.form.controls[field].touched && this.form.controls[field].invalid; }
  isDirty(): boolean { return !this.completed && Boolean(this.form.controls.email.value || this.form.controls.password.value); }
  confirmLeave(): boolean | Promise<boolean> {
    if (this.busy() && !this.completed) return false;
    return !this.isDirty() || this.dialogs.confirm({ title: 'Datos de acceso pendientes', message: 'Si sale, se borrarán los datos ingresados.', confirmLabel: 'Descartar datos', cancelLabel: 'Continuar' });
  }
  async login(): Promise<void> {
    if (this.busy()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.busy.set(true); this.error.set(''); this.form.disable();
    try {
      const value = this.form.getRawValue(); await this.session.login(value.email.trim(), value.password);
      this.completed = true; this.form.controls.password.reset(); await this.router.navigateByUrl(this.session.config.homePath);
    } catch { this.form.controls.password.reset(); this.error.set('No fue posible iniciar sesión. Verifique sus datos o intente nuevamente.'); }
    finally { this.completed = false; this.form.enable(); this.busy.set(false); }
  }
}
