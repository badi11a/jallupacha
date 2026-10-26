import { BadRequestException } from '@nestjs/common';
import { asBody, foldText, oneOf, optionalId, optionalText, rejectUnknownKeys, requiredText, RISK_LEVELS } from './input-validation';

describe('v15 input validation', () => {
  it('rejects bodies that are not objects and unknown fields', () => {
    expect(() => asBody(null)).toThrow(BadRequestException);
    expect(() => asBody([])).toThrow(BadRequestException);
    expect(() => rejectUnknownKeys({ name: 'x', role: 'ADMIN' }, ['name'])).toThrow(BadRequestException);
  });

  it('distinguishes absent, empty and present text fields', () => {
    expect(optionalText({}, 'alias', 'Alias', 10)).toBeUndefined();
    expect(optionalText({ alias: '   ' }, 'alias', 'Alias', 10)).toBeNull();
    expect(optionalText({ alias: ' ab ' }, 'alias', 'Alias', 10)).toBe('ab');
    expect(() => optionalText({ alias: 'x'.repeat(11) }, 'alias', 'Alias', 10)).toThrow(BadRequestException);
    expect(() => optionalText({ alias: 5 }, 'alias', 'Alias', 10)).toThrow(BadRequestException);
    expect(() => requiredText({ name: ' ' }, 'name', 'Nombre', 10)).toThrow(BadRequestException);
  });

  it('accepts only positive integer identifiers', () => {
    expect(optionalId({ id: 3 }, 'id', 'Id')).toBe(3);
    expect(optionalId({ id: null }, 'id', 'Id')).toBeNull();
    for (const invalid of ['3', 0, -1, 1.5, {}]) {
      expect(() => optionalId({ id: invalid }, 'id', 'Id')).toThrow(BadRequestException);
    }
  });

  it('accepts only the fixed risk levels', () => {
    for (const level of RISK_LEVELS) expect(oneOf(level, RISK_LEVELS, 'Nivel')).toBe(level);
    expect(() => oneOf('Extremo', RISK_LEVELS, 'Nivel')).toThrow(BadRequestException);
    expect(() => oneOf(undefined, RISK_LEVELS, 'Nivel')).toThrow(BadRequestException);
  });

  it('folds case and accents for searches', () => {
    expect(foldText('  Gestión de PLANIFICACIÓN Ñandú ')).toBe('gestion de planificacion nandu');
  });
});
