import { Component, ElementRef, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiDialogHostComponent } from './shared/ui';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, UiDialogHostComponent],
  template: `
    <a class="skip-link" href="#main-content" (click)="focusContent($event)">Ir al contenido principal</a>
    <main id="main-content" tabindex="-1">
      <router-outlet />
    </main>
    <ui-dialog-host />
  `
})
export class AppComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  focusContent(event: Event): void {
    event.preventDefault();
    const main = this.host.nativeElement.querySelector<HTMLElement>('#main-content');
    main?.focus({ preventScroll: true });
    main?.scrollIntoView?.({ block: 'start' });
  }
}
