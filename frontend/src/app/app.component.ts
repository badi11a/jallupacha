import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, TitleStrategy } from '@angular/router';
import { ProcessOutletData } from './access';
import { PROFILE_LABELS } from './administration/profiles';
import { APP_NAME, HOME_URL } from './app.routes';
import { UiAppShellComponent, UiMessageComponent, UiNavigationFocus } from './shared/ui';

interface DemoIdentity {
  id: number;
  displayName: string;
}

interface CurrentUser {
  userId: number;
  displayName: string;
  email: string;
  profiles: string[];
}

/**
 * Estructura común autenticada (C-008): marca, cuenta, aviso, saludo y navegación.
 * Catálogos, perfiles y auditoría son pantallas propias bajo /administracion.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, RouterOutlet, UiAppShellComponent, UiMessageComponent],
  template: `
    <ui-app-shell appName="Sistema de Procesos Institucionales" brandMark="J" [homeHref]="homeUrl"
      footerText="Jallupacha · Gestión interna de procesos"
      [accountLabel]="user ? user.displayName + ' · ' + profileNames(user.profiles) : ''"
      [environmentNotice]="environment.demoMode && user ? 'Entorno local: acceso de prueba.' : ''"
      (logout)="logout()">
      @if (environment.demoMode && !user) {
        <section class="login-panel" aria-labelledby="login-title">
          <p class="eyebrow">ENTORNO LOCAL</p>
          <h1 id="login-title">Administración de procesos</h1>
          <p>Acceda con una identidad disponible para utilizar datos de prueba en el entorno local. Este acceso no sustituye la autenticación institucional.</p>
          @if (error) { <ui-message kind="error">{{ error }}</ui-message> }
          @if (identities.length) {
            <label for="identity">Usuario de prueba</label>
            <select id="identity" [(ngModel)]="selectedIdentityId">
              <option [ngValue]="null" disabled>Seleccione un usuario</option>
              @for (identity of identities; track identity.id) {
                <option [ngValue]="identity.id">{{ identity.displayName }}</option>
              }
            </select>
            <button class="primary-button" type="button" [disabled]="!selectedIdentityId || busy" (click)="login()">Ingresar</button>
          }
        </section>
      } @else if (!user) {
        <ui-message>El acceso institucional estará disponible cuando exista configuración autorizada.</ui-message>
      } @else {
        @if (error) { <ui-message kind="error">{{ error }}</ui-message> }
        @if (notice) { <ui-message kind="success">{{ notice }}</ui-message> }
        <section class="welcome">
          <p class="eyebrow">ADMINISTRACIÓN INTERNA</p>
          <h1>Hola, {{ user.displayName }}</h1>
          <p>Catálogos iniciales y perfiles para preparar la gestión de procesos.</p>
        </section>
        <nav class="app-nav" aria-label="Secciones">
          <a routerLink="/mapa" routerLinkActive="active" ariaCurrentWhenActive="page">Mapa de procesos</a>
          <a routerLink="/procesos" routerLinkActive="active" ariaCurrentWhenActive="page">Procesos</a>
          <a routerLink="/administracion/catalogos" routerLinkActive="active" ariaCurrentWhenActive="page">Catálogos</a>
          @if (isAdmin) {
            <a routerLink="/administracion/perfiles" routerLinkActive="active" ariaCurrentWhenActive="page">Perfiles</a>
            <a routerLink="/administracion/auditoria" routerLinkActive="active" ariaCurrentWhenActive="page">Auditoría</a>
          }
        </nav>
        <router-outlet [routerOutletData]="outletData(user)" />
      }
    </ui-app-shell>
  `
})
export class AppComponent implements OnInit {
  readonly environment = environment;
  readonly homeUrl = HOME_URL;
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly titleStrategy = inject(TitleStrategy);
  private readonly navigationFocus = inject(UiNavigationFocus);
  private sessionData: ProcessOutletData | null = null;
  identities: DemoIdentity[] = [];
  user: CurrentUser | null = null;
  selectedIdentityId: number | null = null;
  error = '';
  notice = '';
  busy = false;

  get isAdmin(): boolean {
    return this.user?.profiles.includes('ADMIN') ?? false;
  }

  async ngOnInit(): Promise<void> {
    try {
      this.user = await firstValueFrom(this.http.get<CurrentUser>('/api/auth/me'));
    } catch (error: unknown) {
      if (this.isUnauthorized(error)) this.title.setTitle(`Acceso · ${APP_NAME}`);
      if (this.isUnauthorized(error) && environment.demoMode) {
        try {
          this.identities = await firstValueFrom(this.http.get<DemoIdentity[]>('/api/auth/demo/identities'));
        } catch {
          this.error = 'No se pudo conectar con la API local. Verifique la configuración del backend y Oracle.';
        }
      } else if (!this.isUnauthorized(error)) {
        this.error = 'No se pudo cargar la información. Intente nuevamente.';
      }
    } finally {
      this.changeDetector.detectChanges();
    }
  }

  /** Datos de sesión para las pantallas; misma referencia mientras la sesión no cambie. */
  outletData(user: CurrentUser): ProcessOutletData {
    if (!this.sessionData || this.sessionData.userId !== user.userId || this.sessionData.profiles !== user.profiles) {
      this.sessionData = { userId: user.userId, profiles: user.profiles, refreshSession: () => this.refreshSession() };
    }
    return this.sessionData;
  }

  profileNames(profiles: string[]): string {
    return profiles.map((profile) => PROFILE_LABELS[profile] ?? profile).join(', ');
  }

  async login(): Promise<void> {
    if (!this.selectedIdentityId) return;
    await this.perform(async () => {
      await firstValueFrom(this.http.post('/api/auth/demo/session', { identityId: this.selectedIdentityId }));
      this.user = await firstValueFrom(this.http.get<CurrentUser>('/api/auth/me'));
      this.notice = 'Sesión iniciada.';
      // El botón «Ingresar» desaparece: título de la pantalla actual y foco en su encabezado (C-007).
      this.titleStrategy.updateTitle(this.router.routerState.snapshot);
      this.navigationFocus.focusContent();
    });
  }

  async logout(): Promise<void> {
    // Salir pasa por las guardas de ruta: protege los cambios sin guardar.
    // Navegar a la misma dirección se omite y resuelve false, por eso solo se navega si cambia.
    if (this.router.url !== HOME_URL && !(await this.router.navigateByUrl(HOME_URL))) return;
    await this.perform(async () => {
      await firstValueFrom(this.http.post('/api/auth/logout', {}));
      this.user = null;
      this.identities = environment.demoMode
        ? await firstValueFrom(this.http.get<DemoIdentity[]>('/api/auth/demo/identities'))
        : [];
      this.notice = '';
      this.title.setTitle(`Acceso · ${APP_NAME}`);
      this.navigationFocus.focusContent();
    });
  }

  /** Relee la sesión vigente para que la cuenta muestre los perfiles actuales. */
  private async refreshSession(): Promise<void> {
    this.user = await firstValueFrom(this.http.get<CurrentUser>('/api/auth/me'));
    this.changeDetector.detectChanges();
  }

  private async perform(action: () => Promise<void>): Promise<void> {
    this.busy = true;
    this.error = '';
    this.notice = '';
    try {
      await action();
    } catch (error: unknown) {
      this.error = error instanceof HttpErrorResponse && error.status === 403
        ? 'La acción no está autorizada para este perfil.'
        : error instanceof HttpErrorResponse && error.status === 409
          ? 'El cambio entra en conflicto con el estado actual.'
          : 'No fue posible completar la acción.';
    } finally {
      this.busy = false;
      this.changeDetector.detectChanges();
    }
  }

  private isUnauthorized(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 401;
  }
}
