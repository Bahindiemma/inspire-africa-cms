/**
 * Nightly analytics maintenance:
 *   1. Build the previous day's `analytics-daily-rollup` (idempotent —
 *      upserts by date) so the dashboard reads pre-aggregated counts
 *      instead of scanning raw events.
 *   2. Purge raw events + sessions older than ANALYTICS_RETENTION_MONTHS
 *      (default 14). Rollups are kept for long-term trend reporting.
 *   3. Purge aged community-signup rows on two separate clocks — see
 *      purgeOldCommunitySignups() for why measurement rows and lead rows
 *      must not share a retention window.
 *
 * Wired from config/server.ts `cron.tasks`.
 */
import type { Core } from '@strapi/strapi';

const SESSION_UID = 'api::analytics-session.analytics-session';
const EVENT_UID = 'api::analytics-event.analytics-event';
const ROLLUP_UID = 'api::analytics-daily-rollup.analytics-daily-rollup';
const SIGNUP_UID = 'api::community-signup.community-signup';

const MAX_ROWS = 200000; // safety cap per query for a single day

export async function runAnalyticsMaintenance(strapi: Core.Strapi) {
  try {
    await buildRollupForDate(strapi, dayOffsetUTC(-1)); // yesterday
    await purgeOldData(strapi);
    await purgeOldCommunitySignups(strapi);
    strapi.log.info('[analytics-cron] maintenance complete.');
  } catch (err) {
    strapi.log.error(
      `[analytics-cron] maintenance failed: ${(err as Error).message}`
    );
  }
}

/** Returns a Date at 00:00:00.000 UTC, `days` from today. */
function dayOffsetUTC(days: number): Date {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function bump(map: Record<string, number>, key: string | null | undefined) {
  if (!key) return;
  map[key] = (map[key] || 0) + 1;
}

export async function buildRollupForDate(strapi: Core.Strapi, dayStart: Date) {
  const start = new Date(dayStart);
  const end = new Date(dayStart);
  end.setUTCDate(end.getUTCDate() + 1);
  const dateStr = start.toISOString().slice(0, 10);

  const events = await strapi.db.query(EVENT_UID).findMany({
    where: { occurredAt: { $gte: start, $lt: end } },
    limit: MAX_ROWS,
  });
  const sessions = await strapi.db.query(SESSION_UID).findMany({
    where: { firstSeen: { $gte: start, $lt: end } },
    limit: MAX_ROWS,
  });

  const byPath: Record<string, number> = {};
  const bySection: Record<string, number> = {};
  const scrollDepthBuckets: Record<string, number> = { '25': 0, '50': 0, '75': 0, '100': 0 };
  let pageviews = 0;

  for (const e of events) {
    if (e.type === 'pageview') {
      pageviews += 1;
      bump(byPath, e.path);
    } else if (e.type === 'section_view') {
      bump(bySection, e.sectionId);
    } else if (e.type === 'scroll_depth' && e.scrollDepth != null) {
      const bucket = String(e.scrollDepth);
      if (bucket in scrollDepthBuckets) scrollDepthBuckets[bucket] += 1;
    }
  }

  const byCountry: Record<string, number> = {};
  const byDevice: Record<string, number> = {};
  const byReferrer: Record<string, number> = {};
  let consentAnalytics = 0;
  let consentAll = 0;
  for (const s of sessions) {
    bump(byCountry, s.country);
    bump(byDevice, s.deviceType);
    bump(byReferrer, s.referrerHost);
    if (s.consentLevel === 'all') consentAll += 1;
    else if (s.consentLevel === 'analytics') consentAnalytics += 1;
  }

  const data = {
    date: dateStr,
    sessions: sessions.length,
    pageviews,
    events: events.length,
    byPath,
    byCountry,
    byDevice,
    bySection,
    byReferrer,
    scrollDepthBuckets,
    consentAnalytics,
    consentAll,
  };

  const existing = await strapi.db
    .query(ROLLUP_UID)
    .findOne({ where: { date: dateStr } });
  if (existing) {
    await strapi.db.query(ROLLUP_UID).update({ where: { id: existing.id }, data });
  } else {
    await strapi.db.query(ROLLUP_UID).create({ data });
  }
  strapi.log.info(
    `[analytics-cron] rollup ${dateStr}: ${sessions.length} sessions, ${pageviews} pageviews, ${events.length} events.`
  );
}

async function purgeOldData(strapi: Core.Strapi) {
  const months = parseInt(process.env.ANALYTICS_RETENTION_MONTHS || '14', 10);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - (Number.isFinite(months) ? months : 14));

  // Events first (children), then sessions (parents).
  const delEvents = await strapi.db
    .query(EVENT_UID)
    .deleteMany({ where: { occurredAt: { $lt: cutoff } } });
  const delSessions = await strapi.db
    .query(SESSION_UID)
    .deleteMany({ where: { lastSeen: { $lt: cutoff } } });

  strapi.log.info(
    `[analytics-cron] purge < ${cutoff.toISOString().slice(0, 10)}: removed ${
      (delEvents as any)?.count ?? 0
    } events, ${(delSessions as any)?.count ?? 0} sessions.`
  );
}

/**
 * Community-signup retention. Two different clocks, because the rows hold
 * two very different things:
 *
 *   - Clicked / Spam / Duplicate rows are measurement only (no name, no
 *     email — just an ipHash and a source). They age out on the same
 *     schedule as analytics.
 *   - Submitted / RedirectedToMN / MemberConfirmed rows ARE the lead: real
 *     names, emails and phone numbers held under legitimate interest.
 *     They get a longer, separately-configurable window so a retention
 *     tweak on analytics can never silently bin the CRM.
 *
 * Both windows are documented in the privacy policy — change one, change
 * the other.
 */
/**
 * Delete signups matching `where`, VIA THE DOCUMENT SERVICE.
 *
 * This must not use `strapi.db.query().deleteMany()`. Since the profile
 * layer was added, a signup owns component rows holding an encrypted
 * identity-document number and third-party referee contact details. The
 * query engine deletes only the parent row and leaves those components
 * orphaned in the database forever — so the retention window we publish in
 * the privacy policy would silently not be honoured, and an erasure request
 * would appear to succeed while the PII survived.
 *
 * Verified: deleting via db.query left identity-document and
 * character-reference rows behind; deleting via the Document Service
 * removes them.
 *
 * Batched because the Document Service deletes one document at a time.
 */
async function deleteSignupsWhere(strapi: Core.Strapi, where: any): Promise<number> {
  const BATCH = 200;
  let removed = 0;
  for (;;) {
    const rows = await strapi.db.query(SIGNUP_UID).findMany({
      where,
      select: ['documentId'],
      limit: BATCH,
    });
    if (!rows.length) break;
    for (const r of rows) {
      try {
        await strapi.documents(SIGNUP_UID as any).delete({ documentId: (r as any).documentId });
        removed++;
      } catch (err) {
        strapi.log.warn(
          `[analytics-cron] failed to delete signup ${(r as any).documentId}: ${(err as Error).message}`
        );
      }
    }
    // Fewer than a full batch means we have reached the end.
    if (rows.length < BATCH) break;
  }
  return removed;
}

async function purgeOldCommunitySignups(strapi: Core.Strapi) {
  const monthsBack = (raw: string | undefined, fallback: number) => {
    const n = parseInt(raw || '', 10);
    const months = Number.isFinite(n) ? n : fallback;
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d;
  };

  const clickCutoff = monthsBack(process.env.COMMUNITY_CLICK_RETENTION_MONTHS, 14);
  const leadCutoff = monthsBack(process.env.COMMUNITY_LEAD_RETENTION_MONTHS, 36);

  try {
    const clicks = await deleteSignupsWhere(strapi, {
      status: { $in: ['Clicked', 'Spam', 'Duplicate'] },
      clickedAt: { $lt: clickCutoff },
    });
    const leads = await deleteSignupsWhere(strapi, {
      status: { $in: ['Submitted', 'RedirectedToMN', 'MemberConfirmed'] },
      submittedAt: { $lt: leadCutoff },
    });
    strapi.log.info(
      `[analytics-cron] community-signup purge: removed ${clicks} click rows (< ${clickCutoff
        .toISOString()
        .slice(0, 10)}), ${leads} lead rows (< ${leadCutoff.toISOString().slice(0, 10)}).`
    );
  } catch (err) {
    strapi.log.warn(
      `[analytics-cron] community-signup purge failed: ${(err as Error).message}`
    );
  }
}
