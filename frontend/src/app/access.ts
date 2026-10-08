import { HttpErrorResponse } from '@angular/common/http';
import { UiBadgeTone } from './shared/ui';

/** Sesión entregada por `router-outlet` a las pantallas de procesos. */
export interface ProcessOutletData {
  userId: number;
  profiles: string[];
  /** Vuelve a leer la sesión vigente (p. ej. tras cambiar asignaciones de perfiles). */
  refreshSession?: () => Promise<void>;
}

export function isAdmin(session: ProcessOutletData): boolean {
  return session.profiles.includes('ADMIN');
}

/** Mensajes de las pantallas de administración (los mismos que antes de C-008). */
export function administrationErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 403) return 'La acción no está autorizada para este perfil.';
  if (error instanceof HttpErrorResponse && error.status === 409) return 'El cambio entra en conflicto con el estado actual.';
  return 'No fue posible completar la acción.';
}

// Estas comprobaciones solo deciden qué se muestra. El servidor autoriza cada
// solicitud con los perfiles vigentes (docs/release01_navegable.md, riesgos).
export function canReadRisks(session: ProcessOutletData, ownerUserId: number): boolean {
  const { profiles } = session;
  return profiles.includes('ADMIN') || profiles.includes('RISK_MANAGER') ||
    (profiles.includes('PROCESS_OWNER') && ownerUserId === session.userId);
}

export function canRegisterRisks(session: ProcessOutletData): boolean {
  return session.profiles.includes('RISK_MANAGER');
}

export function processStatusTone(status: string): UiBadgeTone {
  return status === 'Borrador' ? 'info' : 'neutral';
}

// Niveles iniciales de REQ-11. Los niveles agregados por el Administrador se
// muestran con su nombre y tono neutro: el texto siempre identifica el nivel.
const RISK_LEVEL_TONES: Record<string, UiBadgeTone> = {
  Bajo: 'success',
  Medio: 'warning',
  Alto: 'danger',
  Crítico: 'critical'
};

export function riskLevelTone(level: string): UiBadgeTone {
  return RISK_LEVEL_TONES[level] ?? 'neutral';
}

/** Orden de severidad para los niveles iniciales; los demás, por nombre. */
export function compareRiskLevels(a: string, b: string): number {
  const order = Object.keys(RISK_LEVEL_TONES);
  const rank = (name: string) => (order.includes(name) ? order.indexOf(name) : order.length);
  return rank(a) - rank(b) || a.localeCompare(b, 'es');
}
