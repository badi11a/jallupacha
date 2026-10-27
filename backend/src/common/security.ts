import * as argon2 from 'argon2';
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

// OWASP ASVS v4 Nivel 2 y RFC 9106 para derivación de contraseñas con Argon2id
const ARGON2ID_OPTIONS: argon2.HashOptions & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB (RFC 9106)
  timeCost: 3,       // 3 iteraciones
  parallelism: 4,    // 4 hilos/carriles de cálculo
  raw: false
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2ID_OPTIONS);
}

function scryptDerive(password: string, salt: string, keylen: number, N: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, { N, r, p }, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

async function verifyScryptPassword(password: string, serializedHash: string): Promise<boolean> {
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

export async function verifyPassword(password: string, serializedHash: string): Promise<boolean> {
  if (!serializedHash || typeof serializedHash !== 'string') {
    return false;
  }
  if (serializedHash.startsWith('$argon2id$') || serializedHash.startsWith('$argon2i$')) {
    try {
      return await argon2.verify(serializedHash, password);
    } catch {
      return false;
    }
  }
  if (serializedHash.startsWith('scrypt:')) {
    return verifyScryptPassword(password, serializedHash);
  }
  return false;
}
