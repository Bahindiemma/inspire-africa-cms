/**
 * Guards the community-signup ingest routes. Same shape as
 * `is-analytics-ingest`, but a SEPARATE secret so that a leak of the
 * analytics token (which is sprayed at every page view) can never be
 * replayed against an endpoint that writes PII.
 *
 * The browser never calls these routes directly — the Next.js server
 * holds the secret and proxies. Constant-time compare; fails closed when
 * the secret isn't configured.
 *
 * Attach with: config: { policies: ['global::is-signup-ingest'] }
 */
import { timingSafeEqual } from 'crypto';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export default (policyContext: any, _config: any, { strapi }: any) => {
  const expected = process.env.COMMUNITY_SIGNUP_TOKEN;
  if (!expected) {
    strapi.log.warn(
      '[is-signup-ingest] COMMUNITY_SIGNUP_TOKEN is not set — rejecting all signup ingest requests.'
    );
    return false;
  }

  const h = policyContext.request.header || {};
  const auth = typeof h['authorization'] === 'string' ? h['authorization'] : '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const alt = typeof h['x-signup-token'] === 'string' ? h['x-signup-token'] : null;
  const provided = bearer || alt;

  if (!provided) return false;
  return safeEqual(provided, expected);
};
