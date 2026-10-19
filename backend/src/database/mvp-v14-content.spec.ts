import { loadMvpV14Content, MVP_V14_MACROPROCESS_TYPES } from './mvp-v14-content';

describe('MVP v14 demonstration content', () => {
  it('maps the authorized example content to the three fixed macroprocess types', () => {
    const content = loadMvpV14Content();

    expect(content).toHaveLength(3);
    expect(content.map((macroprocess) => macroprocess.typeCode)).toEqual(
      MVP_V14_MACROPROCESS_TYPES.map((type) => type.code)
    );
    expect(content.map((macroprocess) => macroprocess.name)).toEqual([
      'Estratégicos',
      'Misionales',
      'De apoyo'
    ]);
    expect(content.flatMap((macroprocess) => macroprocess.processes)).toHaveLength(24);
  });

  it('gives every process a scope, one responsible unit and contiguous PR codes', () => {
    const processes = loadMvpV14Content().flatMap((macroprocess) => macroprocess.processes);

    expect(processes.every((process) => process.scope && process.responsibleUnit)).toBe(true);
    expect(processes.map((process) => Number(process.code.slice(2))).sort((a, b) => a - b))
      .toEqual(processes.map((_, index) => index + 1));
  });

  it('keeps every demonstration risk within the fixed MVP risk levels', () => {
    const levels = loadMvpV14Content()
      .flatMap((macroprocess) => macroprocess.processes)
      .map((process) => process.risk.level);

    expect(levels.every((level) => ['Bajo', 'Medio', 'Alto', 'Crítico'].includes(level))).toBe(true);
  });
});
