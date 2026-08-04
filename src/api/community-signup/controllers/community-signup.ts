/**
 * Community signup ingest + reporting controller.
 *
 * Signup captures NAME, EMAIL and REGISTRANT TYPE only, and every registrant
 * must confirm their email address before they reach the community.
 *
 * Routes (all token-gated by global::is-signup-ingest):
 *   POST /community/track    — a visitor clicked a "Join the Community" CTA.
 *                              Creates a `Clicked` row. Recorded server-side,
 *                              so it does NOT depend on cookie consent or JS.
 *   POST /community/submit   — details given. Row → `Submitted`, verification
 *                              email sent.
 *   POST /community/verify   — the emailed token is presented. Row → `Verified`.
 *   POST /community/resend   — re-send the verification email (capped).
 *   POST /community/redirect — handoff to Mighty Networks happened.
 *   GET  /community/stats    — aggregate funnel numbers, no PII.
 *
 * The core CRUD verbs are additionally guarded by requireAdmin(), so even a
 * mis-seeded users-permissions role cannot read the PII.
 *
 * Privacy: the raw IP is never stored (salted hash only, same helper the
 * analytics module uses), and the verification token is stored only as a
 * SHA-256 hash.
 */
import { factories } from '@strapi/strapi';
import { clientIpFrom, hashIp } from '../../../utils/analytics/ip';
import { parseUa } from '../../../utils/analytics/ua';
import { allow } from '../../../utils/analytics/rate-limit';
import { sanitizeClick, sanitizeSignup } from '../../../utils/community/validate';
import {
  newToken,
  hashToken,
  tokenMatches,
  expiryFrom,
  verificationEmail,
  MAX_SENDS,
} from '../../../utils/community/verification';

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
 * hold — notably the attribution captured at click time, which the submit
 * payload does not repeat. Booleans and lifecycle fields are applied
 * separately by the caller, because `false` is meaningful.
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

function siteBase(): string {
  return (process.env.FRONTEND_BASE_URL || 'https://inspireafricans.com').replace(/\/+$/, '');
}

/**
 * Send the verification email. Returns whether it was accepted for delivery.
 *
 * NOT fire-and-forget, unlike the form-submission notification: this email is
 * the only route to the community, so a silent failure would strand the
 * registrant forever. The caller reports the outcome so the website can tell
 * the visitor to try again rather than showing "check your inbox" for an
 * email that was never sent.
 */
async function sendVerification(
  strapi: any,
  row: { email: string; firstName: string | null },
  token: string
): Promise<boolean> {
  const verifyUrl = `${siteBase()}/join/verify?token=${encodeURIComponent(token)}`;
  const mail = verificationEmail({
    firstName: row.firstName,
    verifyUrl,
    siteName: 'INSPIRE AFRICA',
  });
  // Cap the SMTP round-trip. A relay that accepts the TCP connection and then
  // stalls would otherwise hold the HTTP request open until the caller's own
  // timeout fires, which makes a successful signup look like a failure to the
  // visitor. Better to give up, report it, and let them resend.
  const SEND_TIMEOUT_MS = 12000;

  try {
    await Promise.race([
      strapi.plugin('email').service('email').send({
        to: row.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`send timed out after ${SEND_TIMEOUT_MS}ms`)), SEND_TIMEOUT_MS)
      ),
    ]);
    return true;
  } catch (err) {
    strapi.log.error(
      `[community-signup] verification email failed: ${(err as Error).message}`
    );
    return false;
  }
}

export default factories.createCoreController(UID, ({ strapi }) => ({
  /* ------------------------------------------------------------------ *
   * POST /community/track
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
   * POST /community/submit
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

    // Honeypot: a hidden input a human never sees and never fills. Record it
    // as Spam and return the SAME shape a human gets — never tell a bot it
    // was caught, and never send it an email.
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
      ctx.body = { ok: true, verificationSent: true };
      return;
    }

    const optional = keepExisting({
      email: signup.email,
      firstName: signup.firstName,
      lastName: signup.lastName,
      source: signup.source,
      utmSource: signup.utmSource,
      utmMedium: signup.utmMedium,
      utmCampaign: signup.utmCampaign,
      referrerHost: signup.referrerHost,
      landingPath: signup.landingPath,
      ipHash,
      userAgent,
    });

    const token = newToken();
    const data: Record<string, unknown> = {
      ...optional,
      status: 'Submitted',
      registrantType: signup.registrantType,
      consentTerms: signup.consentTerms,
      consentMarketing: signup.consentMarketing,
      consentRecordedAt: now,
      submittedAt: now,
      deviceType,
      botScore,
      emailVerified: false,
      verificationTokenHash: hashToken(token),
      verificationSentAt: now,
      verificationExpiresAt: expiryFrom(now),
    };

    try {
      // One lead per email, resolved by lookup rather than a unique index so
      // a repeat submission is an UPDATE and not a 500 the visitor sees. The
      // response is identical either way: telling an unauthenticated caller
      // "that email already exists" is account enumeration.
      const byEmail = await repo.findOne({ where: { email: signup.email } });
      const byClick = await repo.findOne({ where: { clickId: signup.clickId } });
      const target = byEmail || byClick;

      // Someone who already verified should not be reset to unverified by
      // filling the form in again.
      const alreadyVerified = !!target?.emailVerified;

      if (target) {
        await repo.update({
          where: { id: target.id },
          data: {
            ...data,
            status: alreadyVerified ? target.status : 'Submitted',
            emailVerified: alreadyVerified,
            emailVerifiedAt: alreadyVerified ? target.emailVerifiedAt : null,
            attempts: (target.attempts || 1) + 1,
            // First touch wins for attribution.
            source: target.source ?? signup.source,
            utmSource: target.utmSource ?? signup.utmSource,
            utmMedium: target.utmMedium ?? signup.utmMedium,
            utmCampaign: target.utmCampaign ?? signup.utmCampaign,
            clickedAt: target.clickedAt ?? now,
            verificationSendCount: (target.verificationSendCount || 0) + 1,
          },
        });
        if (byEmail && byClick && byClick.id !== byEmail.id) {
          await repo.update({ where: { id: byClick.id }, data: { status: 'Duplicate' } });
        }
      } else {
        await repo.create({
          data: { ...data, clickId: signup.clickId, clickedAt: now, attempts: 1, verificationSendCount: 1 },
        });
      }

      const sent = alreadyVerified
        ? true
        : await sendVerification(
            strapi,
            { email: signup.email, firstName: signup.firstName },
            token
          );

      ctx.status = 200;
      ctx.body = {
        ok: true,
        clickId: (target || {}).clickId || signup.clickId,
        alreadyVerified,
        verificationSent: sent,
      };
    } catch (err) {
      strapi.log.error(
        `[community-signup.submit] persist failed: ${(err as Error).message}`
      );
      ctx.status = 500;
      ctx.body = { error: 'persist_failed' };
    }
  },

  /* ------------------------------------------------------------------ *
   * POST /community/verify
   * ------------------------------------------------------------------ */
  async verify(ctx: any) {
    const token = typeof ctx.request.body?.token === 'string'
      ? ctx.request.body.token.slice(0, 128)
      : null;
    if (!token) {
      ctx.status = 400;
      ctx.body = { error: 'token_required' };
      return;
    }

    const { ipHash } = enrich(ctx);
    // Tight: this endpoint is the only thing standing between a guessed token
    // and a verified account.
    if (ipHash && !allow(`signup-verify:${ipHash}`, 20, 10)) {
      ctx.status = 429;
      ctx.body = { error: 'rate_limited' };
      return;
    }

    const repo = strapi.db.query(UID);
    const now = new Date();

    try {
      // Look up BY HASH — the plaintext token is never stored, so this is the
      // only way to find the row, and it is an indexed exact match.
      const row = await repo.findOne({ where: { verificationTokenHash: hashToken(token) } });
      if (!row || !tokenMatches(token, row.verificationTokenHash)) {
        ctx.status = 404;
        ctx.body = { error: 'invalid_token' };
        return;
      }
      if (row.emailVerified) {
        // Idempotent: clicking the link twice is a success, not an error.
        ctx.status = 200;
        ctx.body = { ok: true, alreadyVerified: true, clickId: row.clickId };
        return;
      }
      if (row.verificationExpiresAt && new Date(row.verificationExpiresAt) < now) {
        ctx.status = 410;
        ctx.body = { error: 'token_expired', clickId: row.clickId };
        return;
      }

      await repo.update({
        where: { id: row.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: now,
          status: row.status === 'RedirectedToMN' ? row.status : 'Verified',
          // The token hash is deliberately KEPT, not burned. People re-open
          // confirmation emails, and a second click should take them to the
          // community rather than "we couldn't match that link". The
          // emailVerified check above makes the repeat a no-op, so replay
          // achieves nothing an attacker would want — the address is already
          // confirmed either way.
        },
      });

      ctx.status = 200;
      ctx.body = { ok: true, alreadyVerified: false, clickId: row.clickId };
    } catch (err) {
      strapi.log.error(`[community-signup.verify] ${(err as Error).message}`);
      ctx.status = 500;
      ctx.body = { error: 'verify_failed' };
    }
  },

  /* ------------------------------------------------------------------ *
   * POST /community/resend
   * ------------------------------------------------------------------ */
  async resend(ctx: any) {
    const clickId = typeof ctx.request.body?.clickId === 'string'
      ? ctx.request.body.clickId.slice(0, 64)
      : null;
    if (!clickId) {
      ctx.status = 400;
      ctx.body = { error: 'clickId_required' };
      return;
    }

    const { ipHash } = enrich(ctx);
    if (ipHash && !allow(`signup-resend:${ipHash}`, 5, 3)) {
      ctx.status = 429;
      ctx.body = { error: 'rate_limited' };
      return;
    }

    const repo = strapi.db.query(UID);
    const now = new Date();

    try {
      const row = await repo.findOne({ where: { clickId } });
      // Always answer the same way. A caller must not be able to probe which
      // clickIds exist, or which addresses are already verified.
      const generic = { ok: true };

      if (!row || !row.email || row.emailVerified) {
        ctx.status = 200;
        ctx.body = generic;
        return;
      }
      if ((row.verificationSendCount || 0) >= MAX_SENDS) {
        ctx.status = 200;
        ctx.body = { ...generic, capped: true };
        return;
      }

      const token = newToken();
      await repo.update({
        where: { id: row.id },
        data: {
          verificationTokenHash: hashToken(token),
          verificationSentAt: now,
          verificationExpiresAt: expiryFrom(now),
          verificationSendCount: (row.verificationSendCount || 0) + 1,
        },
      });
      await sendVerification(strapi, { email: row.email, firstName: row.firstName }, token);

      ctx.status = 200;
      ctx.body = generic;
    } catch (err) {
      strapi.log.error(`[community-signup.resend] ${(err as Error).message}`);
      ctx.status = 200;
      ctx.body = { ok: true };
    }
  },

  /* ------------------------------------------------------------------ *
   * POST /community/redirect
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
   * GET /community/stats?days=30
   * ------------------------------------------------------------------ */
  async stats(ctx: any) {
    // No requireAdmin(): the route is `auth: false` + is-signup-ingest, so
    // ctx.state.user is never populated and a role check would reject every
    // caller. The shared secret IS the gate. Safe because the select below
    // returns aggregate, non-identifying columns only — keep it that way.
    const days = Math.min(365, Math.max(1, Number(ctx.query.days) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const repo = strapi.db.query(UID);

    const rows = await repo.findMany({
      where: { clickedAt: { $gte: since } },
      select: ['status', 'source', 'utmCampaign', 'registrantType', 'clickedAt', 'botScore', 'emailVerified'],
      limit: 100000,
    });

    const human = rows.filter((r: any) => (r.botScore ?? 0) < 1 && r.status !== 'Spam');
    const captured = human.filter((r: any) =>
      ['Submitted', 'Verified', 'RedirectedToMN', 'MemberConfirmed'].includes(r.status)
    );
    const verified = human.filter((r: any) => r.emailVerified);

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
      verified: verified.length,
      conversionRate: human.length
        ? Number(((captured.length / human.length) * 100).toFixed(1))
        : 0,
      verificationRate: captured.length
        ? Number(((verified.length / captured.length) * 100).toFixed(1))
        : 0,
      redirected: human.filter((r: any) =>
        ['RedirectedToMN', 'MemberConfirmed'].includes(r.status)
      ).length,
      memberConfirmed: human.filter((r: any) => r.status === 'MemberConfirmed').length,
      botsExcluded: rows.length - human.length,
      clicksBySource: by('source', human),
      capturedBySource: by('source', captured),
      capturedByType: by('registrantType', captured),
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
