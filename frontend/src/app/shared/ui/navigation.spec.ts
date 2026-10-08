import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Component, NgZone, provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, RouterOutlet, provideRouter, withRouterConfig } from '@angular/router';
import { provideUiNavigation } from './index';

@Component({ template: `<h1>Bienvenida</h1>` })
class WelcomeComponent {}

@Component({ template: `<section><h2>Pantalla A</h2><button type="button">En A</button></section>` })
class ScreenAComponent {}

@Component({ template: `<section><h2>Pantalla B</h2></section>` })
class ScreenBComponent {}

@Component({
  imports: [RouterOutlet],
  template: `<main id="main-content"><h1>Saludo general</h1><router-outlet /></main>`
})
class ShellComponent {}

describe('provideUiNavigation (C-007 R3)', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let router: Router;
  let scrollY = 0;
  const scrolls: number[] = [];
  const originalScrollTo = window.scrollTo;

  beforeEach(async () => {
    scrollY = 0;
    scrolls.length = 0;
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY });
    window.scrollTo = ((x: number, y: number) => {
      scrollY = y;
      scrolls.push(y);
    }) as typeof window.scrollTo;
    TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideZoneChangeDetection(),
        provideRouter([
          { path: '', component: WelcomeComponent, title: 'Inicio' },
          { path: 'a', component: ScreenAComponent, title: 'Pantalla A' },
          { path: 'b', component: ScreenBComponent, title: 'Pantalla B' }
        ], withRouterConfig({ canceledNavigationResolution: 'computed' })),
        provideLocationMocks(),
        provideUiNavigation({ appName: 'Aplicación' })
      ]
    });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    (document.activeElement as HTMLElement | null)?.blur();
    // Como en el arranque real: navegación inicial y escucha de Atrás/Adelante.
    router.initialNavigation();
    await settle();
  });

  afterEach(() => {
    fixture.destroy();
    window.scrollTo = originalScrollTo;
    Reflect.deleteProperty(window, 'scrollY');
  });

  async function go(url: string): Promise<void> {
    await router.navigateByUrl(url);
    await settle();
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  // Como en el navegador: el evento popstate llega dentro de la zona de Angular.
  function history(direction: 'back' | 'forward'): void {
    const location = TestBed.inject(Location);
    TestBed.inject(NgZone).run(() => (direction === 'back' ? location.back() : location.forward()));
  }

  function heading(text: string): HTMLElement {
    return [...fixture.nativeElement.querySelectorAll('h1, h2')].find((h: HTMLElement) => h.textContent === text) as HTMLElement;
  }

  it('titles every screen and leaves focus and position alone on the initial navigation', async () => {
    expect(router.url).toBe('/');
    expect(TestBed.inject(Title).getTitle()).toBe('Inicio · Aplicación');
    expect(document.activeElement).toBe(document.body);
    expect(scrolls).toEqual([]);

    await go('/a');
    expect(TestBed.inject(Title).getTitle()).toBe('Pantalla A · Aplicación');
    expect(document.activeElement).toBe(heading('Pantalla A'));
  });

  it('focuses the routed heading, not the shared greeting, and starts the new screen at the top', async () => {
    await go('/a');
    scrollY = 640;
    await go('/b');
    expect(TestBed.inject(Title).getTitle()).toBe('Pantalla B · Aplicación');
    const target = heading('Pantalla B');
    expect(document.activeElement).toBe(target);
    expect(target.getAttribute('tabindex')).toBe('-1');
    expect(scrolls.at(-1)).toBe(0);
  });

  it('keeps focus and position when only query parameters change', async () => {
    await go('/a');
    await go('/b');
    const control = heading('Pantalla B');
    control.blur();
    scrollY = 300;
    scrolls.length = 0;
    await go('/b?agrupar=estado');
    expect(document.activeElement).not.toBe(control);
    expect(scrolls).toEqual([]);
  });

  it('restores the saved position of the entry on Back and Forward', async () => {
    await go('/a');
    scrollY = 520;
    await go('/b');
    expect(scrollY).toBe(0);
    scrollY = 80;

    history('back');
    await settle();
    expect(router.url).toBe('/a');
    expect(scrollY).toBe(520);
    expect(document.activeElement).toBe(heading('Pantalla A'));

    history('forward');
    await settle();
    expect(router.url).toBe('/b');
    expect(scrollY).toBe(80);

    // Segundo ciclo: la posición guardada sigue a la entrada aunque el router renueve su id.
    history('back');
    await settle();
    scrollY = 200;
    history('forward');
    await settle();
    history('back');
    await settle();
    expect(router.url).toBe('/a');
    expect(scrollY).toBe(200);
  });
});
