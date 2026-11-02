import { Component, inject } from '@angular/core';
import { UiDialogService } from './dialog.service';
import { UiMaterialDialogOutletComponent } from './material-dialog-outlet.component';

/** Load Material dialog infrastructure only when a consumer opens a dialog. */
@Component({
  selector: 'ui-dialog-host',
  imports: [UiMaterialDialogOutletComponent],
  template: '@defer (when dialogs.active()) { <ui-material-dialog-outlet /> }'
})
export class UiDialogHostComponent {
  protected readonly dialogs = inject(UiDialogService);
}
