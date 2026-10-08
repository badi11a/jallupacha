import { Component, input } from '@angular/core';

let nextPanelId = 0;

/**
 * Sección con encabezado. Lo que va antes del título (p. ej. migas de pan) se
 * proyecta con `panelLead`, las acciones del encabezado con `panelActions` y el
 * resto del contenido va debajo.
 */
@Component({
  selector: 'ui-panel',
  host: {
    class: 'panel',
    role: 'region',
    '[attr.aria-labelledby]': 'headingId()'
  },
  template: `
    <ng-content select="[panelLead]" />
    <div class="panel-heading">
      <div>
        @if (eyebrow()) { <p class="eyebrow">{{ eyebrow() }}</p> }
        <h2 [id]="headingId()">{{ heading() }}</h2>
      </div>
      <div class="panel-actions"><ng-content select="[panelActions]" /></div>
    </div>
    <ng-content />
  `
})
export class UiPanelComponent {
  readonly heading = input.required<string>();
  readonly eyebrow = input<string>('');
  readonly headingId = input<string>(`ui-panel-heading-${++nextPanelId}`);
}
