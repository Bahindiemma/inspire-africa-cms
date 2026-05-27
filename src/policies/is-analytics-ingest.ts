/**
 * Guards the public analytics ingest route. The browser never calls this
 * directly — the Next.js server-side proxy forwards batches with a shared
 * secret in the Authorization header (or x-analytics-token). We compare in
 * constant time. If the secret isn't configured, we fail closed.
 *
 * Attach with: config: { policies: ['global::is-analytics-ingest'] }
 */
import { timingSafeEqual } from 'crypto';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export default (policyContext: any, _config: any, { strapi }: any) => {
  const expected = process.env.ANALYTICS_INGEST_TOKEN;
  if (!expected) {
    strapi.log.warn(
      '[is-analytics-ingest] ANALYTICS_INGEST_TOKEN is not set — rejecting all ingest requests.'
    );
    return false;
  }

  const h = policyContext.request.header || {};
  const auth = typeof h['authorization'] === 'string' ? h['authorization'] : '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const alt = typeof h['x-analytics-token'] === 'string' ? h['x-analytics-token'] : null;
  const provided = bearer || alt;

  if (!provided) return false;
  return safeEqual(provided, expected);
};
