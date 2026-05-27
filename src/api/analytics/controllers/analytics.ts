/**
 * Analytics ingest controller.
 *
 * POST /api/analytics/collect — receives a batch of events from the
 * Next.js server-side proxy (token-gated by global::is-analytics-ingest).
 * Pipeline:
 *   1. Sanitise / cap the untrusted payload.
 *   2. Derive coarse geo from the forwarded client IP, then HASH the IP
 *      (salted, truncated) and discard the raw value — no PII at rest.
 *   3. Parse the UA server-side (device/browser/os + bot score).
 *   4. Rate-limit per ipHash.
 *   5. Upsert the session, bulk-insert the events.
 * Always returns 204 quickly; never blocks the visitor.
 */
import { sanitizeBatch } from '../../../utils/analytics/validate';
import { clientIpFrom, hashIp } from '../../../utils/analytics/ip';
import { lookupGeo } from '../../../utils/analytics/geo';
import { parseUa } from '../../../utils/analytics/ua';
import { allow } from '../../../utils/analytics/rate-limit';

const SESSION_UID = 'api::analytics-session.analytics-session';
const EVENT_UID = 'api::analytics-event.analytics-event';

export default {
  async collect(ctx: any) {
    let batch;
    try {
      batch = sanitizeBatch(ctx.request.body);
    } catch (err) {
      ctx.status = 400;
      ctx.body = { error: (err as Error).message };
      return;
    }

    const ip = clientIpFrom(ctx);
    const salt =
      process.env.ANALYTICS_IP_SALT || 'inspire-africa-CHANGE-ME-salt';
    const ipHash = hashIp(ip, salt);

    // Rate limit per anonymised IP (240/min sustained, burst 120).
    if (ipHash && !allow(`collect:${ipHash}`, 240, 120)) {
      ctx.status = 429;
      ctx.body = { error: 'rate_limited' };
      return;
    }

    const uaString = ctx.request.header['user-agent'] ?? null;
    const { deviceType, browser, os, botScore } = parseUa(uaString);
    const geo = lookupGeo(ip); // uses raw IP transiently; not stored

    const now = new Date();
    const sessionRepo = strapi.db.query(SESSION_UID);
    const eventRepo = strapi.db.query(EVENT_UID);

    const pageviews = batch.events.filter((e) => e.type === 'pageview').length;
    const firstPath = batch.context.path ?? batch.events[0]?.path ?? null;
    const lastPath =
      batch.events[batch.events.length - 1]?.path ?? batch.context.path ?? null;

    try {
      let session = await sessionRepo.findOne({
        where: { sessionId: batch.sessionId },
      });

      if (!session) {
        session = await sessionRepo.create({
          data: {
            sessionId: batch.sessionId,
            firstSeen: now,
            lastSeen: now,
            pageviewCount: pageviews,
            eventCount: batch.events.length,
            entryPath: firstPath,
            exitPath: lastPath,
            referrerHost: batch.context.referrerHost,
            utmSource: batch.context.utmSource,
            utmMedium: batch.context.utmMedium,
            utmCampaign: batch.context.utmCampaign,
            country: geo.country,
            region: geo.region,
            city: geo.city,
            deviceType,
            browser,
            os,
            consentLevel: batch.consentLevel,
            botScore,
            ipHash,
          },
        });
      } else {
        await sessionRepo.update({
          where: { id: session.id },
          data: {
            lastSeen: now,
            pageviewCount: (session.pageviewCount || 0) + pageviews,
            eventCount: (session.eventCount || 0) + batch.events.length,
            exitPath: lastPath ?? session.exitPath,
            consentLevel: batch.consentLevel,
          },
        });
      }

      for (const e of batch.events) {
        await eventRepo.create({
          data: {
            type: e.type,
            path: e.path,
            pageTitle: e.pageTitle,
            referrer: e.referrer,
            target: e.target,
            sectionId: e.sectionId,
            scrollDepth: e.scrollDepth,
            occurredAt: e.occurredAt,
            meta: e.meta,
            session: session.id,
          },
        });
      }
    } catch (err) {
      strapi.log.warn(
        `[analytics.collect] failed to persist batch: ${(err as Error).message}`
      );
      // Swallow — analytics must never surface errors to visitors.
    }

    ctx.status = 204;
    ctx.body = null;
  },
};
