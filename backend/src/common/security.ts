import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

export function tokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function safeHashEqual(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(tokenHash(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function scryptDerive(password: string, salt: string, keylen: number, N: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, { N, r, p }, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const N = 16384;
  const r = 8;
  const p = 1;
  const derivedKey = await scryptDerive(password, salt, 64, N, r, p);
  return `scrypt:${N}:${r}:${p}:${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, serializedHash: string): Promise<boolean> {
  try {
    const parts = serializedHash.split(':');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = parts[4];
    const expectedHash = parts[5];
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p) || !salt || !expectedHash) {
      return false;
    }
    const derivedKey = await scryptDerive(password, salt, 64, N, r, p);
    const actual = Buffer.from(derivedKey.toString('hex'), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
