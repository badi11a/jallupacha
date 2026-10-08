import { Component, input } from '@angular/core';

let nextSectionId = 0;

/** Agrupación con título dentro de un panel (h3). */
@Component({
  selector: 'ui-section',
  host: {
    class: 'ui-section',
    role: 'group',
    '[attr.aria-labelledby]': 'headingId'
  },
  template: `
    <h3 [id]="headingId">{{ heading() }}</h3>
    <ng-content />
  `
})
export class UiSectionComponent {
  readonly heading = input.required<string>();
  protected readonly headingId = `ui-section-heading-${++nextSectionId}`;
}
