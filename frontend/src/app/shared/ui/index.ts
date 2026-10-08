// API pública del kit de interfaz. Las aplicaciones importan solo desde aquí.
export { UiAppShellComponent } from './app-shell.component';
export { UiBadgeComponent, type UiBadgeTone } from './badge.component';
export { UiBreadcrumbsComponent, type UiBreadcrumb } from './breadcrumbs.component';
export { UiCharCounterComponent, charCountState, countCharacters, type UiCharCountState } from './char-counter.component';
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
export { UiNavigationFocus, UiTitleStrategy, provideUiNavigation, type UiNavigationOptions } from './navigation';
export { UiPaginationComponent } from './pagination.component';
export { UiPanelComponent } from './panel.component';
export { UiSectionComponent } from './section.component';
