/**
 * Application-level encryption for the most sensitive signup fields.
 *
 * WHY THIS EXISTS
 * The LMIS Postgres holds identity numbers with model-layer encryption and
 * row-level security. Strapi/MySQL has neither. Capturing identity-document
 * numbers here without compensating for that would be a straight security
 * downgrade on the single most identity-theft-sensitive field we hold, so
 * we encrypt it in the application before it reaches the database.
 *
 * AES-256-GCM from Node core — authenticated (tampering is detected on
 * decrypt) and no new dependency, which matters because this repo's Docker
 * image already builds slowly on a 4-CPU VPS.
 *
 * Format: `v1.<iv-b64>.<tag-b64>.<ciphertext-b64>` — self-describing, so the
 * scheme can be rotated later without breaking stored values.
 *
 * KEY: COMMUNITY_PII_KEY, 32 bytes hex or base64 (`openssl rand -hex 32`).
 * This key is NOT the analytics salt and NOT the signup ingest token — a
 * leak of either of those must not decrypt PII.
 *
 * FAILS CLOSED: if the key is missing or malformed, encryption throws rather
 * than silently storing plaintext. A signup that cannot be encrypted must not
 * be stored in the clear.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const SCHEME = 'v1';
const IV_BYTES = 12; // GCM standard nonce length

function key(): Buffer {
  const raw = process.env.COMMUNITY_PII_KEY;
  if (!raw) {
    throw new Error(
      'COMMUNITY_PII_KEY is not set — refusing to store identity data unencrypted.'
    );
  }
  const buf = /^[0-9a-f]{64}$/i.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error(
      `COMMUNITY_PII_KEY must be 32 bytes (got ${buf.length}). Generate with: openssl rand -hex 32`
    );
  }
  return buf;
}

export function isPiiEncryptionConfigured(): boolean {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

export function encryptPii(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined || plain === '') return null;
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [SCHEME, iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join('.');
}

/** Returns null on any tampering, wrong key, or malformed input — never throws at the call site. */
export function decryptPii(stored: string | null | undefined): string | null {
  if (!stored) return null;
  try {
    const [scheme, ivB64, tagB64, ctB64] = stored.split('.');
    if (scheme !== SCHEME) return null;
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Last 4 characters, kept in clear so staff can confirm a document over the
 * phone ("...ending 4567") without decrypting the full number. Anything
 * shorter than 4 characters returns null rather than leaking the whole value.
 */
export function last4(plain: string | null | undefined): string | null {
  if (!plain) return null;
  const s = String(plain).replace(/\s+/g, '');
  return s.length >= 4 ? s.slice(-4) : null;
}
