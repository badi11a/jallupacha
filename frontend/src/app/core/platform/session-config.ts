import { InjectionToken } from '@angular/core';

export interface SessionIdentity {
  userId: number;
  displayName: string;
  email: string;
  profiles: string[];
}

export interface SessionConfig {
  apiPath: string;
  loginPath: string;
  homePath: string;
  loginEndpoint: string;
  logoutEndpoint: string;
  identityEndpoint: string;
  csrfCookieName: string;
  csrfHeaderName: string;
  requestTimeoutMs?: number;
}

export const SESSION_CONFIG = new InjectionToken<SessionConfig>('SESSION_CONFIG', {
  factory: () => ({ apiPath: '/api', loginPath: '/login', homePath: '/',
    loginEndpoint: '/api/auth/login', logoutEndpoint: '/api/auth/logout', identityEndpoint: '/api/auth/me',
    csrfCookieName: 'csrf', csrfHeaderName: 'X-CSRF-Token' })
});

export function parseSessionIdentity(value: unknown): SessionIdentity {
  if (!value || typeof value !== 'object') throw new Error('Invalid session identity');
  const user = value as Record<string, unknown>;
  if (!Number.isSafeInteger(user['userId']) || Number(user['userId']) < 1
    || typeof user['displayName'] !== 'string' || typeof user['email'] !== 'string'
    || !Array.isArray(user['profiles']) || user['profiles'].length === 0
    || !user['profiles'].every(profile => typeof profile === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(profile))) {
    throw new Error('Invalid session identity');
  }
  return { userId: Number(user['userId']), displayName: user['displayName'], email: user['email'], profiles: [...user['profiles']] };
}
