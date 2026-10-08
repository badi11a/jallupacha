import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiPanelComponent } from './shared/ui';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, UiPanelComponent],
  template: `
    <ui-panel class="process-panel" heading="Página no encontrada" headingId="not-found-title">
      <p>La dirección solicitada no corresponde a una sección del sistema.</p>
      <a class="primary-button" routerLink="/procesos">Ir a Procesos</a>
    </ui-panel>
  `
})
export class NotFoundComponent {}
