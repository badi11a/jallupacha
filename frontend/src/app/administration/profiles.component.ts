import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, Signal, inject } from '@angular/core';
import { ROUTER_OUTLET_DATA } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProcessOutletData, administrationErrorMessage, isAdmin } from '../access';
import { UiMessageComponent, UiPanelComponent } from '../shared/ui';
import { PROFILE_CODES, PROFILE_LABELS } from './profiles';

interface AppUser {
  id: number;
  displayName: string;
  email: string;
  isActive: number;
  profiles: string;
}

/** Perfiles de usuario (C-008): solo Administrador; el servidor aplica las restricciones de REQ-26. */
@Component({
  selector: 'app-profiles',
  imports: [UiMessageComponent, UiPanelComponent],
  template: `
    <ui-panel class="admin-panel" eyebrow="ACCESO" heading="Perfiles de usuario" headingId="users-title">
      @if (error) { <ui-message kind="error">{{ error }}</ui-message> }
      @if (notice) { <ui-message kind="success">{{ notice }}</ui-message> }
      @if (admin) {
        <p class="helper">Las asignaciones se validan en el servidor. No se permite modificar el propio perfil ni retirar el último Administrador.</p>
        @if (loading) { <p class="helper" role="status">Cargando…</p> }
        @for (account of users; track account.id) {
          <div class="user-row">
            <div><strong>{{ account.displayName }}</strong><small>{{ account.email }} · ID {{ account.id }}</small></div>
            <fieldset>
              <legend class="visually-hidden">Perfiles para {{ account.displayName }}</legend>
              @for (profile of profileCodes; track profile) {
                <label class="check-label"><input type="checkbox" [checked]="hasProfile(account, profile)" [disabled]="account.id === userId || busy" (change)="toggleProfile(account, profile, $event)"> {{ profileLabels[profile] }}</label>
              }
            </fieldset>
          </div>
        }
      }
    </ui-panel>
  `
})
export class ProfilesComponent implements OnInit {
  readonly profileLabels = PROFILE_LABELS;
  readonly profileCodes = PROFILE_CODES;
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly session = inject(ROUTER_OUTLET_DATA) as Signal<ProcessOutletData>;
  private destroyed = false;
  users: AppUser[] = [];
  error = '';
  notice = '';
  busy = false;
  loading = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.destroyed = true));
  }

  get admin(): boolean {
    return isAdmin(this.session());
  }

  get userId(): number {
    return this.session().userId;
  }

  async ngOnInit(): Promise<void> {
    // Sin perfil Administrador no se solicita la lista: el servidor la rechazaría con 403.
    if (!this.admin) {
      this.error = 'La acción no está autorizada para este perfil.';
      return;
    }
    this.loading = true;
    await this.perform(() => this.loadUsers());
    this.loading = false;
    this.refresh();
  }

  hasProfile(user: AppUser, profile: string): boolean {
    return user.profiles.split(',').filter(Boolean).includes(profile);
  }

  async toggleProfile(user: AppUser, profile: string, event: Event): Promise<void> {
    const checkbox = event.target as HTMLInputElement;
    const next = new Set(user.profiles.split(',').filter(Boolean));
    if (checkbox.checked) next.add(profile);
    else next.delete(profile);
    await this.perform(async () => {
      await firstValueFrom(this.http.put(`/api/users/${user.id}/profiles`, { profiles: [...next] }));
      this.notice = 'Perfiles actualizados y auditados.';
      await this.loadUsers();
      await this.session().refreshSession?.();
    });
  }

  private async loadUsers(): Promise<void> {
    this.users = await firstValueFrom(this.http.get<AppUser[]>('/api/users'));
  }

  private async perform(action: () => Promise<void>): Promise<void> {
    this.busy = true;
    this.error = '';
    this.notice = '';
    try {
      await action();
    } catch (error: unknown) {
      this.error = administrationErrorMessage(error);
    } finally {
      this.busy = false;
      this.refresh();
    }
  }

  private refresh(): void {
    if (!this.destroyed) this.changeDetector.detectChanges();
  }
}
