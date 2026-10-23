// API pública del kit de interfaz. Las aplicaciones importan solo desde aquí.
export { UiBadgeComponent, type UiBadgeTone } from './badge.component';
export { UiBreadcrumbsComponent, type UiBreadcrumb } from './breadcrumbs.component';
export { UiCharCounterComponent, charCountState, countCharacters, type UiCharCountState } from './char-counter.component';
export { type UiTextLengthMode } from './text-length';
export { UiDialogHostComponent } from './dialog-host.component';
export {
  UiDialogService,
  validateDialogFields,
  nativeMaxLength,
  type UiConfirmOptions,
  type UiDialogField,
  type UiDialogValues,
  type UiFormDialogOptions
} from './dialog.service';
export { UiMessageComponent, type UiMessageKind } from './message.component';
export { UiModuleNavComponent, type UiModuleNavItem } from './module-nav.component';
export { UiNavigationFocus, UiTitleStrategy, provideUiNavigation, type UiNavigationOptions } from './navigation';
export { UiPaginationComponent } from './pagination.component';
export { UiPanelComponent } from './panel.component';
export { UiSectionComponent } from './section.component';
export { focusFirstInvalid } from './forms';
