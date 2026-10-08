import { CanDeactivateFn } from '@angular/router';

/** Pantalla que puede tener cambios sin guardar y decide si se puede salir. */
export interface LeavesWithConfirmation {
  confirmLeave(): boolean | Promise<boolean>;
}

export const unsavedChangesGuard: CanDeactivateFn<LeavesWithConfirmation> = (component) => component.confirmLeave();
