import { randomToken, safeHashEqual, tokenHash } from './security';

describe('session token primitives', () => {
  it('creates unguessable-format tokens and verifies only their hash', () => {
    const first = randomToken();
    const second = randomToken();
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{40,60}$/);
    expect(tokenHash(first)).not.toContain(first);
    expect(safeHashEqual(first, tokenHash(first))).toBe(true);
    expect(safeHashEqual(second, tokenHash(first))).toBe(false);
  });
});
