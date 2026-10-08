import { Injectable, signal } from '@angular/core';

export interface UiConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' para acciones que retiran o desactivan información. */
  tone?: 'default' | 'danger';
}

export interface UiDialogField {
  key: string;
  label: string;
  type?: 'text' | 'number';
  value?: string | number | null;
  required?: boolean;
  maxLength?: number;
  /** Solo para type 'number': se exige un entero dentro del rango. */
  min?: number;
  max?: number;
  hint?: string;
}

export interface UiFormDialogOptions {
  title: string;
  description?: string;
  fields: UiDialogField[];
  submitLabel?: string;
  cancelLabel?: string;
}

/** Valores enviados: textos recortados, números enteros o null si quedan vacíos. */
export type UiDialogValues = Record<string, string | number | null>;

export type UiDialogRequest =
  | { kind: 'confirm'; options: UiConfirmOptions; resolve: (result: boolean) => void }
  | { kind: 'form'; options: UiFormDialogOptions; resolve: (result: UiDialogValues | null) => void };

/**
 * Diálogos modales de la aplicación. Requiere un `ui-dialog-host` en la
 * estructura común (incluido en `ui-app-shell`). Solo hay un diálogo activo:
 * abrir otro cancela el anterior.
 */
@Injectable({ providedIn: 'root' })
export class UiDialogService {
  readonly active = signal<UiDialogRequest | null>(null);
  private opener: HTMLElement | null = null;

  confirm(options: UiConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => this.open({ kind: 'confirm', options, resolve }));
  }

  form(options: UiFormDialogOptions): Promise<UiDialogValues | null> {
    return new Promise((resolve) => this.open({ kind: 'form', options, resolve }));
  }

  /** Cierra el diálogo activo con su resultado. Usado por `ui-dialog-host`. */
  settle(result: boolean | UiDialogValues | null): void {
    const request = this.active();
    if (!request) return;
    this.active.set(null);
    if (request.kind === 'confirm') request.resolve(result === true);
    else request.resolve(typeof result === 'object' ? result : null);
    const opener = this.opener;
    this.opener = null;
    if (opener?.isConnected) queueMicrotask(() => opener.focus());
  }

  private open(request: UiDialogRequest): void {
    if (this.active()) this.settle(null);
    this.opener = typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.active.set(request);
  }
}

/** Valida y convierte los valores del formulario. Devuelve errores por campo. */
export function validateDialogFields(
  fields: UiDialogField[],
  raw: Record<string, string>
): { values: UiDialogValues; errors: Record<string, string> } {
  const values: UiDialogValues = {};
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const text = (raw[field.key] ?? '').trim();
    if (!text) {
      if (field.required) errors[field.key] = 'Complete este campo.';
      values[field.key] = null;
      continue;
    }
    if (field.type === 'number') {
      const number = Number(text);
      const outOfRange = (field.min !== undefined && number < field.min) || (field.max !== undefined && number > field.max);
      if (!/^-?\d+$/.test(text) || !Number.isSafeInteger(number)) {
        errors[field.key] = 'Ingrese un número entero.';
      } else if (outOfRange) {
        errors[field.key] = `Ingrese un valor entre ${field.min ?? '−∞'} y ${field.max ?? '∞'}.`;
      }
      values[field.key] = number;
      continue;
    }
    if (field.maxLength !== undefined && text.length > field.maxLength) {
      errors[field.key] = `Use como máximo ${field.maxLength} caracteres.`;
    }
    values[field.key] = text;
  }
  return { values, errors };
}
