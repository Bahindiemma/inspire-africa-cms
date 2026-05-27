# Local Development

> Run the CMS locally with MySQL or SQLite, configure env, bootstrap the admin,
> and seed content.
>
> Last reviewed: 2026-05-27 (commit 262ccc6)

## Contents

- [Prerequisites](#prerequisites)
- [Clone & install](#clone--install)
- [Environment](#environment)
- [Choose a database](#choose-a-database)
- [Run](#run)
- [Admin bootstrap](#admin-bootstrap)
- [Seeding locally](#seeding-locally)
- [Type-checking & build](#type-checking--build)
- [Pointing the website at local CMS](#pointing-the-website-at-local-cms)
- [Common pitfalls](#common-pitfalls)

## Prerequisites

- Node 20.x (max 22.x — `package.json` `engines`).
- Optional: Docker (for a throwaway MySQL) and the `mysql` CLI.

## Clone & install

```bash
git clone git@github.com:Bahindiemma/inspire-africa-cms.git
cd inspire-africa-cms
npm install
cp .env.example .env
```

## Environment

Generate the required secrets and paste them into `.env`:

```bash
# 4 comma-separated values for APP_KEYS, plus one each for the others:
openssl rand -base64 32
```

Required for boot: `APP_KEYS` (4), `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`,
`TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`. Full list:
[`environment.md`](./environment.md).

For local analytics testing, also set `ANALYTICS_IP_SALT` (any value) and
`ANALYTICS_INGEST_TOKEN`. For local revalidation testing, set
`FRONTEND_REVALIDATE_URL=http://localhost:3000/api/revalidate` +
`REVALIDATE_SECRET`.

## Choose a database

**SQLite (zero-setup, fastest):**

```env
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
```

The SQLite path is anchored to `process.cwd()` deliberately
(`config/database.ts:53-68`) so the dev TS watcher cleaning `dist/` can't wipe
the DB out from under an open connection.

**MySQL (matches production):**

```bash
docker run --name inspire-mysql -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=inspire_africa_cms -p 3306:3306 -d mysql:8 \
  --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
```

```env
DATABASE_CLIENT=mysql
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=inspire_africa_cms
DATABASE_USERNAME=root
DATABASE_PASSWORD=root
```

> Always `utf8mb4` — plain `utf8` truncates 4-byte characters.

## Run

```bash
npm run develop      # dev server + admin auto-reload → http://localhost:1337/admin
```

First boot: creates schema, runs the four bootstrap seeders (roles, admin
roles, public token, content), and logs
`[bootstrap] inspire-africa-cms is ready.`

## Admin bootstrap

1. Open `http://localhost:1337/admin` → create the first **super-admin** (the
   web UI walks you through it). The `disable-public-register` middleware closes
   that route once an admin exists.
2. The `nextjs-public` read-only token is auto-created; its plaintext is in
   `.runtime/public-api-token.txt` for first-boot convenience.
3. Confirm Public role = `form-submission.create` only.

## Seeding locally

- Content seeds automatically on first boot (empty DB).
- To re-apply roles only without rebooting: `npm run seed:roles`.
- To force a content re-seed on a non-empty DB:
  `RESEED_CONTENT=true npm run develop` (one-shot; then drop the env var). See
  [`seeding.md`](./seeding.md).
- To start fresh: stop Strapi, delete `.tmp/data.db` (SQLite) or drop/recreate
  the MySQL database, then boot.

## Type-checking & build

```bash
npm run build        # compiles admin bundle + TS config (strapi build)
npx tsc --noEmit     # type-check only (tsconfig excludes src/admin/)
```

`tsconfig.json` extends `@strapi/typescript-utils/tsconfigs/server`, `strict`,
and excludes `src/admin/` (the admin has its own `src/admin/tsconfig.json`),
tests, and `src/plugins/**`.

## Pointing the website at local CMS

In the website repo's `.env.local`:

```env
STRAPI_BASE_URL=http://localhost:1337
STRAPI_PUBLIC_TOKEN=<from .runtime/public-api-token.txt or admin>
REVALIDATE_SECRET=<same as the CMS .env>
```

Then run the website. Its server-side fetchers
(`lib/strapi.ts`, `lib/cms/*.ts`) call the local CMS. See
[`frontend-integration.md`](./frontend-integration.md).

## Common pitfalls

| Symptom | Fix |
|---------|-----|
| Boot fails on missing `APP_KEYS` | populate all required secrets in `.env` |
| Content didn't seed | DB already had a `site-setting`; use `RESEED_CONTENT=true` or start fresh |
| SQLite "readonly database" | use `DATABASE_FILENAME=.tmp/data.db` (cwd-anchored); don't move it under `dist/` |
| Admin changes not showing | `npm run build` (or `develop`) after editing `src/admin/*` |
| Form notification email hangs | local default `EMAIL_PROVIDER=sendmail` can stall without postfix; the controller sends fire-and-forget so the HTTP response isn't blocked, but set a real provider or ignore the warning in dev |
