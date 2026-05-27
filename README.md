# INSPIRE AFRICA — CMS (Strapi v5)

> Headless CMS for the [INSPIRE AFRICA Next.js website](../INSPIRE%20AFRICA%20WEBSITE/).
> Every string, image, link, colour, blog post, SEO meta and form copy on the
> public site is sourced from here via REST, plus a first-party, consent-gated
> visitor-analytics subsystem.
>
> Last reviewed: 2026-05-27 (commit 262ccc6)

## What it is

A TypeScript Strapi v5 application that:

- Stores all public-site content (pages built from Dynamic Zones, blog posts,
  corridors, legal documents, job postings, navigation, site settings, design
  tokens, form definitions). See [`docs/content-model.md`](./docs/content-model.md).
- Exposes a read-only public REST API (Bearer token) the Next.js app consumes,
  plus an anonymous `POST /api/form-submissions` for forms. See
  [`docs/api-reference.md`](./docs/api-reference.md).
- Receives first-party analytics batches at `POST /api/analytics/collect`,
  derives coarse geo + device server-side, stores **no raw IP**, and renders a
  Recharts dashboard in the admin. See [`docs/analytics.md`](./docs/analytics.md).
- Fires a revalidation webhook into the Next.js app on every publish, so the
  live site updates within seconds.

## Stack & versions

| Layer | Choice | Source |
|-------|--------|--------|
| CMS | **Strapi v5.46.1** (TypeScript) | `package.json` |
| Runtime | Node `>=20 <=22` | `package.json` `engines` |
| Database | **MySQL 8 / MariaDB 10.11+** (`mysql2`) in production; PostgreSQL (`pg`) + SQLite (`better-sqlite3`) also wired | `config/database.ts`, `package.json` |
| Auth (API) | Strapi API token (public reads) + Strapi JWT (7-day) | `config/plugins.ts` |
| Auth (SSO, optional) | Keycloak OIDC custom strategy | `src/extensions/users-permissions/strategies/keycloak.ts` |
| Media | `local` (production volume) by default; `aws-s3` / `cloudinary` env-toggled | `config/plugins.ts` |
| Email | SendGrid (provider env-toggled) | `config/plugins.ts` |
| Charts (admin) | Recharts | `src/admin/pages/Analytics/index.tsx` |
| Cache invalidation | DB lifecycle webhook → Next.js `/api/revalidate` | `src/middlewares/revalidate-frontend.ts` |

> NOTE: `config/database.ts` defaults `DATABASE_CLIENT` to `postgres` when the
> env var is unset, but the project and all production/compose configs set
> `DATABASE_CLIENT=mysql`. Always set it explicitly.

## Prerequisites

- Node 20.x (22.x max).
- A database: MySQL 8 / MariaDB 10.11+ (production), or SQLite for zero-setup
  local prototyping, or PostgreSQL.
- For Docker builds: Docker with BuildKit; `vips` is installed in-image for
  `sharp`.

## Quickstart (local)

```bash
npm install
cp .env.example .env
# 1. Generate APP_KEYS + the *_SECRET / *_SALT values (see docs/environment.md).
#    openssl rand -base64 32   (one per secret; APP_KEYS needs 4 comma-separated)
# 2. Pick a database in .env:
#    - SQLite (fastest):  DATABASE_CLIENT=sqlite  DATABASE_FILENAME=.tmp/data.db
#    - MySQL:             DATABASE_CLIENT=mysql + DATABASE_* (see below)
npm run develop      # http://localhost:1337/admin
```

MySQL via Docker, if you don't have one locally:

```bash
docker run --name inspire-mysql -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=inspire_africa_cms -p 3306:3306 -d mysql:8 \
  --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
```

First boot runs the bootstrap seeders (roles, admin roles, public API token,
content). Then create the super-admin in the web UI. Full walkthrough:
[`docs/local-development.md`](./docs/local-development.md).

## NPM scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `develop` | `strapi develop` | Dev server with admin auto-reload |
| `start` | `strapi start` | Production server (expects a prior `build`) |
| `build` | `strapi build` | Compile the admin bundle + TS config |
| `strapi` | `strapi` | Raw Strapi CLI passthrough |
| `seed:roles` | `strapi exec ts-node src/bootstrap/seed-roles.ts` | Re-seed the users-permissions roles only |
| `test:smoke` | `bash scripts/smoke-test.sh` | HTTP smoke test of public reads / PII blocks / form POST (needs `STRAPI_BASE_URL` + `STRAPI_PUBLIC_TOKEN`) |

> The bootstrap seeders also run automatically on every boot from
> `src/index.ts`; `seed:roles` is only needed to re-apply roles without a full
> reboot. See [`docs/seeding.md`](./docs/seeding.md).

## Project structure

```
inspire-africa-cms/
├── config/                  Strapi config (server, database, plugins, middlewares, admin, api)
├── src/
│   ├── index.ts             Entrypoint: register() (Keycloak routes) + bootstrap() (4 seeders)
│   ├── api/                  Content types: schema.json + controllers/routes/services
│   │   └── analytics/        Custom POST /api/analytics/collect (no model)
│   ├── components/           Schema fragments: sections/ blocks/ cards/ shared/ tokens/
│   ├── admin/                Admin customisation (app.tsx) + Analytics dashboard page
│   ├── bootstrap/            seed-roles, seed-admin-roles, ensure-public-api-token, seed-content
│   ├── crons/                analytics-maintenance (nightly rollup + purge)
│   ├── extensions/           users-permissions Keycloak OIDC strategy
│   ├── middlewares/          revalidate-frontend, disable-public-register
│   ├── policies/             is-public-readable, is-analytics-ingest
│   └── utils/analytics/      ip, geo, ua, validate, rate-limit
├── types/generated/         Strapi-generated TS types (components + contentTypes)
├── docs/                     This documentation set
├── Dockerfile               Multi-stage (builder / proddeps / runner)
├── render.yaml              Render.com blueprint (alternative host)
└── .env.example             Documented env template
```

## Documentation

Start at [`docs/README.md`](./docs/README.md) — the index for the whole set.
Highlights:

- [Architecture](./docs/architecture.md) · [Content model / ERD](./docs/content-model.md) · [Seeding & RESEED](./docs/seeding.md)
- [API reference](./docs/api-reference.md) · [Analytics subsystem](./docs/analytics.md) · [RBAC & roles](./docs/rbac.md)
- [Environment variables](./docs/environment.md) · [Deployment & build](./docs/deployment.md) · [Operations / runbooks](./docs/operations.md)
- [Security & privacy](./docs/security-privacy.md) · [Local development](./docs/local-development.md) · [Known issues](./docs/known-issues.md) · [Glossary](./docs/glossary.md)

## Deploying

Production runs as a Docker image (`ghcr.io/bahindiemma/inspire-africa-cms`) in
a `docker compose` stack (`db` MySQL + `cms` Strapi + `web` Next.js) on a
Contabo VPS behind host nginx (TLS). The GHCR package is private, so the server
builds the image on-host when it can't pull. Full runbook:
[`docs/deployment.md`](./docs/deployment.md).
