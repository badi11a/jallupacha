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

  it('hashes passwords with Argon2id (REQ-25 v15) and verifies them', async () => {
    const password = 'ClaveInstitucionalSegura!2026';
    const hash = await hashPassword(password);
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=65536,p=4,t=3\$/);
    expect(hash).not.toContain(password);

    const matches = await verifyPassword(password, hash);
    expect(matches).toBe(true);

    const wrong = await verifyPassword('ClaveIncorrecta', hash);
    expect(wrong).toBe(false);

    const malformed = await verifyPassword(password, 'invalid-hash-string');
    expect(malformed).toBe(false);

    const empty = await verifyPassword(password, '');
    expect(empty).toBe(false);
  });

  it('maintains backwards compatibility verifying legacy scrypt hashes', async () => {
    const validScryptHash =
      'scrypt:16384:8:1:a1b2c3d4e5f60718293a4b5c6d7e8f90:3f06b78155428bf394aa4c12ff4a34e92d46e5348e4a166679acd70a85feb5637730bf6c2ebe27025de6fa2fdb92f18aed1c1007785798478dbe18b7751c9df3';

    expect(await verifyPassword('ClaveDemo2026!', validScryptHash)).toBe(true);
    expect(await verifyPassword('ClaveErronea!', validScryptHash)).toBe(false);

    const malformedScrypt = 'scrypt:16384:8:1:invalid';
    expect(await verifyPassword('ClaveDemo2026!', malformedScrypt)).toBe(false);
  });
});
