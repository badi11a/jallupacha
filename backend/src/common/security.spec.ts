import { hashPassword, randomToken, safeHashEqual, tokenHash, verifyPassword } from './security';

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

  it('hashes passwords securely and verifies them with constant-time equality', async () => {
    const password = 'ClaveInstitucionalSegura!2026';
    const hash = await hashPassword(password);
    expect(hash).toMatch(/^scrypt:\d+:\d+:\d+:[0-9a-f]+:[0-9a-f]+$/);
    expect(hash).not.toContain(password);

    const matches = await verifyPassword(password, hash);
    expect(matches).toBe(true);

    const wrong = await verifyPassword('ClaveIncorrecta', hash);
    expect(wrong).toBe(false);

    const malformed = await verifyPassword(password, 'invalid-hash-string');
    expect(malformed).toBe(false);
  });
});
