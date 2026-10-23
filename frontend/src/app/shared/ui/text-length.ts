/** Criterio del contrato consumidor; no representa una cuenta de grafemas. */
export type UiTextLengthMode = 'utf16' | 'validator';

/** Mide el texto recortado que envían los formularios del kit, sin normalizarlo. */
export function countCharacters(
  value: string | null | undefined,
  lengthMode: UiTextLengthMode = 'utf16'
): number {
  const text = (value ?? '').trim();
  if (lengthMode === 'utf16') return text.length;
  // Equivalente al cálculo de longitud de la versión instalada de validator.
  const presentation = text.match(/[^\uFE0F\uFE0E][\uFE0F\uFE0E]/g)?.length ?? 0;
  const surrogates = text.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g)?.length ?? 0;
  return text.length - presentation - surrogates;
}
