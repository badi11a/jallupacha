import { Component, computed, input } from '@angular/core';
import { UiBadgeComponent } from '../../shared/ui';
import { ProcessDetail } from './process-api.service';

/** Read-only product composition; no requests, form state or invented record attributes. */
@Component({
  selector: 'app-process-governance',
  imports: [UiBadgeComponent],
  templateUrl: './process-governance.component.html',
  styleUrl: './process-governance.component.css'
})
export class ProcessGovernanceComponent {
  readonly detail = input.required<ProcessDetail>();
  readonly responsibleUnit = computed(() => this.detail().units.find(unit => unit.role === 'RESPONSABLE') ?? null);
  readonly participantUnits = computed(() => this.detail().units.filter(unit => unit.role === 'PARTICIPANTE'));
}
