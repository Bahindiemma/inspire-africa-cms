/**
 * Password hashing for the (optional) community-signup credential.
 *
 * DESIGN NOTE — read before enabling this.
 * A password here authenticates nothing: Mighty Networks owns the login.
 * Collecting one creates real breach liability for zero user value, so it
 * is OFF by default and gated behind COMMUNITY_SIGNUP_PASSWORD=on. It is
 * only worth switching on once MN SSO exists (Growth plan / Mighty Pro)
 * and this CMS becomes the identity provider.
 *
 * Algorithm: scrypt (RFC 7914) from Node's core `crypto`.
 *   - Memory-hard, and listed by OWASP as an acceptable password KDF.
 *   - Chosen over argon2id ONLY because argon2 is a native addon and this
 *     repo's Docker image budget does not justify a new binary dependency
 *     for a field that is off by default. If the field is ever switched on
 *     permanently, revisit and move to argon2id.
 *
 * Encoding: `scrypt$N$r$p$<saltB64>$<hashB64>` — self-describing, so the
 * cost parameters can be raised later without breaking old hashes.
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const N = 32768; // CPU/memory cost — 2^15
const R = 8;
const P = 1;
const KEYLEN = 64;
const SALT_BYTES = 16;
// scrypt needs maxmem >= ~128 * N * r; Node's default (32 MB) is too low for N=2^15.
const MAXMEM = 128 * N * R * 2;

export function isPasswordEnabled(): boolean {
  return String(process.env.COMMUNITY_SIGNUP_PASSWORD || '').toLowerCase() === 'on';
}

export function hashPassword(plain: string): string {
  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(plain, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = stored.split('$');
    if (scheme !== 'scrypt') return false;
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const actual = scryptSync(plain, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 128 * Number(n) * Number(r) * 2,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Minimum viable strength: length beats composition rules, which just
 * push people toward `Passw0rd!`. We block the handful of passwords that
 * would actually be guessed first.
 */
const COMMON = new Set([
  'password', 'password1', 'password123', '123456789012', 'qwertyuiop12',
  'inspireafrica', 'inspireafrica1', 'letmein12345', 'iloveyou1234',
  'administrator', 'welcome12345', 'abcdefghijkl', '111111111111',
]);

export function passwordProblem(plain: string): string | null {
  if (plain.length < 12) return 'Password must be at least 12 characters.';
  if (plain.length > 200) return 'Password is too long.';
  if (COMMON.has(plain.toLowerCase())) return 'That password is too common. Please choose another.';
  return null;
}
