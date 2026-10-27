import { Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService, ProfileCode } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/platform';
import {
  UiBadgeComponent,
  UiBadgeTone,
  UiBreadcrumbsComponent,
  UiDialogService,
  UiMessageComponent,
  UiPanelComponent,
  focusFirstInvalid
} from '../../shared/ui';
import { LeavesWithConfirmation } from '../../core/auth/unsaved-changes.guard';
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
  styleUrl: './users.component.css',
  templateUrl: './users.component.html'
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
