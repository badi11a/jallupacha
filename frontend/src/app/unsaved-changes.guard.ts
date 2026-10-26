import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { AuthService } from './auth.service';

/** Pantalla que puede tener cambios sin guardar y decide si se puede salir. */
export interface LeavesWithConfirmation {
  confirmLeave(): boolean | Promise<boolean>;
}

// Sin componente (p. ej. el outlet se destruyó al cerrar sesión) no hay cambios que proteger.
export const unsavedChangesGuard: CanDeactivateFn<LeavesWithConfirmation> = (component, _route, _state, nextState) => {
  const auth = inject(AuthService);
  if (auth.logoutInProgress()) {
    // La confirmación ya se resolvió antes de iniciar la revocación. Ninguna
    // navegación ajena al acceso puede reutilizar ese consentimiento.
    return !auth.isAuthenticated() && nextState.url === '/login';
  }
  return component?.confirmLeave() ?? true;
};
