// API pública del kit de interfaz. Las aplicaciones importan solo desde aquí.
export { UiAppShellComponent } from './app-shell.component';
export { UiDialogHostComponent } from './dialog-host.component';
export {
  UiDialogService,
  validateDialogFields,
  type UiConfirmOptions,
  type UiDialogField,
  type UiDialogValues,
  type UiFormDialogOptions
} from './dialog.service';
export { UiMessageComponent, type UiMessageKind } from './message.component';
export { UiPaginationComponent } from './pagination.component';
export { UiPanelComponent } from './panel.component';
