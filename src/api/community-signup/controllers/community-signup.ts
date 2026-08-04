/**
 * Community signup ingest + reporting controller.
 *
 * Three custom routes (all token-gated by global::is-signup-ingest, except
 * `stats` which is admin-JWT gated):
 *
 *   POST /community-signups/track    — a visitor clicked a "Join the
 *                                      Community" CTA. Creates a `Clicked`
 *                                      row. This is the number the business
 *                                      actually asked for, and it is
 *                                      recorded server-side so it does NOT
 *                                      depend on cookie consent or JS.
 *   POST /community-signups/submit   — the visitor gave us their details.
 *                                      Upgrades the row to `Submitted`.
 *   POST /community-signups/redirect — handoff to Mighty Networks happened.
 *   GET  /community-signups/stats    — admin-only funnel numbers.
 *
 * The core CRUD verbs are additionally guarded by requireAdmin() below, so
 * even a mis-seeded users-permissions role cannot read the PII.
 *
 * Privacy: raw IP is never stored (salted hash only, same helper the
 * analytics module uses). Every identity attribute is `private` in the
 * schema, so it is excluded from content-API responses.
 */
import { factories } from '@strapi/strapi';
import { clientIpFrom, hashIp } from '../../../utils/analytics/ip';
import { parseUa } from '../../../utils/analytics/ua';
import { allow } from '../../../utils/analytics/rate-limit';
import { sanitizeClick, sanitizeSignup } from '../../../utils/community/validate';
import { sanitizeProfile, scoreCompleteness } from '../../../utils/community/profile';
import { isPiiEncryptionConfigured } from '../../../utils/community/crypto';
import { randomBytes } from 'crypto';
import {
  hashPassword,
  isPasswordEnabled,
  passwordProblem,
} from '../../../utils/community/password';

const UID = 'api::community-signup.community-signup';

/**
 * A visitor who refreshes /join/start, or opens it in three tabs, is one
 * click — not three. Within this window we fold repeat clicks from the
 * same anonymised IP + source into the existing row and bump `attempts`.
 */
const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

function ipSalt(): string {
  return process.env.ANALYTICS_IP_SALT || 'inspire-africa-CHANGE-ME-salt';
}

/**
 * Drop null/undefined/'' keys so an UPDATE can never erase data we already
 * hold. A visitor who comes back and submits the form without re-typing
 * their country must not have the country we captured last time wiped —
 * and the attribution captured at click time (source, utm, landingPath)
 * must survive a submit payload that doesn't repeat it.
 *
 * Booleans and explicit lifecycle fields are applied separately by the
 * caller, because `false` is a meaningful value (marketing opt-OUT) and
 * would be stripped by a truthiness check.
 */
function keepExisting<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== '') out[k] = v;
  }
  return out as Partial<T>;
}

/** Shared request enrichment. Never trusts client-supplied IP/UA. */
function enrich(ctx: any) {
  const ip = clientIpFrom(ctx);
  const ipHash = hashIp(ip, ipSalt());
  const uaString = ctx.request.header['user-agent'] ?? null;
  const { deviceType, botScore } = parseUa(uaString);
  return {
    ipHash,
    userAgent: uaString ? String(uaString).slice(0, 512) : null,
    deviceType,
    botScore,
  };
}

export default factories.createCoreController(UID, ({ strapi }) => ({
  /* ------------------------------------------------------------------ *
   * POST /community-signups/track
   * ------------------------------------------------------------------ */
  async track(ctx: any) {
    let click;
    try {
      click = sanitizeClick(ctx.request.body);
    } catch (err) {
      ctx.status = 400;
      ctx.body = { error: (err as Error).message };
      return;
    }

    const { ipHash, userAgent, deviceType, botScore } = enrich(ctx);

    // Tighter than analytics: this route writes a row per call.
    if (ipHash && !allow(`signup-track:${ipHash}`, 30, 15)) {
      ctx.status = 429;
      ctx.body = { error: 'rate_limited' };
      return;
    }

    const repo = strapi.db.query(UID);
    const now = new Date();

    try {
      // Fold a refresh / second tab into the existing click.
      if (ipHash) {
        const recent = await repo.findOne({
          where: {
            ipHash,
            source: click.source,
            status: 'Clicked',
            clickedAt: { $gte: new Date(now.getTime() - DEDUPE_WINDOW_MS) },
          },
          orderBy: { clickedAt: 'desc' },
        });
        if (recent) {
          await repo.update({
            where: { id: recent.id },
            data: { attempts: (recent.attempts || 1) + 1 },
          });
          ctx.status = 200;
          ctx.body = { clickId: recent.clickId, deduped: true };
          return;
        }
      }

      await repo.create({
        data: {
          clickId: click.clickId,
          status: 'Clicked',
          source: click.source,
          utmSource: click.utmSource,
          utmMedium: click.utmMedium,
          utmCampaign: click.utmCampaign,
          referrerHost: click.referrerHost,
          landingPath: click.landingPath,
          attempts: 1,
          clickedAt: now,
          ipHash,
          userAgent,
          deviceType,
          botScore,
        },
      });
      ctx.status = 200;
      ctx.body = { clickId: click.clickId, deduped: false };
    } catch (err) {
      // A click we failed to log must never block the visitor's journey.
      strapi.log.warn(`[community-signup.track] ${(err as Error).message}`);
      ctx.status = 200;
      ctx.body = { clickId: click.clickId, deduped: false, persisted: false };
    }
  },

  /* ------------------------------------------------------------------ *
   * POST /community-signups/submit
   * ------------------------------------------------------------------ */
  async submit(ctx: any) {
    let signup;
    try {
      signup = sanitizeSignup(ctx.request.body);
    } catch (err) {
      ctx.status = 400;
      ctx.body = { error: (err as Error).message };
      return;
    }

    const { ipHash, userAgent, deviceType, botScore } = enrich(ctx);

    if (ipHash && !allow(`signup-submit:${ipHash}`, 10, 5)) {
      ctx.status = 429;
      ctx.body = { error: 'rate_limited' };
      return;
    }

    const repo = strapi.db.query(UID);
    const now = new Date();

    // Honeypot: a hidden input a human never sees and never fills.
    // Record it as Spam (so we can measure bot pressure) and return the
    // SAME success shape a human gets — never tell a bot it was caught.
    if (signup.trap) {
      try {
        await repo.create({
          data: {
            clickId: signup.clickId,
            status: 'Spam',
            source: signup.source,
            clickedAt: now,
            submittedAt: now,
            ipHash,
            userAgent,
            deviceType,
            botScore: Math.max(botScore, 1),
          },
        });
      } catch {
        /* a spam row we failed to write is not worth an error path */
      }
      ctx.status = 200;
      ctx.body = { ok: true };
      return;
    }

    let passwordHash: string | null = null;
    if (isPasswordEnabled() && signup.password) {
      const problem = passwordProblem(signup.password);
      if (problem) {
        ctx.status = 400;
        ctx.body = { error: problem, field: 'password' };
        return;
      }
      passwordHash = hashPassword(signup.password);
    }

    // Nullable fields go through keepExisting() so a sparse resubmission
    // never erases what we already captured (notably the click-time
    // attribution, which the submit payload does not repeat).
    const optional = keepExisting({
      email: signup.email,
      firstName: signup.firstName,
      lastName: signup.lastName,
      phone: signup.phone,
      country: signup.country,
      source: signup.source,
      utmSource: signup.utmSource,
      utmMedium: signup.utmMedium,
      utmCampaign: signup.utmCampaign,
      referrerHost: signup.referrerHost,
      landingPath: signup.landingPath,
      ipHash,
      userAgent,
      passwordHash,
    });

    // Always applied: booleans (false is meaningful), lifecycle, telemetry.
    const data: Record<string, unknown> = {
      ...optional,
      status: 'Submitted',
      consentTerms: signup.consentTerms,
      consentMarketing: signup.consentMarketing,
      consentRecordedAt: now,
      submittedAt: now,
      deviceType,
      botScore,
    };

    try {
      // Resolve by email first — one lead per person, however many times
      // they come back. Done with an explicit lookup rather than a unique
      // index so a repeat submission is an UPDATE, not a 500 the visitor
      // sees. Deliberately returns the same response either way: telling
      // an unauthenticated caller "that email already exists" is account
      // enumeration.
      const byEmail = await repo.findOne({ where: { email: signup.email } });
      const byClick = await repo.findOne({ where: { clickId: signup.clickId } });

      if (byEmail) {
        await repo.update({
          where: { id: byEmail.id },
          data: {
            ...data,
            // Don't regress a confirmed member back to Submitted.
            status:
              byEmail.status === 'MemberConfirmed' ? 'MemberConfirmed' : 'Submitted',
            attempts: (byEmail.attempts || 1) + 1,
            // First touch wins for attribution: the campaign that actually
            // earned this lead is the one that brought them in the first
            // time, not whichever page they happened to resubmit from.
            source: byEmail.source ?? signup.source,
            utmSource: byEmail.utmSource ?? signup.utmSource,
            utmMedium: byEmail.utmMedium ?? signup.utmMedium,
            utmCampaign: byEmail.utmCampaign ?? signup.utmCampaign,
            referrerHost: byEmail.referrerHost ?? signup.referrerHost,
            landingPath: byEmail.landingPath ?? signup.landingPath,
            clickedAt: byEmail.clickedAt ?? now,
          },
        });
        // The click row this visit created is now redundant.
        if (byClick && byClick.id !== byEmail.id) {
          await repo.update({
            where: { id: byClick.id },
            data: { status: 'Duplicate' },
          });
        }
        ctx.status = 200;
        ctx.body = { ok: true, clickId: byEmail.clickId };
        return;
      }

      if (byClick) {
        await repo.update({
          where: { id: byClick.id },
          data: { ...data, clickedAt: byClick.clickedAt ?? now },
        });
        ctx.status = 200;
        ctx.body = { ok: true, clickId: byClick.clickId };
        return;
      }

      await repo.create({
        data: { ...data, clickId: signup.clickId, clickedAt: now, attempts: 1 },
      });
      ctx.status = 200;
      ctx.body = { ok: true, clickId: signup.clickId };
    } catch (err) {
      // Unlike analytics, we do NOT silently swallow: the caller decides
      // whether to warn the visitor. We still never log the payload.
      strapi.log.error(
        `[community-signup.submit] persist failed: ${(err as Error).message}`
      );
      ctx.status = 500;
      ctx.body = { error: 'persist_failed' };
    }
  },

  /* ------------------------------------------------------------------ *
   * POST /community/profile
   *
   * Wizard steps 2+ (Andrew items 1-6, 8). Step 1 already wrote a
   * `Submitted` lead, so everything here is additive: a visitor who
   * abandons at step 3 is still a captured lead, not a lost one.
   *
   * Identified by `resumeToken` (issued on first profile save) or by
   * clickId. Deliberately NOT by email alone — that would let anyone who
   * knows an address overwrite that person's profile.
   * ------------------------------------------------------------------ */
  async profile(ctx: any) {
    // Fail closed: identity numbers must never land in the DB unencrypted.
    if (!isPiiEncryptionConfigured()) {
      strapi.log.error('[community-signup.profile] COMMUNITY_PII_KEY not configured — refusing profile writes.');
      ctx.status = 503;
      ctx.body = { error: 'profile_capture_unavailable' };
      return;
    }

    const clickId = typeof ctx.request.body?.clickId === 'string'
      ? ctx.request.body.clickId.slice(0, 64) : null;
    const resumeToken = typeof ctx.request.body?.resumeToken === 'string'
      ? ctx.request.body.resumeToken.slice(0, 64) : null;
    if (!clickId && !resumeToken) {
      ctx.status = 400;
      ctx.body = { error: 'clickId or resumeToken is required' };
      return;
    }

    let clean;
    try {
      clean = sanitizeProfile(ctx.request.body);
    } catch (err) {
      ctx.status = 400;
      ctx.body = { error: (err as Error).message };
      return;
    }

    const { ipHash } = enrich(ctx);
    if (ipHash && !allow(`signup-profile:${ipHash}`, 30, 15)) {
      ctx.status = 429;
      ctx.body = { error: 'rate_limited' };
      return;
    }

    const step = Math.min(6, Math.max(1, Number(ctx.request.body?.step) || 2));
    const repo = strapi.db.query(UID);
    const now = new Date();

    try {
      // Components MUST be populated here. scoreCompleteness() runs against
      // the merged row, so an unpopulated fetch would count only the lists in
      // the current request and silently under-report everything saved in
      // earlier steps — the score would go DOWN as the profile filled up.
      const populate = [
        'identityDocuments',
        'contactPoints',
        'qualifications',
        'workExperiences',
        'languageCompetencies',
        'characterReferences',
      ];
      const row = resumeToken
        ? await repo.findOne({ where: { resumeToken }, populate })
        : await repo.findOne({ where: { clickId }, populate });

      if (!row) {
        ctx.status = 404;
        ctx.body = { error: 'signup_not_found' };
        return;
      }
      if (resumeToken && row.resumeTokenExpiresAt && new Date(row.resumeTokenExpiresAt) < now) {
        ctx.status = 410;
        ctx.body = { error: 'resume_token_expired' };
        return;
      }

      // Lists are REPLACED per step, not appended — the wizard always submits
      // the full current list for the step being saved, so appending would
      // duplicate every entry on each re-save. Untouched lists are omitted by
      // the client and preserved by keepExisting() below.
      const lists = keepExisting({
        identityDocuments: clean.identityDocuments.length ? clean.identityDocuments : null,
        contactPoints: clean.contactPoints.length ? clean.contactPoints : null,
        qualifications: clean.qualifications.length ? clean.qualifications : null,
        workExperiences: clean.workExperiences.length ? clean.workExperiences : null,
        languageCompetencies: clean.languageCompetencies.length ? clean.languageCompetencies : null,
        characterReferences: clean.characterReferences.length ? clean.characterReferences : null,
      });

      const scalars = keepExisting({
        otherNames: clean.otherNames,
        dateOfBirth: clean.dateOfBirth,
        residentialAddress: clean.residentialAddress,
      });

      const token = row.resumeToken || randomBytes(24).toString('hex');
      const merged = { ...row, ...scalars, ...lists };

      // Document Service, NOT strapi.db.query — the query engine operates at
      // the database layer and does not know how to write component arrays.
      // The rest of this controller uses db.query because it only touches
      // scalars; this handler is the one that writes components.
      await strapi.documents(UID).update({
        documentId: row.documentId,
        data: {
          ...scalars,
          ...lists,
          profileStep: Math.max(row.profileStep || 1, step),
          profileCompleteness: scoreCompleteness(merged),
          profileUpdatedAt: now,
          resumeToken: token,
          // 30 days: long enough to come back after a job or a data bundle,
          // short enough that a leaked link does not stay live indefinitely.
          resumeTokenExpiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        } as any,
      });

      ctx.status = 200;
      ctx.body = {
        ok: true,
        resumeToken: token,
        profileStep: Math.max(row.profileStep || 1, step),
        profileCompleteness: scoreCompleteness(merged),
      };
    } catch (err) {
      strapi.log.error(`[community-signup.profile] persist failed: ${(err as Error).message}`);
      ctx.status = 500;
      ctx.body = { error: 'persist_failed' };
    }
  },

  /* ------------------------------------------------------------------ *
   * POST /community-signups/redirect
   * ------------------------------------------------------------------ */
  async redirect(ctx: any) {
    const clickId =
      typeof ctx.request.body?.clickId === 'string'
        ? ctx.request.body.clickId.slice(0, 64)
        : null;
    if (!clickId) {
      ctx.status = 400;
      ctx.body = { error: 'clickId is required' };
      return;
    }
    try {
      const repo = strapi.db.query(UID);
      const row = await repo.findOne({ where: { clickId } });
      if (row && row.status !== 'MemberConfirmed') {
        await repo.update({
          where: { id: row.id },
          data: { status: 'RedirectedToMN', redirectedAt: new Date() },
        });
      }
    } catch (err) {
      strapi.log.warn(`[community-signup.redirect] ${(err as Error).message}`);
    }
    ctx.status = 204;
    ctx.body = null;
  },

  /* ------------------------------------------------------------------ *
   * GET /community-signups/stats?days=30   (admin only)
   * ------------------------------------------------------------------ */
  async stats(ctx: any) {
    // No requireAdmin() here: the route is `auth: false` + is-signup-ingest,
    // so ctx.state.user is never populated and a role check would reject
    // every caller. The shared secret IS the gate. Safe because the select
    // below returns aggregate, non-identifying columns only — keep it that
    // way; adding email/phone to the select would leak PII past this route.
    const days = Math.min(365, Math.max(1, Number(ctx.query.days) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const repo = strapi.db.query(UID);

    // Volumes here are leads, not pageviews — on-demand aggregation is
    // correct at this scale. If this ever exceeds ~100k rows, move it to a
    // nightly rollup like analytics-daily-rollup.
    const rows = await repo.findMany({
      where: { clickedAt: { $gte: since } },
      select: ['status', 'source', 'utmCampaign', 'clickedAt', 'botScore'],
      limit: 100000,
    });

    const human = rows.filter((r: any) => (r.botScore ?? 0) < 1 && r.status !== 'Spam');
    const captured = human.filter((r: any) =>
      ['Submitted', 'RedirectedToMN', 'MemberConfirmed'].includes(r.status)
    );

    const by = (key: string, list: any[]) =>
      list.reduce((acc: Record<string, number>, r: any) => {
        const k = r[key] || 'unknown';
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});

    ctx.body = {
      windowDays: days,
      clicks: human.length,
      captured: captured.length,
      conversionRate: human.length
        ? Number(((captured.length / human.length) * 100).toFixed(1))
        : 0,
      redirected: human.filter((r: any) =>
        ['RedirectedToMN', 'MemberConfirmed'].includes(r.status)
      ).length,
      memberConfirmed: human.filter((r: any) => r.status === 'MemberConfirmed').length,
      botsExcluded: rows.length - human.length,
      clicksBySource: by('source', human),
      capturedBySource: by('source', captured),
      capturedByCampaign: by('utmCampaign', captured),
    };
  },

  /* ---------------------- core verbs: admin only --------------------- */
  async find(ctx: any) {
    requireAdmin(ctx);
    return await super.find(ctx);
  },
  async findOne(ctx: any) {
    requireAdmin(ctx);
    return await super.findOne(ctx);
  },
  async create(ctx: any) {
    requireAdmin(ctx);
    return await super.create(ctx);
  },
  async update(ctx: any) {
    requireAdmin(ctx);
    return await super.update(ctx);
  },
  async delete(ctx: any) {
    requireAdmin(ctx);
    return await super.delete(ctx);
  },
}));

function requireAdmin(ctx: any) {
  const roleType = ctx.state.user?.role?.type;
  if (roleType !== 'inspire-admin') {
    ctx.throw(403, 'Community signups are restricted to inspire-admin role.');
  }
}
