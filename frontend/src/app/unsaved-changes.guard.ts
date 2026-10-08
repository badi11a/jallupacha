import { CanDeactivateFn } from '@angular/router';

/** Pantalla que puede tener cambios sin guardar y decide si se puede salir. */
export interface LeavesWithConfirmation {
  confirmLeave(): boolean | Promise<boolean>;
}

// Sin componente (p. ej. el outlet se destruyó al cerrar sesión) no hay cambios que proteger.
export const unsavedChangesGuard: CanDeactivateFn<LeavesWithConfirmation> = (component) =>
  component?.confirmLeave() ?? true;
