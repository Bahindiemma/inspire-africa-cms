# Known Issues & Tech Debt

> Active issues, tech debt, and items that could not be verified from code.
> Each entry cites the relevant files.
>
> Last reviewed: 2026-05-27 (commit 262ccc6)

## Contents

- [Sub-page CMS content not rendered live (populate / fallback)](#sub-page-cms-content-not-rendered-live)
- [Seeded corridor count says 7 but seeds 6](#seeded-corridor-count)
- [No `contact` Page document is seeded](#no-contact-page-document)
- [Form-submission POST status 200 vs smoke-test 201](#form-submission-status-mismatch)
- [Hero seed uses photoUrl, not media](#hero-seed-uses-photourl)
- [admin_roles.description length](#admin_rolesdescription-length)
- [Private GHCR package](#private-ghcr-package)
- [Local media volume is a single point of failure](#local-media-volume-spof)
- [Insecure default analytics IP salt](#insecure-default-analytics-ip-salt)
- [In-memory rate limiter](#in-memory-rate-limiter)
- [Database client default is postgres](#database-client-default-is-postgres)
- [UNVERIFIED items](#unverified-items)

## Sub-page CMS content not rendered live

**Symptom (reported):** the website's `getPage(slug)` returns `null` for the
inner marketing pages, so sub-page CMS content isn't rendered from the CMS and
the site falls back to the inline TSX baked into each route.

**CMS side facts:**

- The seeder *does* create and publish Page documents for `home`, `workers`,
  `employers`, `governments`, `approach`, `join`
  (`src/bootstrap/seed-content.ts:389-407`), each with a full `sections`
  Dynamic Zone.
- Those pages are readable by the public token (`page` is in `PUBLIC_READABLE`
  and Draft&Publish-published).

**Website side facts** (`INSPIRE AFRICA WEBSITE/lib/cms/pages.ts`,
`lib/strapi.ts`): each route does
`const page = await getPage(slug); if (page) return <DynamicZoneRenderer .../>;`
else renders inline TSX. `getPage` returns `null` when **any** of these is true:

1. `isStrapiAvailable()` is false (no `STRAPI_BASE_URL`/`STRAPI_PUBLIC_TOKEN`).
2. the `strapiFetch` throws (caught → `null`) — e.g. the verbose Dynamic Zone
   populate string is malformed or 4xx/5xx.
3. no page matches the slug (`data[0] ?? null`).

`UNVERIFIED:` the exact live cause. The seeded section field names align with
the website's per-component populate (`populate[sections][on][sections.hero][populate]=photo,ctas`,
etc.), so a *schema mismatch* is unlikely to null the whole query — the more
likely live causes are (1) the public token/env not wired in the running web
container, or (2) a strict-populate 400 from Strapi v5 for one component
bubbling up and being caught. **Recommended verification:** from the VPS,
`curl` the exact `getPage` URL with the public token and inspect the status/body
(see [`api-reference.md`](./api-reference.md#dynamic-zone-populate)); confirm
`STRAPI_PUBLIC_TOKEN` is set in the `web` container. Until confirmed, treat the
inline-TSX fallback as the live render path for inner pages.

## Seeded corridor count

`src/bootstrap/seed-content.ts:127-144` defines **6** corridors (UK, EU, USA,
Canada, Australia, Saudi Arabia — note the `order` jumps 5→7, skipping 6) but
logs `7 corridors upserted`, and the website's numbers copy references "7
destination corridors". The log message and copy are off-by-one / out of sync
with the seed array. Low impact; clarify intended corridor set.

## No contact Page document

The website has a `/contact` route and the seeder creates a `contact`
**form-definition**, but **no** `contact` **Page** document is seeded
(`seed-content.ts` seeds home + 5 inner pages, not contact). The contact route
therefore always uses its inline TSX. Decide whether `/contact` should be
CMS-driven; if so, add it to the seed.

## Form-submission status mismatch

The custom controller returns HTTP **200** with
`{ data: { id, status: 'received' } }`
(`src/api/form-submission/controllers/form-submission.ts:63`), but
`scripts/smoke-test.sh:38-42` asserts **201** for the form POST. One of them is
wrong; the smoke test will fail against the current controller. Align them
(either return 201 / `ctx.status = 201`, or change the assertion).

## Hero seed uses photoUrl

The `hero` component has both `photo` (media) and `photoUrl` (string override).
The seed sets `photoUrl` to `/public/images/*` paths
(`seed-content.ts`, e.g. lines 444-446) rather than uploading media. The
frontend is expected to read `photoUrl ?? photo.url` (per the schema
description), so hero images render from the website's local `/images/*`
assets, not the Media Library. Editors who want managed images must set the
`photo` field. Not a bug, but a migration gotcha.

## admin_roles.description length

Resolved in code (clamp to 250) and on the live DB (column widened to
VARCHAR(500)). The widening is a manual DB change not represented in code; keep
the in-code clamp as the durable fix. Full detail:
[`rbac.md`](./rbac.md#the-admin_rolesdescription-varchar-caveat),
[`operations.md`](./operations.md#crash-loop-descriptiontoolong).

## Private GHCR package

`ghcr.io/bahindiemma/inspire-africa-cms` is a **private** package. The VPS
builds the image on-host when it can't pull. If host GHCR auth lapses *and* the
on-host build isn't run, deploys stall. Options: make the package readable to a
deploy token, or standardise on on-host builds. See
[`deployment.md`](./deployment.md#on-server-build-fallback-private-package).

## Local media volume SPOF

Production uses `MEDIA_PROVIDER=local` with uploads on the `cms_uploads` Docker
volume. Media is protected only by the volume backup
([`operations.md`](./operations.md#uploads-volume-backup--restore)). Migrating
to S3/Cloudinary (both already wired in `config/plugins.ts`) would remove this
single point of failure and add CDN delivery.

## Insecure default analytics IP salt

`src/api/analytics/controllers/analytics.ts:36-37` falls back to
`inspire-africa-CHANGE-ME-salt` when `ANALYTICS_IP_SALT` is unset. Predictable
salt weakens the IP pseudonymisation. **Always set the env var** (production
compose does).

## In-memory rate limiter

`src/utils/analytics/rate-limit.ts` is a per-process token bucket (max 20 000
keys, cleared wholesale). Correct for the single-instance deployment; would need
Redis (noted in the code) if the CMS ever scales horizontally.

## Database client default is postgres

`config/database.ts:11` defaults `DATABASE_CLIENT` to `postgres`, but the
project runs on MySQL and all real configs set `DATABASE_CLIENT=mysql`
explicitly. A deploy that forgets the var would silently try Postgres. Consider
changing the code default to `mysql` to match reality.

## UNVERIFIED items

- The exact root cause of the `getPage` null/fallback in the live web container
  (above) — needs a runtime `curl` + env check.
- Whether a formal data-subject erasure (DSAR) runbook exists for
  candidate/form-submission/analytics PII (data structures support manual
  deletion; no documented procedure in code) —
  [`security-privacy.md`](./security-privacy.md#analytics-gdpr--pecr).
- The website repo's `docs/HANDOVER.md` (the intended system-wide handover home)
  did not exist at review time; the docs index links to it as the target.
- `ENCRYPTION_KEY` is read by Strapi v5 core (not by this repo's `config/*`); it
  is present in `.env.example` and the compose env. Its precise core usage is
  per the Strapi v5 release, not this codebase.
