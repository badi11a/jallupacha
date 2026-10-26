import { SQL_FOLD_FROM, SQL_FOLD_TO } from './input-validation';

export type Row = Record<string, unknown>;
export const fold = (expression: string): string => `TRANSLATE(LOWER(${expression}), '${SQL_FOLD_FROM}', '${SQL_FOLD_TO}')`;
export const bool = (value: unknown): boolean => Number(value) === 1;
