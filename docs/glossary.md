# Glossary

> Terms used across the INSPIRE AFRICA CMS docs.
>
> Last reviewed: 2026-05-27 (commit 262ccc6)

| Term | Meaning |
|------|---------|
| **Strapi v5** | The headless CMS framework this repo runs (v5.46.1, TypeScript). |
| **Content type** | A Strapi model. *Collection type* = many entries (e.g. `blog-post`); *single type* = exactly one (e.g. `site-setting`). |
| **Component** | A reusable schema fragment embedded in content types (`src/components/*`). Groups: sections, blocks, cards, shared, tokens. |
| **Dynamic Zone** | A field holding an ordered list of mixed components (e.g. a page's `sections`, a post's `body`). Requires verbose `populate[…][on][…]` on the API. |
| **Document Service** | Strapi v5's `strapi.documents(uid)` API (replaces v4 `entityService`). Used by the seeder and the form controller. |
| **documentId** | Strapi v5 stable per-document identifier (distinct from the numeric `id`). |
| **Draft & Publish** | Strapi feature: entries have draft + published states; the public token only reads published entries. |
| **i18n** | Localisation. Several types/fields are `localized` (e.g. `title`, `body`); keys like `slug`/`formKey` are not. |
| **Users-permissions role** | API-consumer role (`plugin::users-permissions.role`): `inspire-admin/-editor/-viewer`, `public`. Seeded by `seed-roles.ts`. |
| **Admin-panel role** | CMS-editor role (`admin::role`): Content Manager / Blog Editor / Read-only Viewer + built-ins. Seeded by `seed-admin-roles.ts`. |
| **Public API token** | Read-only Strapi API token (`nextjs-public`) the website uses for content reads. Auto-seeded; env `STRAPI_PUBLIC_TOKEN`. |
| **Ingest token** | Shared secret (`ANALYTICS_INGEST_TOKEN`) guarding `POST /api/analytics/collect`. |
| **Policy** | A route-level guard (`src/policies/*`, registered as `global::<name>`). |
| **Middleware** | A request-chain handler (`config/middlewares.ts` + `src/middlewares/*`). |
| **Revalidation webhook** | The CMS → Next.js POST on publish that triggers `revalidateTag`/`revalidatePath`, refreshing the live site. |
| **Bootstrap / register** | Strapi lifecycle hooks in `src/index.ts`. `register()` adds Keycloak routes; `bootstrap()` runs the four seeders. |
| **Seeder** | Idempotent bootstrap function: `seedRoles`, `seedAdminRoles`, `ensurePublicApiToken`, `seedContent`. |
| **RESEED_CONTENT** | One-shot env flag that forces `seed-content.ts` to run on a non-empty DB. |
| **Rollup** | A pre-aggregated `analytics-daily-rollup` row built nightly so the dashboard avoids scanning raw events. |
| **ipHash** | Salted, truncated (/24 v4, /48 v6) SHA-256 of the visitor IP — the only IP-derived value stored. Raw IP is never stored. |
| **botScore** | 0–1 server-side bot likelihood per session (`src/utils/analytics/ua.ts`). |
| **GHCR** | GitHub Container Registry. The CMS image is `ghcr.io/bahindiemma/inspire-africa-cms` (private). |
| **VPS** | The Contabo virtual private server at `/opt/inspire-africa` hosting the compose stack, behind host nginx. |
| **Keycloak / OIDC** | Optional SSO via OpenID Connect; custom strategy maps realm roles to users-permissions roles. |
| **CSP / CORS** | Content-Security-Policy and Cross-Origin Resource Sharing, configured in `config/middlewares.ts`. CORS is an allow-list, never `*`. |
| **PII** | Personally Identifiable Information — present in `candidate` and `form-submission`; sensitive fields are `private`. |
| **`private` field** | A schema flag that excludes a field from REST responses. |
| **PECR** | Privacy and Electronic Communications Regulations (UK) — relevant to consent-gated analytics. |
| **Corridor** | A destination labour-mobility market (UK, EU, USA, …) shown on the site. |
| **Design tokens** | CMS-managed CSS variable values (`design-token` single type) driving the site's brand surface. |
