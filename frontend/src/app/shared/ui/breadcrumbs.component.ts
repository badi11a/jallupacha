import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface UiBreadcrumb {
  label: string;
  /** Destino del enlace; el último elemento se presenta como página actual. */
  link?: string | (string | number)[];
}

@Component({
  selector: 'ui-breadcrumbs',
  imports: [RouterLink],
  template: `
    <nav class="breadcrumbs" [attr.aria-label]="label()">
      <ol>
        @for (item of items(); track $index; let last = $last) {
          <li>
            @if (item.link && !last) {
              <a [routerLink]="item.link">{{ item.label }}</a>
            } @else {
              <span [attr.aria-current]="last ? 'page' : null">{{ item.label }}</span>
            }
          </li>
        }
      </ol>
    </nav>
  `
})
export class UiBreadcrumbsComponent {
  readonly items = input.required<UiBreadcrumb[]>();
  readonly label = input<string>('Ubicación');
}
