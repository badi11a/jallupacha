import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UiMessageComponent } from './shared/ui';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, UiMessageComponent],
  template: `
    <section class="login-panel" aria-labelledby="login-title">
      <span class="eyebrow">Sistema de Procesos Institucionales</span>
      <h1 id="login-title">Acceso Institucional</h1>
      <p>Ingrese sus credenciales institucionales para acceder a la plataforma.</p>

      @if (errorMessage()) {
        <ui-message kind="error">{{ errorMessage() }}</ui-message>
      }

      <form (ngSubmit)="onSubmit()" #loginForm="ngForm" novalidate>
        <div class="field">
          <label for="login-email">Correo institucional</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autocomplete="username"
            required
            [(ngModel)]="email"
            [disabled]="submitting()"
            placeholder="usuario@entidad.gob.cl"
          />
        </div>

        <div class="field" style="margin-top: 0.8rem;">
          <label for="login-password">Contraseña</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            [(ngModel)]="password"
            [disabled]="submitting()"
            placeholder="••••••••"
          />
        </div>

        <div style="margin-top: 1.2rem;">
          <button
            type="submit"
            class="primary-button"
            [disabled]="submitting() || !email.trim() || !password"
          >
            {{ submitting() ? 'Iniciando sesión...' : 'Ingresar' }}
          </button>
        </div>
      </form>
    </section>
  `
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  async onSubmit(): Promise<void> {
    if (!this.email.trim() || !this.password || this.submitting()) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      await this.auth.login(this.email.trim(), this.password);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/mapa';
      await this.router.navigateByUrl(returnUrl);
    } catch (err: unknown) {
      const errorResponse = err as { error?: { message?: string } };
      const msg = errorResponse?.error?.message || 'Credenciales no válidas. Verifique sus datos o contacte a soporte.';
      this.errorMessage.set(msg);
      // R-04: Retain the entered email; only reset password on error
      this.password = '';
    } finally {
      this.submitting.set(false);
    }
  }
}
