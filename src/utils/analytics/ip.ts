/**
 * IP anonymisation. The raw IP is used transiently for the geo lookup
 * then immediately discarded — only a salted, truncated hash is stored
 * (so we can roughly de-duplicate sessions/abuse without holding PII).
 *
 *   - IPv4 → drop the last octet (/24) before hashing.
 *   - IPv6 → keep the first three hextets (/48) before hashing.
 */
import { createHash } from 'crypto';

export function clientIpFrom(ctx: any): string | null {
  // The Next.js ingest proxy forwards the real client IP here.
  const fwd = ctx?.request?.header?.['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) {
    return fwd.split(',')[0].trim();
  }
  return ctx?.request?.ip ?? null;
}

export function truncateIp(ip: string | null | undefined): string {
  if (!ip) return '';
  const clean = ip.replace(/^::ffff:/i, ''); // IPv4-mapped IPv6
  if (clean.includes(':')) {
    const parts = clean.split(':').filter(Boolean);
    return parts.slice(0, 3).join(':') + '::';
  }
  const oct = clean.split('.');
  if (oct.length === 4) {
    oct[3] = '0';
    return oct.join('.');
  }
  return clean;
}

/** Salted SHA-256 of the truncated IP, trimmed to 32 hex chars. */
export function hashIp(
  ip: string | null | undefined,
  salt: string
): string | null {
  const truncated = truncateIp(ip);
  if (!truncated) return null;
  return createHash('sha256')
    .update(`${truncated}|${salt}`)
    .digest('hex')
    .slice(0, 32);
}
