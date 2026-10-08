import { Component, input } from '@angular/core';

export type UiBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'critical';

/** Insignia de estado o nivel: el texto siempre acompaña al color. */
@Component({
  selector: 'ui-badge',
  host: {
    class: 'badge',
    '[class.badge-info]': "tone() === 'info'",
    '[class.badge-success]': "tone() === 'success'",
    '[class.badge-warning]': "tone() === 'warning'",
    '[class.badge-danger]': "tone() === 'danger'",
    '[class.badge-critical]': "tone() === 'critical'"
  },
  template: `<ng-content />`
})
export class UiBadgeComponent {
  readonly tone = input<UiBadgeTone>('neutral');
}
