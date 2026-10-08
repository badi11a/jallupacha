import { Component, computed, input, output } from '@angular/core';

/** Paginación anterior/siguiente para listados paginados en el servidor. */
@Component({
  selector: 'ui-pagination',
  host: { class: 'pagination' },
  template: `
    <span>Página {{ page() }} · {{ total() }} {{ itemLabel() }}</span>
    <div>
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
  readonly pageChange = output<number>();
  protected readonly hasPrevious = computed(() => this.page() > 1);
  protected readonly hasNext = computed(() => this.page() * this.pageSize() < this.total());
}
