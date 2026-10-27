import { HttpErrorResponse } from '@angular/common/http';

export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401) return 'Su sesión ha expirado o no es válida. Inicie sesión nuevamente.';
    if (error.status === 403) return 'No tiene permisos suficientes para acceder a este recurso.';
    if (error.status === 0) return 'No hay conexión con el servidor.';
    if ([400, 409, 422].includes(error.status)) {
      const message = (error.error as { message?: unknown } | null)?.message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message) && message.every(item => typeof item === 'string')) return message.join(' ');
    }
  }
  return 'No se pudo completar la operación.';
}
