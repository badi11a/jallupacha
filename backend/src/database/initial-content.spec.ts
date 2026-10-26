import { loadInitialContent, INITIAL_MACROPROCESS_TYPES } from './initial-content';

describe('initial schema demonstration content', () => {
  it('maps the authorized example content to the three fixed macroprocess types', () => {
    const content = loadInitialContent();

    expect(content).toHaveLength(11);
    expect([...new Set(content.map((macroprocess) => macroprocess.typeCode))].sort()).toEqual(
      INITIAL_MACROPROCESS_TYPES.map((type) => type.code).sort()
    );
    expect(content.flatMap((macroprocess) => macroprocess.processes)).toHaveLength(24);
  });

  it('gives every process a scope, one responsible unit and contiguous PR codes', () => {
    const processes = loadInitialContent().flatMap((macroprocess) => macroprocess.processes);

    expect(processes.every((process) => process.scope && process.responsibleUnit)).toBe(true);
    expect(processes.map((process) => Number(process.code.slice(2))).sort((a, b) => a - b))
      .toEqual(processes.map((_, index) => index + 1));
  });

  it('preserves a distinct description for every macroprocess and the approved names', () => {
    const content = loadInitialContent();
    expect(content.every(macro => macro.description.trim().length > 0 && macro.description !== macro.name)).toBe(true);
    expect(new Set(content.map(macro => macro.description)).size).toBe(content.length);
    expect(content.map(macro => macro.name)).toEqual(expect.arrayContaining([
      'Gestión de Personas y Abastecimiento', 'Gestión de Servicios Tecnológicos'
    ]));
  });

  it('keeps every demonstration risk within the fixed v15 risk levels', () => {
    const levels = loadInitialContent()
      .flatMap((macroprocess) => macroprocess.processes)
      .map((process) => process.risk.level);

    expect(levels.every((level) => ['Bajo', 'Medio', 'Alto', 'Crítico'].includes(level))).toBe(true);
  });
});
