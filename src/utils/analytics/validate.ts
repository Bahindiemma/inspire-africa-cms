/**
 * Defensive validation + sanitisation for the public ingest endpoint.
 * The browser is untrusted: cap counts and string lengths, whitelist
 * event types, coerce numbers, and drop anything unexpected. Throws a
 * plain Error (the controller maps it to a 400) on structurally invalid
 * payloads.
 */
export const LIMITS = {
  maxEventsPerBatch: 50,
  maxStr: 512,
  maxTitle: 255,
  maxHost: 255,
  maxSessionId: 64,
  maxSectionId: 128,
  maxMetaBytes: 1024,
};

export const EVENT_TYPES = new Set([
  'pageview',
  'click',
  'scroll_depth',
  'section_view',
  'outbound_click',
  'form_start',
  'form_submit',
  'session_end',
]);

export const CONSENT_LEVELS = new Set(['analytics', 'all']);

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function intInRange(v: unknown, min: number, max: number): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function hostOnly(v: unknown): string | null {
  const s = str(v, LIMITS.maxHost);
  if (!s) return null;
  try {
    // Accept either a full URL or a bare host; store host only (no path/query → no PII leak).
    return new URL(s).host || null;
  } catch {
    return s.replace(/^https?:\/\//i, '').split('/')[0].slice(0, LIMITS.maxHost) || null;
  }
}

function boundedMeta(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object') return null;
  try {
    const json = JSON.stringify(v);
    if (json.length > LIMITS.maxMetaBytes) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export interface CleanEvent {
  type: string;
  path: string | null;
  pageTitle: string | null;
  referrer: string | null;
  target: string | null;
  sectionId: string | null;
  scrollDepth: number | null;
  occurredAt: string;
  meta: Record<string, unknown> | null;
}

export interface CleanBatch {
  sessionId: string;
  consentLevel: 'analytics' | 'all';
  context: {
    path: string | null;
    title: string | null;
    referrerHost: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
  };
  events: CleanEvent[];
}

export function sanitizeBatch(body: any): CleanBatch {
  if (!body || typeof body !== 'object') throw new Error('payload must be an object');

  const sessionId = str(body.sessionId, LIMITS.maxSessionId);
  if (!sessionId) throw new Error('sessionId is required');

  const consentLevel = CONSENT_LEVELS.has(body.consentLevel)
    ? body.consentLevel
    : null;
  if (!consentLevel) throw new Error('valid analytics consent is required');

  if (!Array.isArray(body.events)) throw new Error('events must be an array');
  const rawEvents = body.events.slice(0, LIMITS.maxEventsPerBatch);

  const ctx = body.context ?? {};
  const utm = ctx.utm ?? {};

  const events: CleanEvent[] = [];
  for (const e of rawEvents) {
    if (!e || typeof e !== 'object') continue;
    if (!EVENT_TYPES.has(e.type)) continue;
    events.push({
      type: e.type,
      path: str(e.path, LIMITS.maxStr),
      pageTitle: str(e.pageTitle, LIMITS.maxTitle),
      referrer: hostOnly(e.referrer),
      target: str(e.target, LIMITS.maxStr),
      sectionId: str(e.sectionId, LIMITS.maxSectionId),
      scrollDepth: e.scrollDepth != null ? intInRange(e.scrollDepth, 0, 100) : null,
      occurredAt: isIsoDate(e.occurredAt) ? e.occurredAt : new Date().toISOString(),
      meta: boundedMeta(e.meta),
    });
  }

  return {
    sessionId,
    consentLevel,
    context: {
      path: str(ctx.path, LIMITS.maxStr),
      title: str(ctx.title, LIMITS.maxTitle),
      referrerHost: hostOnly(ctx.referrer),
      utmSource: str(utm.source, 128),
      utmMedium: str(utm.medium, 128),
      utmCampaign: str(utm.campaign, 128),
    },
    events,
  };
}

function isIsoDate(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const t = Date.parse(v);
  return Number.isFinite(t);
}
