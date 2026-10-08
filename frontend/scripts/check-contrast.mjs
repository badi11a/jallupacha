// Verifica el contraste WCAG 2.2 AA de las combinaciones de tokens que usa el kit.
// Texto: 4.5:1 (1.4.3). Bordes de controles y foco: 3:1 (1.4.11).
// Los controles deshabilitados están exentos según WCAG.
import { readFileSync } from 'node:fs';

const TEXT = 4.5;
const NON_TEXT = 3;

// [primer plano, fondo, mínimo, uso]
const PAIRS = [
  ['text', 'background', TEXT, 'texto general'],
  ['text', 'surface', TEXT, 'texto en paneles'],
  ['heading', 'surface', TEXT, 'títulos'],
  ['heading', 'background', TEXT, 'títulos sobre fondo'],
  ['text-muted', 'surface', TEXT, 'descripciones'],
  ['text-muted', 'background', TEXT, 'descripciones sobre fondo'],
  ['text-subtle', 'surface', TEXT, 'textos secundarios, small, helper'],
  ['text-subtle', 'background', TEXT, 'pie y paginación'],
  ['heading-subtle', 'surface', TEXT, 'encabezados de tabla'],
  ['eyebrow', 'surface', TEXT, 'rótulos'],
  ['eyebrow', 'background', TEXT, 'rótulos sobre fondo'],
  ['eyebrow', 'surface-accent', TEXT, 'etiqueta de entidad'],
  ['text-muted', 'neutral-background', TEXT, 'insignia neutra'],
  ['primary', 'surface-accent', TEXT, 'insignia informativa'],
  ['success-text', 'success-background', TEXT, 'nivel de riesgo bajo'],
  ['warning-text', 'warning-background', TEXT, 'nivel de riesgo medio'],
  ['error-text', 'error-background', TEXT, 'nivel de riesgo alto'],
  ['on-primary', 'danger', TEXT, 'nivel de riesgo crítico'],
  ['warning-text', 'surface', TEXT, 'contador cerca del límite'],
  ['primary', 'surface', TEXT, 'botones de texto y enlaces'],
  ['primary', 'quiet-hover-background', TEXT, 'botones de texto en hover'],
  ['on-primary', 'primary', TEXT, 'botón principal'],
  ['on-primary', 'primary-hover', TEXT, 'botón principal en hover'],
  ['on-primary', 'danger', TEXT, 'botón de peligro'],
  ['on-primary', 'danger-hover', TEXT, 'botón de peligro en hover'],
  ['on-brand', 'brand', TEXT, 'barra superior'],
  ['info-text', 'info-background', TEXT, 'mensaje informativo'],
  ['success-text', 'success-background', TEXT, 'mensaje de éxito'],
  ['error-text', 'error-background', TEXT, 'mensaje de error'],
  ['error-text', 'surface', TEXT, 'error de campo'],
  ['warning-text', 'warning-background', TEXT, 'aviso de entorno'],
  ['status', 'surface', TEXT, 'estado inactivo'],
  ['border-strong', 'surface', NON_TEXT, 'borde de campos'],
  ['error-text', 'surface', NON_TEXT, 'borde de campo inválido'],
  ['focus', 'surface', NON_TEXT, 'foco sobre paneles'],
  ['focus', 'background', NON_TEXT, 'foco sobre fondo'],
  ['focus', 'brand', NON_TEXT, 'foco en la barra superior']
];

const css = readFileSync(new URL('../src/app/shared/ui/styles/tokens.css', import.meta.url), 'utf8');
const tokens = Object.fromEntries(
  [...css.matchAll(/--ui-color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, name, hex]) => [name, hex])
);

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

let failures = 0;
for (const [fg, bg, min, use] of PAIRS) {
  if (!tokens[fg] || !tokens[bg]) {
    console.error(`FALTA  --ui-color-${tokens[fg] ? bg : fg} (${use})`);
    failures++;
    continue;
  }
  const value = ratio(tokens[fg], tokens[bg]);
  const ok = value >= min;
  if (!ok) failures++;
  console.log(`${ok ? 'OK   ' : 'FALLA'}  ${value.toFixed(2)}:1 ≥ ${min}  ${fg} / ${bg}  (${use})`);
}

if (failures) {
  console.error(`\n${failures} combinación(es) no cumplen WCAG 2.2 AA.`);
  process.exit(1);
}
console.log(`\n${PAIRS.length} combinaciones cumplen WCAG 2.2 AA.`);
