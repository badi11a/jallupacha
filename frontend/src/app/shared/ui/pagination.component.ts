import { Component, computed, input, output } from '@angular/core';

/** Paginación anterior/siguiente para listados paginados en el servidor. */
@Component({
  selector: 'ui-pagination',
  host: { class: 'pagination', role: 'navigation', '[attr.aria-label]': 'label()' },
  template: `
    @if (summaryMode() === 'pages') {
      <span>Página {{ page() }} de {{ pageCount() }}</span>
    } @else {
      <span>Página {{ page() }} · {{ total() }} {{ itemLabel() }}</span>
    }
    <div class="ui-form-actions">
      <button class="text-button" type="button" [disabled]="disabled() || !hasPrevious()" (click)="pageChange.emit(page() - 1)">Anterior</button>
      <button class="text-button" type="button" [disabled]="disabled() || !hasNext()" (click)="pageChange.emit(page() + 1)">Siguiente</button>
    </div>
  `
})
export class UiPaginationComponent {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly itemLabel = input<string>('elementos');
  readonly disabled = input<boolean>(false);
  readonly summaryMode = input<'items' | 'pages'>('items');
  readonly label = input<string>('Navegación de páginas');
  readonly pageChange = output<number>();
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  protected readonly hasPrevious = computed(() => this.page() > 1);
  protected readonly hasNext = computed(() => this.page() * this.pageSize() < this.total());
}
