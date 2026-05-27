# API Reference

> The CMS HTTP surface: content API per type (incl. blocked/admin-only), the
> custom analytics ingest endpoint, the Keycloak OIDC routes, auth schemes,
> examples and status codes.
>
> Last reviewed: 2026-05-27 (commit 262ccc6)

For payload-shape examples of the public content endpoints, also see the
pre-existing [`api-contract.md`](./api-contract.md).

## Contents

- [Auth schemes](#auth-schemes)
- [Content API by type](#content-api-by-type)
- [Forms: POST /api/form-submissions](#forms-post-apiform-submissions)
- [Analytics ingest: POST /api/analytics/collect](#analytics-ingest-post-apianalyticscollect)
- [Keycloak OIDC routes](#keycloak-oidc-routes)
- [Status codes](#status-codes)
- [Smoke test](#smoke-test)

## Auth schemes

| Scheme | Header | Who uses it | Grants |
|--------|--------|-------------|--------|
| Public API token | `Authorization: Bearer <token>` | Next.js server-side fetchers | Read-only on the token's allowed types |
| Strapi JWT (7d) | `Authorization: Bearer <jwt>` | Editors/admins (login or Keycloak) | Per users-permissions role |
| Analytics ingest token | `Authorization: Bearer <token>` **or** `x-analytics-token: <token>` | Next.js analytics proxy only | `POST /api/analytics/collect` |
| Anonymous (Public role) | none | Website visitors (forms) | `POST /api/form-submissions` only |

The public token is created automatically on first boot (`nextjs-public`,
read-only — `src/bootstrap/ensure-public-api-token.ts`) and/or in the admin UI
(Settings → API Tokens). The website reads it as `STRAPI_PUBLIC_TOKEN`. JWT
expiry is 7 days (`config/plugins.ts:91-92`).

## Content API by type

All content routes are standard Strapi core routers
(`factories.createCoreRouter`). Access is governed by the seeded
users-permissions permissions (see [`rbac.md`](./rbac.md)) and per-schema
`content-api` visibility, **not** by route-level policies (the
`is-public-readable` policy exists but is not attached to the core routers).

REST prefix is `/api` (`config/api.ts`), `defaultLimit: 25`, `maxLimit: 100`,
`withCount: true`.

| Endpoint | Verb | Public token | Notes |
|----------|------|:---:|-------|
| `/api/site-setting` | GET | ✓ read | single type |
| `/api/design-tokens` | GET | ✓ read | single type (plural route id) |
| `/api/navigation` | GET | ✓ read | single type |
| `/api/pages` | GET | ✓ read (published) | Dynamic Zone needs explicit `populate` |
| `/api/corridors` | GET | ✓ read | |
| `/api/blog-posts` | GET | ✓ read (published) | filter `publishedAt[$notNull]=true` |
| `/api/tags` | GET | ✓ read | |
| `/api/authors` | GET | ✓ read | |
| `/api/legal-documents` | GET | ✓ read (published) | |
| `/api/job-postings` | GET | ✓ read (published) | |
| `/api/form-definitions` | GET | ✓ read | |
| `/api/form-submissions` | POST | ✓ (anon) | create only; see below |
| `/api/form-submissions` | GET/PUT/DELETE | ✗ **403** | `inspire-admin` JWT only |
| `/api/candidates` | any | ✗ **403** | admin-only; no public permission |
| `/api/analytics-sessions` etc. | any | ✗ **404/403** | `content-api: false` — not exposed |

Write verbs (POST/PUT/DELETE) on editorial types are available to the
`inspire-admin`/`inspire-editor` JWT roles, not the public token. See
[`rbac.md`](./rbac.md) for the exact action grid.

### Dynamic Zone populate

Strapi v5 requires the verbose discriminated-union populate for Dynamic Zones.
The website's `lib/cms/pages.ts` builds it, e.g.:

```
GET /api/pages?filters[slug][$eq]=workers
  &populate[sections][on][sections.hero][populate]=photo,ctas
  &populate[sections][on][sections.feature-list][populate]=items
  &…  (one entry per section component)
  &populate[seo][populate]=ogImage
```

A populate string that omits a component, or references a field that doesn't
exist on it, can cause the section to come back without children — see
[`known-issues.md`](./known-issues.md).

## Forms: POST /api/form-submissions

Custom controller `src/api/form-submission/controllers/form-submission.ts`.

Request (anonymous, no auth header):

```http
POST /api/form-submissions
Content-Type: application/json

{ "data": { "formKey": "contact", "email": "a@b.com", "message": "Hello" } }
```

Server-side behaviour:

- Requires `formKey` + `email` (else `400`).
- **Overwrites** `ipAddress`/`userAgent` from the request server-side (never
  trusts client values); sets `status: 'New'`; snapshots the full body into
  `payload` for audit.
- Creates via Document Service, then **fire-and-forget** sends a notification
  email to the form's `notifyEmail` (resolved from the matching
  `form-definition`, falling back to `EMAIL_FORM_NOTIFY`, then
  `info@inspireafricans.com`). The email send is never awaited so SMTP latency
  can't slow the response.

Response: `200` with `{ "data": { "id": <n>, "status": "received" } }`.

`GET/PUT/DELETE` call `requireAdmin(ctx)` and throw `403` unless
`ctx.state.user.role.type === 'inspire-admin'`.

## Analytics ingest: POST /api/analytics/collect

Custom route + controller: `src/api/analytics/routes/analytics.ts`,
`src/api/analytics/controllers/analytics.ts`.

```
method: POST   path: /analytics/collect (→ /api/analytics/collect)
config: { auth: false, policies: ['global::is-analytics-ingest'] }
```

`auth: false` means no Strapi user is required, but the
`global::is-analytics-ingest` policy enforces a constant-time shared-secret
check against `ANALYTICS_INGEST_TOKEN` (Bearer or `x-analytics-token`). The
browser never calls this directly — only the Next.js server-side proxy, which
holds the secret.

Request body (validated/capped by `src/utils/analytics/validate.ts`):

```jsonc
{
  "sessionId": "…(≤64)…",
  "consentLevel": "analytics" | "all",       // required
  "context": { "path": "/", "title": "Home", "referrer": "https://x/", "utm": { "source": "…", "medium": "…", "campaign": "…" } },
  "events": [                                   // max 50 per batch
    { "type": "pageview", "path": "/", "pageTitle": "Home", "occurredAt": "ISO", "scrollDepth": 50, "sectionId": "hero", "target": "…", "referrer": "…", "meta": { } }
  ]
}
```

Allowed event types: `pageview, click, scroll_depth, section_view,
outbound_click, form_start, form_submit, session_end`.

Pipeline (controller): sanitise → derive coarse geo from forwarded IP → hash IP
(salted, truncated; raw IP discarded) → parse UA + bot score → rate-limit per
`ipHash` (240/min, burst 120) → upsert session → bulk-insert events. Full
detail: [`analytics.md`](./analytics.md).

Responses:

| Status | When |
|-------|------|
| `204` | success (always, once authorised + valid) |
| `400` | structurally invalid payload (`sanitizeBatch` throws) |
| `429` | rate limited (`{"error":"rate_limited"}`) |
| `403`/`401` | policy rejected (missing/invalid ingest token; **fails closed** if token unset) |

Persistence errors are swallowed and still return `204` — analytics must never
surface errors to visitors.

## Keycloak OIDC routes

Registered in `register()` only when `KEYCLOAK_ENABLED=true`
(`src/extensions/users-permissions/strategies/keycloak.ts`). Both `auth: false`.

| Route | Verb | Purpose |
|-------|------|---------|
| `/api/auth/keycloak` | GET | Starts OIDC flow → 302 to Keycloak (sets `kc_state`/`kc_nonce` cookies) |
| `/api/auth/keycloak/callback` | GET | Exchanges code → id_token, verifies, upserts a users-permissions user keyed on `kc:<sub>`, maps realm roles → `inspire-admin`/`-editor`/`-viewer`, issues a Strapi JWT, redirects to `target` (default `/admin`) with `#access_token=<jwt>` |

Role mapping is overridable via `KEYCLOAK_ROLE_ADMIN`/`_EDITOR` env; the target
role must exist (run `seed:roles` if missing). Realm config:
[`keycloak-setup.md`](./keycloak-setup.md).

## Status codes

| Code | Meaning in this CMS |
|------|---------------------|
| 200 | content read / form-submission create |
| 204 | analytics collect success |
| 400 | missing form fields / invalid analytics batch |
| 401/403 | unauthorised read of blocked type, non-admin form GET, bad ingest token |
| 404 | analytics models on public API (not exposed) |
| 429 | analytics rate limit |

## Smoke test

`scripts/smoke-test.sh` (run via `npm run test:smoke`) needs `STRAPI_BASE_URL`
and `STRAPI_PUBLIC_TOKEN`. It asserts: public reads `200` (site-setting,
design-tokens, navigation, published blog posts, privacy legal doc, corridors),
PII reads `403` (candidates, form-submissions GET), and an anonymous
form-submission POST `201`. Expected sequence: `200 200 200 200 200 200 403 403
201`.

> NOTE: the custom `form-submission.create` controller returns **200**, while
> the smoke script asserts **201** for the POST. Verify against the deployed
> behaviour; this is flagged in [`known-issues.md`](./known-issues.md).
