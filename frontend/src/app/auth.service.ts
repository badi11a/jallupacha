import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

export type ProfileCode = 'ADMIN' | 'PROCESS_OWNER' | 'VALIDATOR' | 'RISK_MANAGER' | 'CONSULTATION';

export interface CurrentUser {
  userId: number;
  displayName: string;
  email: string;
  profiles: ProfileCode[];
}

export interface LoginResponse {
  authenticated: boolean;
  userId: number;
  displayName: string;
  email: string;
  profiles: ProfileCode[];
}

export const USER_STORAGE_KEY = 'jallupacha_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly currentUser = signal<CurrentUser | null>(this.readInitialUser());
  readonly logoutInProgress = signal(false);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly profiles = computed(() => this.currentUser()?.profiles ?? []);
  readonly isAdmin = computed(() => this.hasProfile('ADMIN'));
  readonly isProcessOwner = computed(() => this.hasProfile('PROCESS_OWNER'));
  readonly isValidator = computed(() => this.hasProfile('VALIDATOR'));
  readonly isRiskManager = computed(() => this.hasProfile('RISK_MANAGER'));
  readonly isConsultation = computed(() => this.hasProfile('CONSULTATION'));

  hasProfile(code: ProfileCode): boolean {
    return this.profiles().includes(code);
  }

  hasAnyProfile(...codes: ProfileCode[]): boolean {
    const userProfiles = this.profiles();
    return codes.some((code) => userProfiles.includes(code));
  }

  async login(email: string, password: string): Promise<CurrentUser> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>('/api/auth/login', { email, password }, { withCredentials: true })
    );
    const user: CurrentUser = {
      userId: response.userId,
      displayName: response.displayName,
      email: response.email,
      profiles: response.profiles
    };
    this.currentUser.set(user);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
    return user;
  }

  async logout(): Promise<void> {
    if (this.logoutInProgress()) return;
    this.logoutInProgress.set(true);
    try {
      await firstValueFrom(
        this.http.post<void>('/api/auth/logout', {}, { withCredentials: true })
      );
    } catch {
      // Ignore network errors during logout
    } finally {
      this.clearSession();
      try {
        await this.router.navigate(['/login']);
      } finally {
        this.logoutInProgress.set(false);
      }
    }
  }

  clearSession(): void {
    this.currentUser.set(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(USER_STORAGE_KEY);
    }
  }

  private readInitialUser(): CurrentUser | null {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      sessionStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }
  }
}
