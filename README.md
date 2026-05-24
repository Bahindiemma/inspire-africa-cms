# INSPIRE AFRICA — CMS (Strapi v5)

Headless CMS for the [INSPIRE AFRICA Next.js website](../INSPIRE%20AFRICA%20WEBSITE/).
Every string, image, link, color, blog post, SEO meta, and form copy on the
public site is sourced from here via REST.

## Quick start

```bash
npm install
cp .env.example .env
# 1. generate APP_KEYS, JWT secrets etc — see .env.example
# 2. create the MySQL database + user:
#    CREATE DATABASE inspire_africa_cms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
#    CREATE USER 'strapi'@'%' IDENTIFIED BY '<password>';
#    GRANT ALL PRIVILEGES ON inspire_africa_cms.* TO 'strapi'@'%';
#    FLUSH PRIVILEGES;
# 3. set DATABASE_* in .env to match
npm run develop      # http://localhost:1337/admin
```

> No MySQL installed locally? Two zero-setup paths:
> - **SQLite for prototyping**: set `DATABASE_CLIENT=sqlite` + `DATABASE_FILENAME=.tmp/data.db`. Boots in seconds, no DB to install.
> - **Docker MySQL**: `docker run --name inspire-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=inspire_africa_cms -p 3306:3306 -d mysql:8 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci`

First boot will create the admin tables. Then:

1. Create the super-admin (web UI walks you through it).
2. **Settings → API Tokens → Create new** — name `nextjs-public`, type `Read-only`. Copy the token into the Next.js app's `.env` as `STRAPI_PUBLIC_TOKEN`.
3. **Settings → Users & Permissions → Roles → Public** — uncheck everything. The public token controls all read access; the anonymous Public role only needs `POST` on `form-submission`.
4. *(Optional)* `npm run seed:roles` — idempotently creates `inspire-admin`, `inspire-editor`, `inspire-viewer` roles with correct permissions.

## Stack

| Layer            | Choice                                                              |
| ---------------- | ------------------------------------------------------------------- |
| CMS              | Strapi v5.13 (TypeScript)                                           |
| Database         | **MySQL 8 / MariaDB 10.11+** (default); PostgreSQL also wired      |
| Auth             | Keycloak OIDC (custom strategy) + Strapi API tokens for public      |
| Media            | AWS S3 + CloudFront (default), Cloudinary alternate, env-toggled    |
| Email            | SendGrid                                                            |
| Cache invalidation| Lifecycle webhook → Next.js `/api/revalidate`                       |

## Layout

```
inspire-africa-cms/
├── config/                       Strapi configuration (server, db, plugins, …)
├── src/
│   ├── api/                      Collection types + their controllers/services/routes
│   ├── components/               Reusable schema fragments (shared, sections, cards, blocks)
│   ├── extensions/               User-permissions OIDC strategy lives here
│   ├── policies/                 Route-level access guards
│   ├── middlewares/              Frontend revalidation webhook lives here
│   ├── bootstrap/                Idempotent role + permission seeding
│   └── index.ts                  Strapi entrypoint (register + bootstrap)
├── docs/                         Operational + integration documentation
│   ├── api-contract.md           Every public endpoint with example payloads
│   ├── deployment.md             Runbook for production deploy
│   ├── keycloak-setup.md         Realm + client configuration
│   └── frontend-integration.md   Advisory diff for the Next.js side
├── Dockerfile
├── render.yaml                   Render.com one-click config (example)
└── .env.example                  Every env var documented
```

## Content model — at a glance

| Type                | API ID            | Kind       | Public via token? |
| ------------------- | ----------------- | ---------- | ----------------- |
| Site Settings       | `site-setting`    | Single     | ✓ read            |
| Design Tokens       | `design-tokens`   | Single     | ✓ read            |
| Navigation          | `navigation`      | Single     | ✓ read            |
| Page                | `page`            | Collection | ✓ read (published)|
| Corridor            | `corridor`        | Collection | ✓ read            |
| Blog Post           | `blog-post`       | Collection | ✓ read (published)|
| Tag                 | `tag`             | Collection | ✓ read            |
| Author              | `author`          | Collection | ✓ read            |
| Legal Document      | `legal-document`  | Collection | ✓ read (published)|
| Job Posting         | `job-posting`     | Collection | ✓ read (published)|
| Form Definition     | `form-definition` | Collection | ✓ read            |
| Form Submission     | `form-submission` | Collection | ✗ create only     |
| Candidate           | `candidate`       | Collection | ✗ admin only      |

## Admin branding

The Strapi admin login page and dashboard are branded for INSPIRE AFRICA.

| Element                  | What we customised                                     | Where it lives                                  |
| ------------------------ | ------------------------------------------------------ | ----------------------------------------------- |
| Login page logo          | Transparent PNG wordmark                               | `src/admin/extensions/auth-logo.png`            |
| Left-menu logo (sidebar) | Same wordmark, smaller render                          | `src/admin/extensions/menu-logo.png`            |
| Browser favicon          | Yellow square + bold "I" (256×256, square crop)        | `src/admin/extensions/favicon.png`              |
| Browser tab title        | `INSPIRE AFRICA — CMS`                                  | `config/admin.ts` + `src/admin/app.tsx`         |
| Login welcome copy       | `INSPIRE AFRICA — Sign in to the labour-mobility CMS`  | `src/admin/app.tsx` (translations override)    |
| Workspace name           | `Labour Mobility CMS`                                  | `src/admin/app.tsx`                             |
| Primary color            | Brand yellow `#F8BD26`                                  | `src/admin/app.tsx` (theme.light/dark)         |
| Display font             | Madimi One on headings + brand text                     | `src/admin/app.tsx` (bootstrap injects CSS)     |
| Tutorials / video links  | Hidden                                                  | `src/admin/app.tsx` (`tutorials: false`)        |
| Release-notes popups     | Hidden                                                  | `src/admin/app.tsx` (`notifications.releases`)  |
| Strapi blog / promo widgets | Hidden via CSS                                       | `src/admin/app.tsx` (`bootstrap` CSS overrides) |

After any change in `src/admin/`, **rebuild the admin bundle**:

```bash
npm run build
# then restart:
npm run start            # production
# or
npm run develop          # dev with auto-reload on src/admin/* changes
```

The first build takes ~30 s. Subsequent dev rebuilds are near-instant.

To replace the logo with an updated version: drop a new `auth-logo.png` /
`menu-logo.png` into `src/admin/extensions/` and rebuild. Same path
works for `favicon.png`.

## Deploying

See [`docs/deployment.md`](./docs/deployment.md) for the full runbook.
TL;DR: managed **MySQL** (DigitalOcean Managed DB / AWS RDS MySQL 8 / PlanetScale) + Render or Railway for Strapi + CloudFront in front of S3 + Keycloak Cloud or self-hosted.
