import { BadRequestException } from '@nestjs/common';

export type Body = Record<string, unknown>;

export const RISK_LEVELS = ['Bajo', 'Medio', 'Alto', 'Crítico'] as const;
export const RELATION_TYPES = ['FLUJO', 'DEPENDENCIA', 'COORDINACION'] as const;

export function asBody(value: unknown): Body {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('El cuerpo de la solicitud no es válido.');
  }
  return value as Body;
}

export function rejectUnknownKeys(body: Body, allowed: readonly string[]): void {
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) throw new BadRequestException(`Campos no permitidos: ${unknown.join(', ')}.`);
}

/** `undefined` si el campo no viene; `null` si viene vacío; texto recortado en otro caso. */
export function optionalText(body: Body, key: string, label: string, max: number): string | null | undefined {
  if (!(key in body) || body[key] === undefined) return undefined;
  const value = body[key];
  if (value === null) return null;
  if (typeof value !== 'string') throw new BadRequestException(`${label} debe ser texto.`);
  const text = value.trim();
  if (text.length > max) throw new BadRequestException(`${label} no puede superar ${max} caracteres.`);
  return text.length === 0 ? null : text;
}

export function requiredText(body: Body, key: string, label: string, max: number): string {
  const value = optionalText(body, key, label, max);
  if (value === undefined || value === null) throw new BadRequestException(`${label} es obligatorio.`);
  return value;
}

export function asId(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new BadRequestException(`${label} no es válido.`);
  }
  return value;
}

export function optionalId(body: Body, key: string, label: string): number | null | undefined {
  if (!(key in body) || body[key] === undefined) return undefined;
  return body[key] === null ? null : asId(body[key], label);
}

export function requiredId(body: Body, key: string, label: string): number {
  return asId(body[key], label);
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new BadRequestException(`${label} debe ser uno de: ${allowed.join(', ')}.`);
  }
  return value as T;
}

/** Texto comparable sin distinguir mayúsculas ni tildes; coincide con TRANSLATE(LOWER(...)) del servidor. */
export function foldText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export const SQL_FOLD_FROM = 'áéíóúüñ';
export const SQL_FOLD_TO = 'aeiouun';
