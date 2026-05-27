# Environment Variables Reference

> Every environment variable the CMS reads: name, purpose, required?, default,
> where it is set, and rotation guidance. **No secret values appear here.**
>
> Last reviewed: 2026-05-27 (commit 262ccc6)

## Contents

- [Where variables are set](#where-variables-are-set)
- [Server](#server)
- [Secrets](#secrets)
- [Database](#database)
- [CORS & proxy](#cors--proxy)
- [Media](#media)
- [Email](#email)
- [Revalidation webhook](#revalidation-webhook)
- [Analytics](#analytics)
- [Seeding & cron toggles](#seeding--cron-toggles)
- [Keycloak](#keycloak-oidc)
- [Admin flags](#admin-flags)
- [Gaps vs .env.example](#gaps-vs-envexample)

## Where variables are set

| Environment | Source of truth |
|-------------|-----------------|
| Local dev | `.env` (copied from `.env.example`) |
| Production (VPS) | `/opt/inspire-africa/.env` consumed by the website repo's `deploy/docker-compose.yml` (`cms` service `environment:` block) |
| Render (alt) | Render dashboard env vars (`render.yaml`, many `sync: false`) |

Secrets are **never committed**; `.env` / `.env.*` are git-ignored
(`!.env.example` is the only exception).

## Server

| Var | Purpose | Required | Default | Where read |
|-----|---------|:---:|---------|-----------|
| `HOST` | Bind address | no | `0.0.0.0` | `config/server.ts` |
| `PORT` | Listen port | no | `1337` | `config/server.ts` |
| `PUBLIC_URL` | Public origin of Strapi (admin links, signed URLs) | recommended | `http://localhost:1337` | `config/server.ts` (`url`) |
| `NODE_ENV` | `production` in prod | recommended | — | runtime |
| `WEBHOOKS_POPULATE_RELATIONS` | Populate relations in webhook payloads | no | `false` | `config/server.ts` |

## Secrets

Generate each with `openssl rand -base64 32`. `APP_KEYS` = 4 comma-separated
values. Rotation: quarterly (rotating admin secrets invalidates admin sessions
— expected).

| Var | Purpose | Required | Where read |
|-----|---------|:---:|-----------|
| `APP_KEYS` | Session/cookie signing keys (array) | **yes** | `config/server.ts` |
| `API_TOKEN_SALT` | Salt for hashing API tokens | **yes** | `config/admin.ts` |
| `ADMIN_JWT_SECRET` | Admin-panel JWT signing | **yes** | `config/admin.ts` |
| `TRANSFER_TOKEN_SALT` | Salt for data-transfer tokens | **yes** | `config/admin.ts` |
| `JWT_SECRET` | users-permissions JWT signing | **yes** | `config/plugins.ts` |
| `ENCRYPTION_KEY` | Strapi v5 encrypted-field key | **yes** (v5) | Strapi core (set in compose/.env) |

> Rotating `API_TOKEN_SALT` invalidates existing API tokens (incl. the
> `nextjs-public` token) — regenerate and update the website afterwards.

## Database

| Var | Purpose | Required | Default | Notes |
|-----|---------|:---:|---------|-------|
| `DATABASE_CLIENT` | `mysql` / `postgres` / `sqlite` | **yes (set it)** | `postgres` (code default) | Production = `mysql` |
| `DATABASE_HOST` | DB host | yes (mysql/pg) | `localhost` | compose: `db` |
| `DATABASE_PORT` | DB port | no | 3306 (mysql) / 5432 (pg) | |
| `DATABASE_NAME` | DB name | no | `inspire_africa_cms` | |
| `DATABASE_USERNAME` | DB user | no | `strapi` | |
| `DATABASE_PASSWORD` | DB password | yes (prod) | `strapi` | secret |
| `DATABASE_SSL` | Enable SSL | no | `false` | prod managed DBs: `true` |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | Verify DB cert | no | `true` | |
| `DATABASE_SSL_KEY/CERT/CA/CAPATH/CIPHER` | PG mutual-TLS bits | no | — | postgres only |
| `DATABASE_SCHEMA` | PG schema | no | `public` | postgres only |
| `DATABASE_POOL_MIN/MAX` | Pool sizing | no | 2 / 10 | |
| `DATABASE_CONNECTION_TIMEOUT` | Acquire timeout (ms) | no | 60000 | |
| `DATABASE_URL` | PG connection string | no | — | postgres only |
| `DATABASE_FILENAME` | SQLite file | no | `.tmp/data.db` | resolved from cwd |

Always create MySQL with `utf8mb4` charset (3-byte `utf8` truncates emoji/some
scripts).

## CORS & proxy

| Var | Purpose | Required | Default |
|-----|---------|:---:|---------|
| `CORS_ORIGINS` | Comma-separated browser-origin allow-list (never `*`) | **yes (prod)** | `http://localhost:3000,http://localhost:3017` |
| `IS_PROXIED` | Tell Strapi it's behind a proxy/CDN | no | `false` (compose sets `false`) |
| `AWS_CDN_BASE_URL` | Also used in CSP `img-src`/`media-src` | no | `https://*.cloudfront.net` |

## Media

`MEDIA_PROVIDER` selects the block (`config/plugins.ts`). Production uses
`local` (uploads on a Docker volume).

| Var | Purpose | When |
|-----|---------|------|
| `MEDIA_PROVIDER` | `local` / `aws-s3` / `cloudinary` | always (default `local`) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | S3 creds (secret) | aws-s3 |
| `AWS_REGION` | S3 region (default `eu-west-2`) | aws-s3 |
| `AWS_BUCKET` | S3 bucket | aws-s3 |
| `AWS_CDN_BASE_URL` | CloudFront base URL | aws-s3 |
| `AWS_ROOT_PATH` | Key prefix (default `''`) | aws-s3 |
| `AWS_S3_ACL` | `public-read` / `private` (default `public-read`) | aws-s3 |
| `AWS_S3_SIGNED_URL_EXPIRES` | Signed-URL TTL secs (default 900) | aws-s3 |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary creds (secret) | cloudinary |

## Email

| Var | Purpose | Default |
|-----|---------|---------|
| `EMAIL_PROVIDER` | `sendgrid` or `sendmail` | `sendmail` |
| `SENDGRID_API_KEY` | SendGrid key (secret) | — |
| `EMAIL_FROM_NAME` | Default from name | `INSPIRE AFRICA` |
| `EMAIL_FROM_ADDRESS` | Default from address | `noreply@inspireafricans.com` |
| `EMAIL_REPLY_TO` | Default reply-to | `info@inspireafricans.com` |
| `EMAIL_FORM_NOTIFY` | Fallback form-notification recipient | `info@inspireafricans.com` |

## Revalidation webhook

| Var | Purpose | Required |
|-----|---------|:---:|
| `FRONTEND_REVALIDATE_URL` | Next.js `/api/revalidate` URL the CMS POSTs to on publish (compose: `http://web:3000/api/revalidate`) | for live revalidation |
| `REVALIDATE_SECRET` | Shared secret appended as `?secret=` and verified by the Next.js handler | with the above |

Both must be set or the webhook silently no-ops (logged at debug). The website
must hold the **same** `REVALIDATE_SECRET`.

## Analytics

| Var | Purpose | Required | Default |
|-----|---------|:---:|---------|
| `ANALYTICS_INGEST_TOKEN` | Shared secret guarding `POST /api/analytics/collect` (constant-time check). **Same value on web + cms.** | yes (else ingest fails closed) | none |
| `ANALYTICS_IP_SALT` | Salt for the truncated-IP hash | yes | insecure fallback `inspire-africa-CHANGE-ME-salt` — **override** |
| `ANALYTICS_RETENTION_MONTHS` | Raw events/sessions retention before nightly purge | no | `14` |

## Seeding & cron toggles

| Var | Purpose | Default | Notes |
|-----|---------|---------|-------|
| `RESEED_CONTENT` | Force `seed-content.ts` to run even when content exists | unset (skip) | One-shot only — see [`seeding.md`](./seeding.md) |
| `CRON_ENABLED` | Master switch for the scheduler (analytics maintenance) | `true` | |

## Keycloak (OIDC)

Only relevant when `KEYCLOAK_ENABLED=true`.

| Var | Purpose | Default |
|-----|---------|---------|
| `KEYCLOAK_ENABLED` | Register the OIDC routes | `false` |
| `KEYCLOAK_ISSUER_URL` | Realm issuer URL (OIDC discovery) | — |
| `KEYCLOAK_CLIENT_ID` | Client ID | — |
| `KEYCLOAK_CLIENT_SECRET` | Client secret (secret) | — |
| `KEYCLOAK_REDIRECT_URI` | Callback URL | — |
| `KEYCLOAK_SCOPES` | OIDC scopes | `openid profile email roles` |
| `KEYCLOAK_ROLE_ADMIN` | Realm role → `inspire-admin` | `inspire-admin` |
| `KEYCLOAK_ROLE_EDITOR` | Realm role → `inspire-editor` | `inspire-editor` |
| `KEYCLOAK_ROLE_VIEWER` | (documented in `.env.example`; default fallthrough) | `inspire-viewer` |

## Admin flags

| Var | Purpose | Default |
|-----|---------|---------|
| `ADMIN_URL` | Admin mount path | `/admin` |
| `FLAG_NPS` | Strapi NPS survey | `false` |
| `FLAG_PROMOTE_EE` | Strapi EE upsell | `false` |

## Gaps vs .env.example

`.env.example` documents most vars but at this commit is **missing**:
`ENCRYPTION_KEY` is present; however `ANALYTICS_INGEST_TOKEN`,
`ANALYTICS_IP_SALT`, `ANALYTICS_RETENTION_MONTHS`, `RESEED_CONTENT`,
`CRON_ENABLED`, `IS_PROXIED`, `WEBHOOKS_POPULATE_RELATIONS`, `ADMIN_URL`,
`FLAG_NPS`, `FLAG_PROMOTE_EE`, and `AWS_ROOT_PATH` are **not** listed there.
They are all read by the code cited above. The website
`deploy/.env.production.example` does cover the analytics vars. Tracked in
[`known-issues.md`](./known-issues.md).
