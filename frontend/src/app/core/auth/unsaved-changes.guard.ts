import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/** Pantalla que puede tener cambios sin guardar y decide si se puede salir. */
export type { LeavesWithConfirmation } from '../platform';
import { createUnsavedChangesGuard } from '../platform';

// Sin componente (p. ej. el outlet se destruyó al cerrar sesión) no hay cambios que proteger.
export const unsavedChangesGuard = createUnsavedChangesGuard(() => inject(AuthService));
