# INSPIRE AFRICA CMS — Documentation Index

> Software-engineering documentation set for the INSPIRE AFRICA **Strapi v5** headless CMS (`inspire-africa-cms`). For onboarding + handover.
>
> Last reviewed: 2026-05-27 (commit 262ccc6)

This repo (`Bahindiemma/inspire-africa-cms`) is the headless CMS that backs the
[INSPIRE AFRICA Next.js website](../README.md). Every string, image, link,
colour, blog post, SEO meta and form copy on the public site is sourced from
here over REST, plus a first-party visitor-analytics subsystem.

## Where the system-wide handover lives

The **system-wide handover home** for the whole platform (website + CMS +
deployment) is the website repo's
[`docs/HANDOVER.md`](../../INSPIRE%20AFRICA%20WEBSITE/docs/HANDOVER.md).
`UNVERIFIED:` at the time of writing the website repo had no `docs/` directory;
treat that link as the intended home and create it there if missing. This CMS
doc set is the authoritative reference for everything inside the CMS.

## Document map

| # | Document | What it covers |
|---|----------|----------------|
| 1 | [`../README.md`](../README.md) | Project README — what it is, stack, quickstart, scripts, structure |
| 2 | [`architecture.md`](./architecture.md) | Component diagram, request lifecycle, bootstrap order, plugins |
| 3 | [`content-model.md`](./content-model.md) | ERD + field tables for every content type & component; PII markers |
| 4 | [`seeding.md`](./seeding.md) | `seed-content.ts`, the `RESEED_CONTENT` mechanism, all four seeders |
| 5 | [`api-reference.md`](./api-reference.md) | Content API per type, `POST /api/analytics/collect`, auth, status codes |
| 6 | [`analytics.md`](./analytics.md) | Ingest pipeline, geo/UA/IP-hash/bot/rate-limit, rollup+purge cron, dashboard |
| 7 | [`rbac.md`](./rbac.md) | Admin-panel roles vs U&P roles, seeded permissions, the "Policy Failed" fix |
| 8 | [`environment.md`](./environment.md) | Every env var: name / purpose / required / where set / rotation |
| 9 | [`deployment.md`](./deployment.md) | Dockerfile stages, GHCR workflow, on-server build fallback, RESEED, revalidate |
| 10 | [`operations.md`](./operations.md) | Backup/restore, crash-loop diagnosis, reseed, cron checks, logs |
| 11 | [`security-privacy.md`](./security-privacy.md) | Auth, tokens, policies, CSP/CORS, secrets, GDPR/PECR analytics posture |
| 12 | [`local-development.md`](./local-development.md) | Run Strapi locally (MySQL/sqlite), env, admin bootstrap, seeding |
| 13 | [`known-issues.md`](./known-issues.md) | Tech debt: sub-page populate fallback, private GHCR, UNVERIFIED items |
| 14 | [`glossary.md`](./glossary.md) | Glossary of terms |

> NOTE: `deployment.md` and `api-contract.md` already existed in this repo
> before this set was written. They describe a Render/AWS reference
> architecture. The **authoritative production deployment** (Contabo VPS +
> GHCR + docker-compose) is documented in this set's `deployment.md`, which
> supersedes the older `deployment.md` for the live environment. The older
> `api-contract.md`, `frontend-integration.md` and `keycloak-setup.md` remain
> valid integration references and are cross-linked where relevant.

## Pre-existing reference docs (kept)

- [`api-contract.md`](./api-contract.md) — endpoint-by-endpoint payload examples for the Next.js team.
- [`frontend-integration.md`](./frontend-integration.md) — advisory patch for wiring the Next.js app to the CMS.
- [`keycloak-setup.md`](./keycloak-setup.md) — realm + client configuration for OIDC SSO.

## Conventions used in these docs

- Every claim is derived from code in this repo; file paths (and line numbers
  where load-bearing) are cited inline.
- Diagrams are Mermaid.
- Environment variables are documented by **name + purpose + where set**; no
  secret values appear.
- Items that could not be verified from code are marked `UNVERIFIED:` with the
  reason.
