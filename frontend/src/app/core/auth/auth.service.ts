import { Injectable, computed } from '@angular/core';
import { CookieSession, SessionConfig, SessionIdentity, parseSessionIdentity } from '../platform';

export type ProfileCode = 'ADMIN' | 'PROCESS_OWNER' | 'VALIDATOR' | 'RISK_MANAGER' | 'CONSULTATION';
export interface CurrentUser extends SessionIdentity { profiles: ProfileCode[]; }
export interface LoginResponse extends CurrentUser { authenticated: boolean; }
/** Legacy cache key, removed on adapter initialization and never trusted. */
export const USER_STORAGE_KEY = 'jallupacha_user';
export const PRODUCT_SESSION_CONFIG: SessionConfig = {
  apiPath: '/api', loginPath: '/login', homePath: '/mapa',
  loginEndpoint: '/api/auth/login', logoutEndpoint: '/api/auth/logout', identityEndpoint: '/api/auth/me',
  csrfCookieName: 'jallupacha_csrf', csrfHeaderName: 'X-CSRF-Token'
};

@Injectable({ providedIn: 'root' })
export class AuthService extends CookieSession<CurrentUser> {
  readonly profiles = computed(() => this.currentUser()?.profiles ?? []);
  readonly isAdmin = computed(() => this.hasProfile('ADMIN'));
  readonly isProcessOwner = computed(() => this.hasProfile('PROCESS_OWNER'));
  readonly isValidator = computed(() => this.hasProfile('VALIDATOR'));
  readonly isRiskManager = computed(() => this.hasProfile('RISK_MANAGER'));
  readonly isConsultation = computed(() => this.hasProfile('CONSULTATION'));

  constructor() {
    super();
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(USER_STORAGE_KEY);
  }

  hasProfile(code: ProfileCode): boolean { return this.profiles().includes(code); }
  hasAnyProfile(...codes: ProfileCode[]): boolean { return codes.some(code => this.hasProfile(code)); }

  protected override parseIdentity(raw: unknown): CurrentUser {
    const user = parseSessionIdentity(raw);
    const allowed: string[] = ['ADMIN', 'PROCESS_OWNER', 'VALIDATOR', 'RISK_MANAGER', 'CONSULTATION'];
    if (!user.profiles.every(profile => allowed.includes(profile))) throw new Error('Invalid product profile');
    return { ...user, profiles: user.profiles as ProfileCode[] };
  }

  override clearSession(): void {
    super.clearSession();
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(USER_STORAGE_KEY);
  }
}
