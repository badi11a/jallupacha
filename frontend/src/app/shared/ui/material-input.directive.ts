import { booleanAttribute, Directive, inject, input } from '@angular/core';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatInput } from '@angular/material/input';

/** Bridges existing server/manual validation to Material without changing form models. */
@Directive({ selector: 'input[matInput], textarea[matInput], select[matNativeControl]' })
export class UiMaterialInputDirective {
  readonly uiInvalid = input<boolean | undefined, unknown>(undefined, {
    transform: value => value === undefined ? undefined : booleanAttribute(value)
  });
  constructor() {
    const control = inject(MatInput);
    const standard = inject(ErrorStateMatcher);
    control.errorStateMatcher = {
      isErrorState: (field, form) => this.uiInvalid() ?? standard.isErrorState(field, form)
    };
  }
}
