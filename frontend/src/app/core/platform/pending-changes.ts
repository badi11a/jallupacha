import { CanDeactivateFn } from '@angular/router';

/** Serializable form values only; never credentials or persistent browser storage. */
export class PendingChanges<T> {
  private snapshot: string | null = null;
  constructor(private readonly read: () => T) {}
  reset(): void { this.snapshot = JSON.stringify(this.read()); }
  isDirty(): boolean { return this.snapshot !== null && JSON.stringify(this.read()) !== this.snapshot; }
}

export interface LeavesWithConfirmation {
  confirmLeave(): boolean | Promise<boolean>;
}
export function createUnsavedChangesGuard(resolveSession: () => {
  logoutInProgress(): boolean; isAuthenticated(): boolean; config: { loginPath: string };
}): CanDeactivateFn<LeavesWithConfirmation> {
  return (component, _route, _state, nextState) => {
    const session = resolveSession();
    if (session.logoutInProgress()) return !session.isAuthenticated() && nextState.url === session.config.loginPath;
    return component?.confirmLeave() ?? true;
  };
}
