import { Component, ElementRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UiDialogService, UiMessageComponent, focusFirstInvalid } from '../../shared/ui';
import { internalUrl } from '../platform';
import { LeavesWithConfirmation } from './unsaved-changes.guard';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, UiMessageComponent],
  templateUrl: './login.component.html'
})
export class LoginComponent implements LeavesWithConfirmation {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly dialogs = inject(UiDialogService);
  private completed = false;
  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  get email(): string { return this.form.controls.email.value; }
  set email(value: string) { this.form.controls.email.setValue(value); }
  get password(): string { return this.form.controls.password.value; }
  set password(value: string) { this.form.controls.password.setValue(value); }

  fieldError(field: 'email' | 'password'): string | null {
    const control = this.form.controls[field];
    if (!control.touched || !control.invalid) return null;
    return field === 'email' ? 'Ingrese un correo válido.' : 'Ingrese su contraseña.';
  }

  isDirty(): boolean { return !this.completed && Boolean(this.email || this.password); }
  async confirmLeave(): Promise<boolean> {
    if (this.submitting() && !this.completed) return false;
    return !this.isDirty() || this.dialogs.confirm({ title: 'Datos de acceso pendientes',
      message: 'Si sale, se borrarán los datos de acceso ingresados.',
      confirmLabel: 'Descartar datos', cancelLabel: 'Continuar', tone: 'danger' });
  }

  async onSubmit(): Promise<void> {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focusFirstInvalid(this.host.nativeElement);
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.form.disable();
    try {
      await this.auth.login(this.email.trim(), this.password);
      this.completed = true;
      this.password = '';
      const requested = internalUrl(this.router, this.route.snapshot.queryParamMap.get('returnUrl'));
      await this.router.navigateByUrl(requested && requested.split('?')[0] !== '/login' ? requested : '/mapa');
    } catch {
      this.errorMessage.set('Credenciales no válidas. Verifique sus datos o intente nuevamente.');
      this.password = '';
      this.form.controls.password.markAsUntouched();
    } finally {
      this.completed = false;
      this.form.enable();
      this.submitting.set(false);
    }
  }
}
