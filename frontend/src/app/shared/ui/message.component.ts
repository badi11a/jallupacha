import { Component, computed, input } from '@angular/core';

export type UiMessageKind = 'info' | 'success' | 'error';

/** Mensaje de estado. Los errores se anuncian con role="alert". */
@Component({
  selector: 'ui-message',
  host: {
    class: 'message',
    '[class.success]': "kind() === 'success'",
    '[class.error]': "kind() === 'error'",
    '[attr.role]': 'role()'
  },
  template: `<ng-content />`
})
export class UiMessageComponent {
  readonly kind = input<UiMessageKind>('info');
  protected readonly role = computed(() => (this.kind() === 'error' ? 'alert' : 'status'));
}
