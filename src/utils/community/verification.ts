/**
 * Email verification for community signup.
 *
 * The emailed token is NEVER stored. We keep only a SHA-256 hash, so a
 * database leak cannot hand an attacker working verification links — the
 * same reasoning that keeps the raw IP out of the analytics tables.
 *
 * No new dependency: token from `crypto.randomBytes`, hash from `crypto`.
 */
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/** How long a link stays usable. Long enough to check email tomorrow. */
export const TOKEN_TTL_HOURS = 72;

/** Cap resends per signup, so the endpoint cannot be used to spam an inbox. */
export const MAX_SENDS = 5;

export function newToken(): string {
  // 32 bytes → 43 url-safe chars. Long enough that guessing is hopeless.
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Constant-time compare so a timing side-channel cannot reveal the hash. */
export function tokenMatches(token: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) return false;
  const a = Buffer.from(hashToken(token));
  const b = Buffer.from(storedHash);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function expiryFrom(now: Date): Date {
  return new Date(now.getTime() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
}

/**
 * The verification email. Plain text as well as HTML — a worker on a basic
 * phone or a text-only client must be able to complete signup, and this is
 * the only step between them and the community.
 */
export function verificationEmail(opts: {
  firstName: string | null;
  verifyUrl: string;
  siteName: string;
}) {
  const name = opts.firstName ? ` ${opts.firstName}` : '';
  return {
    subject: `Confirm your email to join the ${opts.siteName} community`,
    text: [
      `Hello${name},`,
      '',
      `Please confirm your email address to finish joining the ${opts.siteName} community:`,
      '',
      opts.verifyUrl,
      '',
      `This link works for ${TOKEN_TTL_HOURS} hours. If you did not ask to join, you can ignore this message and nothing further will happen.`,
      '',
      opts.siteName,
    ].join('\n'),
    html: [
      `<p>Hello${name},</p>`,
      `<p>Please confirm your email address to finish joining the ${opts.siteName} community.</p>`,
      `<p><a href="${opts.verifyUrl}" style="display:inline-block;padding:12px 20px;background:#F8BD26;color:#111;text-decoration:none;font-weight:600">Confirm my email</a></p>`,
      `<p style="font-size:13px;color:#555">Or paste this link into your browser:<br><a href="${opts.verifyUrl}">${opts.verifyUrl}</a></p>`,
      `<p style="font-size:13px;color:#555">This link works for ${TOKEN_TTL_HOURS} hours. If you did not ask to join, you can ignore this message.</p>`,
      `<p style="font-size:13px;color:#555">${opts.siteName}</p>`,
    ].join(''),
  };
}
