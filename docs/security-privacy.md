# Security & Privacy

> Auth + token model, route policies, CSP/CORS, secrets handling, and the
> GDPR/PECR posture of the analytics subsystem.
>
> Last reviewed: 2026-05-27 (commit 262ccc6)

## Contents

- [Authentication & authorisation](#authentication--authorisation)
- [Tokens](#tokens)
- [Policies](#policies)
- [Hardening middlewares](#hardening-middlewares)
- [CSP & CORS](#csp--cors)
- [Body limits](#body-limits)
- [Secrets handling](#secrets-handling)
- [PII storage](#pii-storage)
- [Analytics: GDPR & PECR](#analytics-gdpr--pecr)
- [Known security debt](#known-security-debt)

## Authentication & authorisation

Three caller classes (full grid in [`rbac.md`](./rbac.md),
[`api-reference.md`](./api-reference.md#auth-schemes)):

- **Anonymous visitor** — only `POST /api/form-submissions` (Public role locked
  to `form-submission.create`).
- **Next.js service** — read-only API token for content; a separate ingest
  token for analytics.
- **Editors/admins** — Strapi JWT (7-day, `config/plugins.ts:91-92`), obtained
  by admin login or, when enabled, Keycloak OIDC.

The `form-submission` controller adds a hard `inspire-admin`-only gate on
GET/PUT/DELETE on top of role permissions.

## Tokens

| Token | Type | Storage | Rotation |
|-------|------|---------|----------|
| `nextjs-public` API token | read-only, non-expiring | salted hash in DB; plaintext written once to `.runtime/public-api-token.txt` (mode 0600, git/docker-ignored) | rotate in admin → update `STRAPI_PUBLIC_TOKEN` → revoke old |
| Strapi JWT | 7-day | not persisted (signed with `JWT_SECRET`) | expires; rotate `JWT_SECRET` to invalidate all |
| `ANALYTICS_INGEST_TOKEN` | shared secret | env only | rotate on both web + cms together |
| Keycloak client secret | OIDC | env only | rotate in Keycloak + env |

### Public API token

Auto-created by `src/bootstrap/ensure-public-api-token.ts`. The plaintext file
in `.runtime/` is a convenience for first boot only — treat it as a secret;
prefer setting `STRAPI_PUBLIC_TOKEN` in env. The token is **read-only** and is
the *only* way to read content over the public API (the Public role grants no
reads).

## Policies

`src/policies/`:

- **`is-analytics-ingest`** — constant-time (`crypto.timingSafeEqual`) compare
  of the supplied Bearer/`x-analytics-token` against `ANALYTICS_INGEST_TOKEN`.
  **Fails closed** when the token is unset (rejects all ingest). Length-mismatch
  returns false before the timing-safe compare.
- **`is-public-readable`** — GET/HEAD-only guard (available; not attached to the
  default core routers — access there is via role permissions).

## Hardening middlewares

- **`disable-public-register`** (`src/middlewares/disable-public-register.ts`) —
  403s `POST /admin/register-admin` once any admin exists, so the first-admin
  bootstrap route can't be abused after setup. New admins are added by
  invitation only.
- **`revalidate-frontend`** — outbound only; sends the publish webhook with the
  shared secret as a query param; 5s timeout; failures logged, non-fatal.

## CSP & CORS

`config/middlewares.ts`:

- **CSP** (`strapi::security`): `connect-src 'self' https:`;
  `img-src`/`media-src` allow `'self'`, `data:`, `blob:`,
  `market-assets.strapi.io`, the CDN base (`AWS_CDN_BASE_URL`) and
  `res.cloudinary.com`. `upgradeInsecureRequests` disabled (`null`) — relevant
  when terminating TLS at the host nginx and proxying plain HTTP internally.
- **CORS**: origin **allow-list** from `CORS_ORIGINS`, never `*` — because the
  read-only public token grants access to all published content and must not be
  usable from arbitrary origins. `credentials: true`. Set `CORS_ORIGINS` to the
  exact public site origins.

## Body limits

JSON/form/text bodies capped at **1 MB**; file uploads up to **50 MB**
(`config/middlewares.ts:54-65`). The analytics validator independently caps
batches to 50 events and bounds every string/meta field
(`src/utils/analytics/validate.ts`).

## Secrets handling

- `.env` and `.env.*` are git-ignored (`.gitignore`), with only `.env.example`
  committed. `.runtime/`, `.tmp/`, `dist/`, uploads are ignored too.
- The Dockerfile copies no `.env`; secrets are injected at runtime via the
  compose `environment:` block from `/opt/inspire-africa/.env`.
- All Strapi crypto secrets (`APP_KEYS`, `*_SECRET`, `*_SALT`, `ENCRYPTION_KEY`)
  must be unique, 32+ random bytes — see [`environment.md`](./environment.md).
- Rotation cadence: quarterly for the Strapi secret set; immediately on
  suspected compromise. Rotating `API_TOKEN_SALT` invalidates API tokens;
  rotating `JWT_SECRET`/`ADMIN_JWT_SECRET` invalidates sessions.

## PII storage

| Type | PII | Controls |
|------|-----|----------|
| `candidate` | name/email/phone/resume/portfolio/notes | no public API permission (admin-only); sensitive fields `private` (excluded from API output) |
| `form-submission` | name/email/phone/message/IP/UA/payload | public create-only; admin-only reads; sensitive fields `private`; IP/UA captured server-side, not from the client |
| `analytics-session` | `ipHash` only (already anonymised) | `private`; `content-api: false`; raw IP never stored |

`private: true` fields never appear in REST responses, even for authorised
readers, unless explicitly populated by an admin-context query.

## Analytics: GDPR & PECR

The subsystem is designed to minimise personal data
(`src/api/analytics/...`, `src/utils/analytics/...`):

- **Consent-gated** — a session is created only for `analytics` or `all`
  consent; `necessary`-only batches are rejected by the validator. This aligns
  with PECR/ePrivacy consent for non-essential analytics. *(The consent itself
  is captured on the website front-end; the CMS records the level and acts on
  it.)*
- **No raw IP at rest** — IP is used transiently for offline geo, then a
  salted, truncated (`/24` v4, `/48` v6) SHA-256 hash (32 chars) is stored as
  `ipHash` (private). This is pseudonymisation; treat `ipHash` as low-risk but
  still personal-adjacent.
- **Data minimisation** — referrers reduced to host only; no query strings;
  bounded field lengths; coarse geo (country/region/city) only.
- **Retention** — raw events/sessions purged after
  `ANALYTICS_RETENTION_MONTHS` (default 14); only non-personal daily rollups are
  kept long-term.
- **First-party / offline** — no third-party analytics SDK; geo via bundled
  `geoip-lite`; no external calls from the pipeline.

> `UNVERIFIED:` whether a documented data-subject erasure path exists end-to-end
> (e.g. deleting a visitor's sessions by `ipHash`, or candidate/form-submission
> erasure on request). The data structures support manual deletion via the
> admin; a formal DSAR/erasure runbook is not present in code.

## Known security debt

- The default `ANALYTICS_IP_SALT` fallback (`inspire-africa-CHANGE-ME-salt`) is
  insecure — **always** override it; otherwise hashes are predictable.
- The in-memory rate limiter is per-process (fine for single-instance; would
  need Redis if scaled).
- GHCR package is private; the on-host build fallback is a deployment-time risk
  if host GHCR auth lapses (see [`deployment.md`](./deployment.md)).
- More in [`known-issues.md`](./known-issues.md).
