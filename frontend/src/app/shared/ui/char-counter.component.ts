import { Component, computed, input } from '@angular/core';
import { countCharacters, UiTextLengthMode } from './text-length';

// Compatibilidad del punto de importación anterior; consumidores nuevos usan index.ts.
export { countCharacters } from './text-length';

export type UiCharCountState = 'ok' | 'near' | 'over';

/** Umbral desde el que se avisa: queda el 10 % o menos. */
export function charCountState(length: number, max: number): UiCharCountState {
  if (length > max) return 'over';
  return max - length <= Math.ceil(max * 0.1) ? 'near' : 'ok';
}

/**
 * Contador que aparece solo cerca del límite o al superarlo; lejos del límite
 * sería ruido. No es una región viva: anunciar cada pulsación satura el lector
 * de pantalla; quien lo usa anuncia solo los cambios de umbral.
 */
@Component({
  selector: 'ui-char-counter',
  host: {
    class: 'char-counter',
    '[hidden]': "state() === 'ok'",
    '[class.char-counter-near]': "state() === 'near'",
    '[class.char-counter-over]': "state() === 'over'"
  },
  template: `{{ format(length()) }} / {{ format(max()) }}`
})
export class UiCharCounterComponent {
  readonly value = input<string | null>(null);
  readonly max = input.required<number>();
  readonly lengthMode = input<UiTextLengthMode>('utf16');
  protected readonly length = computed(() => countCharacters(this.value(), this.lengthMode()));
  protected readonly state = computed(() => charCountState(this.length(), this.max()));

  protected format(value: number): string {
    return value.toLocaleString('es-CL');
  }
}
