import { Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService, ProfileCode } from './auth.service';
import { errorMessage } from './mvp-v14-api.service';
import {
  UiBadgeComponent,
  UiBadgeTone,
  UiBreadcrumbsComponent,
  UiDialogService,
  UiMessageComponent,
  UiPanelComponent,
  focusFirstInvalid
} from './shared/ui';
import { LeavesWithConfirmation } from './unsaved-changes.guard';
import { SYSTEM_PROFILES, UserItem, UsersService } from './users.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    FormsModule,

    UiBadgeComponent,
    UiBreadcrumbsComponent,
    UiMessageComponent,
    UiPanelComponent
  ],
  styles: [`
    .profile-editor {
      border: 1px solid var(--ui-color-border);
      border-radius: var(--ui-radius-lg);
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      background: var(--ui-color-surface-subtle, #f9fafb);
    }
    .profile-editor h2 {
      margin: 0 0 .5rem 0;
      font-size: 1.1rem;
    }
    .profile-checkboxes {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
      gap: .75rem;
      margin: 1rem 0;
    }
    .profile-card {
      display: flex;
      align-items: flex-start;
      gap: .6rem;
      padding: .6rem .8rem;
      background: #fff;
      border: 1px solid var(--ui-color-border);
      border-radius: var(--ui-radius-md, 6px);
      cursor: pointer;
    }
    .profile-card input[type="checkbox"] {
      margin-top: .2rem;
      width: 1.15rem;
      height: 1.15rem;
      cursor: pointer;
    }
    .profile-info strong {
      display: block;
      font-size: .95rem;
    }
    .profile-info p {
      margin: .2rem 0 0 0;
      font-size: .85rem;
      color: var(--ui-color-text-muted, #4b5563);
    }
    .editor-actions {
      display: flex;
      gap: .75rem;
      align-items: center;
      margin-top: 1rem;
    }
    .badges-list {
      display: flex;
      flex-wrap: wrap;
      gap: .35rem;
    }
    .self-tag {
      font-size: .8rem;
      color: var(--ui-color-text-muted, #6b7280);
      font-style: italic;
    }
  `],
  template: `
    <ui-breadcrumbs [items]="[{ label: 'Usuarios y perfiles' }]" />
    <ui-panel headingId="users-title" eyebrow="ADMINISTRACIÓN" heading="Gestión de usuarios y perfiles">

      @if (error()) { <ui-message kind="error">{{ error() }}</ui-message> }
      @if (notice()) { <ui-message kind="success">{{ notice() }}</ui-message> }
      @if (saving()) { <p class="helper" role="status">Guardando perfiles…</p> }

      @if (editingUser(); as target) {
        <section class="profile-editor" aria-labelledby="editor-title">
          <h2 id="editor-title">Asignar perfiles: {{ target.displayName }} ({{ target.email }})</h2>
          <p class="helper">Seleccione los perfiles institucionales correspondientes a este usuario.</p>
          <fieldset class="profile-checkboxes" tabindex="-1" [disabled]="saving()" [attr.aria-busy]="saving()" [attr.aria-invalid]="profileError() ? true : null" [attr.aria-describedby]="profileError() ? 'profile-error' : null">
            <legend class="visually-hidden">Perfiles institucionales</legend>
            @for (prof of availableProfiles; track prof.code) {
              <label class="profile-card">
                <input
                  type="checkbox"
                  [checked]="isSelected(prof.code)"
                  (change)="toggleProfile(prof.code)"
                />
                <div class="profile-info">
                  <strong>{{ prof.name }}</strong>
                  <p>{{ prof.description }}</p>
                </div>
              </label>
            }
          </fieldset>
          @if (profileError()) { <p id="profile-error" class="field-error" role="alert">{{ profileError() }}</p> }
          <div class="editor-actions">
            <button class="primary-button" type="button" [disabled]="saving()" (click)="saveProfiles()">
              {{ saving() ? 'Guardando…' : 'Guardar perfiles' }}
            </button>
            <button class="quiet-button" type="button" [disabled]="saving()" (click)="cancelEdit()">
              Cancelar
            </button>
          </div>
        </section>
      }

      @if (loading()) {
        <p class="helper" role="status">Cargando usuarios…</p>
      } @else if (loadFailed()) { <button type="button" class="quiet-button" (click)="loadUsers()">Reintentar carga de usuarios</button> }
      @else {
        <div class="table-scroll" tabindex="0" role="region" aria-label="Usuarios y perfiles">
          <table>
            <caption class="visually-hidden">Listado de usuarios institucionales y sus perfiles</caption>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Nombre</th>
                <th scope="col">Correo institucional</th>
                <th scope="col">Perfiles asignados</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr>
                  <td>{{ user.id }}</td>
                  <td><strong>{{ user.displayName }}</strong></td>
                  <td>{{ user.email }}</td>
                  <td>
                    <div class="badges-list">
                      @for (code of parseProfiles(user.profiles); track code) {
                        <ui-badge [tone]="getProfileTone(code)">{{ getProfileName(code) }}</ui-badge>
                      } @empty {
                        <span class="helper">Sin perfiles</span>
                      }
                    </div>
                  </td>
                  <td>
                    @if (isSelf(user.id)) {
                      <span class="self-tag">(Usuario actual)</span>
                    } @else {
                      <button
                        type="button"
                        class="text-button"
                        [disabled]="saving() || editingUser()?.id === user.id"
                        (click)="startEdit(user)"
                      >
                        Modificar perfiles
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5">No se encontraron usuarios activos en el sistema.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </ui-panel>
  `
})
export class UsersComponent implements OnInit, LeavesWithConfirmation {
  private readonly usersService = inject(UsersService);
  private readonly dialog = inject(UiDialogService);
  readonly auth = inject(AuthService);

  readonly availableProfiles = SYSTEM_PROFILES;
  readonly users = signal<UserItem[]>([]);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly profileError = signal('');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  readonly editingUser = signal<UserItem | null>(null);
  readonly selectedProfiles = signal<ProfileCode[]>([]);
  private originalProfiles: ProfileCode[] = [];

  ngOnInit(): void {
    this.loadUsers();
  }

  isDirty(): boolean {
    if (!this.editingUser()) return false;
    const current = [...this.selectedProfiles()].sort().join(',');
    const orig = [...this.originalProfiles].sort().join(',');
    return current !== orig;
  }

  async confirmLeave(): Promise<boolean> {
    if (this.saving()) return false;
    if (!this.isDirty()) return true;
    return await this.dialog.confirm({
      title: 'Cambios no guardados',
      message: 'Tiene modificaciones de perfiles sin guardar. Si sale ahora, se perderán los cambios.',
      confirmLabel: 'Descartar cambios',
      cancelLabel: 'Continuar editando',
      tone: 'danger'
    });
  }

  loadUsers(): void {
    this.loadFailed.set(false);
    this.loading.set(true);
    this.error.set(null);
    this.usersService.list().subscribe({
      next: (list) => {
        this.users.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loadFailed.set(true);
        this.loading.set(false);
      }
    });
  }

  isSelf(userId: number): boolean {
    return this.auth.currentUser()?.userId === userId;
  }

  parseProfiles(profilesStr: string | null): ProfileCode[] {
    if (!profilesStr) return [];
    return profilesStr.split(',').map((p) => p.trim()) as ProfileCode[];
  }

  getProfileName(code: ProfileCode): string {
    const found = SYSTEM_PROFILES.find((p) => p.code === code);
    return found ? found.name : code;
  }

  getProfileTone(code: ProfileCode): UiBadgeTone {
    switch (code) {
      case 'ADMIN': return 'warning';
      case 'PROCESS_OWNER': return 'info';
      case 'VALIDATOR': return 'success';
      case 'RISK_MANAGER': return 'info';
      default: return 'neutral';
    }
  }

  async startEdit(user: UserItem): Promise<void> {
    if (this.saving() || this.isSelf(user.id) || this.editingUser()?.id === user.id) return;
    if (this.isDirty()) {
      const ok = await this.dialog.confirm({
        title: 'Descartar cambios',
        message: 'Tiene modificaciones sin guardar en el usuario actual. ¿Desea descartarlas?',
        confirmLabel: 'Descartar y continuar',
        cancelLabel: 'Volver a la edición',
        tone: 'danger'
      });
      if (!ok) return;
    }
    this.doStartEdit(user);
  }

  private doStartEdit(user: UserItem): void {
    this.profileError.set('');
    this.editingUser.set(user);
    const parsed = this.parseProfiles(user.profiles);
    this.selectedProfiles.set([...parsed]);
    this.originalProfiles = [...parsed];
    this.error.set(null);
    this.notice.set(null);
  }

  isSelected(code: ProfileCode): boolean {
    return this.selectedProfiles().includes(code);
  }

  toggleProfile(code: ProfileCode): void {
    this.profileError.set('');
    if (this.saving()) return;
    const list = this.selectedProfiles();
    if (list.includes(code)) {
      this.selectedProfiles.set(list.filter((c) => c !== code));
    } else {
      this.selectedProfiles.set([...list, code]);
    }
  }

  saveProfiles(): void {
    if (this.saving()) return;
    const target = this.editingUser();
    if (!target) return;

    if (this.selectedProfiles().length === 0) {
      this.profileError.set('El usuario debe conservar al menos un perfil asignado.');
      focusFirstInvalid(this.element.nativeElement);
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);

    this.usersService.updateProfiles(target.id, this.selectedProfiles()).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.notice.set(`Perfiles actualizados correctamente para ${target.displayName}.`);
        this.editingUser.set(null);
        this.selectedProfiles.set([]);
        this.originalProfiles = [];
        this.loadUsers();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(errorMessage(err));
      }
    });
  }

  async cancelEdit(): Promise<void> {
    if (this.saving()) return;
    if (this.isDirty()) {
      const confirmed = await this.dialog.confirm({
        title: 'Descartar cambios',
        message: '¿Está seguro de que desea descartar las modificaciones en los perfiles?',
        confirmLabel: 'Descartar cambios',
        cancelLabel: 'Continuar editando',
        tone: 'danger'
      });
      if (!confirmed) return;
    }
    this.editingUser.set(null);
    this.selectedProfiles.set([]);
    this.originalProfiles = [];
  }
}
