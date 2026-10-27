import { Component, provideZoneChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';
import { UiMaterialInputDirective } from './material-input.directive';

@Component({
  imports: [MatFormFieldModule, MatInputModule, ReactiveFormsModule, UiMaterialInputDirective],
  template: `<label for="name">Nombre</label><mat-form-field appearance="outline">
    <input matInput id="name" [formControl]="name" [uiInvalid]="manual()" />
  </mat-form-field>`
})
class Host {
  readonly name = new FormControl('', Validators.required);
  readonly manual = signal<boolean | undefined>(false);
}

describe('Material validation adapter', () => {
  it('preserves explicit manual validation and falls back to Angular validation when unspecified', () => {
    TestBed.configureTestingModule({ imports: [Host], providers: [provideZoneChangeDetection()] });
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    const input = fixture.debugElement.query(By.directive(MatInput)).injector.get(MatInput);
    host.name.markAsTouched();
    fixture.detectChanges();
    expect(input.errorState).toBe(false);
    host.manual.set(true);
    fixture.detectChanges();
    expect(input.errorState).toBe(true);
    host.manual.set(false);
    fixture.detectChanges();
    expect(input.errorState).toBe(false);
    host.manual.set(undefined);
    fixture.detectChanges();
    expect(input.errorState).toBe(true);
    host.name.setValue('Registro');
    fixture.detectChanges();
    expect(input.errorState).toBe(false);
    fixture.destroy();
  });
});
