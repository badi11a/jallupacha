/** Tras renderizar errores, enfoca el primer control inválido disponible del ámbito. */
export function focusFirstInvalid(root: HTMLElement): void {
  setTimeout(() => {
    if (!root.isConnected) return;
    for (const control of root.querySelectorAll<HTMLElement>('[aria-invalid="true"]')) {
      if (!control.matches('input:not([type="hidden"]), select, textarea, button, [tabindex]')
        || control.matches(':disabled') || control.closest('[hidden], [inert], [aria-hidden="true"]')) continue;
      let visible = true;
      for (let node: HTMLElement | null = control; node; node = node.parentElement) {
        const style = node.ownerDocument.defaultView?.getComputedStyle(node);
        if (style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse') { visible = false; break; }
      }
      if (!visible) continue;
      control.focus();
      if (control.ownerDocument.activeElement === control) return;
    }
  }, 0);
}
