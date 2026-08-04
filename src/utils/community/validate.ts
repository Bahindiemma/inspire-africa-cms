/**
 * Defensive validation + sanitisation for the community-signup ingest
 * routes. Same philosophy as utils/analytics/validate.ts — the caller is
 * untrusted even though it is our own Next.js server, because a bug or a
 * leaked token upstream must not be able to write unbounded data.
 *
 * Difference from the analytics validator: this one handles PII, so it
 * additionally normalises the email and NEVER echoes values back in error
 * messages (an error string can end up in a log aggregator).
 *
 * Signup captures name + email + registrant type ONLY. Phone, country and
 * the optional password were removed when the form was reduced.
 */
export const LIMITS = {
  maxClickId: 64,
  maxName: 80,
  maxEmail: 254,
  maxSource: 128,
  maxUtm: 128,
  maxHost: 255,
  maxPath: 512,
  maxUa: 512,
};

/** Lifecycle states the ingest layer is allowed to set. */
export const INGEST_STATUSES = new Set([
  'Clicked',
  'Submitted',
  'Verified',
  'RedirectedToMN',
]);

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function bool(v: unknown): boolean {
  return v === true || v === 'true' || v === 'on' || v === '1';
}

/**
 * Deliberately permissive: RFC 5322 in a regex is a trap, and the real
 * validation is "can we reach it". We reject only what is structurally
 * unusable, and lowercase the whole address so `A@x.com` and `a@x.com`
 * collide on the unique index instead of creating two lead records.
 *
 * Note: lowercasing the local part is technically lossy (RFC says it is
 * case-sensitive), but every mail provider we care about treats it as
 * insensitive, and duplicate leads are the worse failure here.
 */
export function normaliseEmail(v: unknown): string | null {
  const s = str(v, LIMITS.maxEmail);
  if (!s) return null;
  const lower = s.toLowerCase();
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(lower)) return null;
  return lower;
}

export function hostOnly(v: unknown): string | null {
  const s = str(v, LIMITS.maxHost);
  if (!s) return null;
  try {
    return new URL(s).host || null;
  } catch {
    return s.replace(/^https?:\/\//i, '').split('/')[0].slice(0, LIMITS.maxHost) || null;
  }
}

/** Strip the query string — a landing path can carry PII in params. */
export function pathOnly(v: unknown): string | null {
  const s = str(v, LIMITS.maxPath);
  if (!s) return null;
  return s.split('?')[0].split('#')[0].slice(0, LIMITS.maxPath) || null;
}

export interface CleanClick {
  clickId: string;
  source: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrerHost: string | null;
  landingPath: string | null;
}

export const REGISTRANT_TYPES = ['jobseeker', 'employer', 'government', 'other'] as const;

export interface CleanSignup extends CleanClick {
  registrantType: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  consentTerms: boolean;
  consentMarketing: boolean;
  /** Honeypot field — any value means a bot filled a hidden input. */
  trap: boolean;
}

export function sanitizeClick(body: any): CleanClick {
  if (!body || typeof body !== 'object') throw new Error('payload must be an object');
  const clickId = str(body.clickId, LIMITS.maxClickId);
  if (!clickId) throw new Error('clickId is required');
  return {
    clickId,
    source: str(body.source, LIMITS.maxSource),
    utmSource: str(body.utmSource, LIMITS.maxUtm),
    utmMedium: str(body.utmMedium, LIMITS.maxUtm),
    utmCampaign: str(body.utmCampaign, LIMITS.maxUtm),
    referrerHost: hostOnly(body.referrer ?? body.referrerHost),
    landingPath: pathOnly(body.landingPath),
  };
}

export function sanitizeSignup(body: any): CleanSignup {
  const base = sanitizeClick(body);
  const email = normaliseEmail(body.email);
  if (!email) throw new Error('a valid email is required');

  const rt = str(body.registrantType, 32);

  return {
    ...base,
    // Unknown values fall back to jobseeker rather than being rejected — a
    // bad enum must not cost us the lead.
    registrantType:
      rt && (REGISTRANT_TYPES as readonly string[]).includes(rt) ? rt : 'jobseeker',
    email,
    firstName: str(body.firstName, LIMITS.maxName),
    lastName: str(body.lastName, LIMITS.maxName),
    consentTerms: bool(body.consentTerms),
    consentMarketing: bool(body.consentMarketing),
    trap: Boolean(str(body.company, 200)), // honeypot input is named "company"
  };
}
