# RBAC & Roles

> Two separate role systems: admin-panel roles (CMS editors who log into
> `/admin`) and users-permissions roles (API consumers). What each seeded role
> can do, the "Policy Failed" fix, and the `admin_roles.description` caveat.
>
> Last reviewed: 2026-05-27 (commit 262ccc6)

## Contents

- [Two role systems](#two-role-systems)
- [Users-permissions roles](#users-permissions-roles)
- [The Public role lock](#the-public-role-lock)
- [Admin-panel roles](#admin-panel-roles)
- [The "Policy Failed" fix](#the-policy-failed-fix)
- [The admin_roles.description VARCHAR caveat](#the-admin_rolesdescription-varchar-caveat)
- [Keycloak role mapping](#keycloak-role-mapping)

## Two role systems

Strapi has two unrelated permission engines:

| System | Table | Who | Seeded by |
|--------|-------|-----|-----------|
| **Users-permissions** | `plugin::users-permissions.role` | API consumers (Next.js token, anonymous form submitters, Keycloak-provisioned users) | `src/bootstrap/seed-roles.ts` |
| **Admin panel** | `admin::role` | People who log into `/admin` to manage content | `src/bootstrap/seed-admin-roles.ts` |

Both seeders run on every boot (idempotent) and treat the file as the source of
truth — they **delete all permissions for a managed role and re-create them**
each boot.

## Users-permissions roles

`src/bootstrap/seed-roles.ts`. Action sets: READ = `find, findOne`; WRITE =
`create, update`; ALL = READ + WRITE + `delete`.

| Role (`type`) | Permissions |
|---------------|-------------|
| `inspire-admin` | **ALL** on all `PUBLIC_READABLE` types **and** the `ADMIN_ONLY` set (candidate, form-submission, site-setting, design-token, navigation) |
| `inspire-editor` | READ+WRITE on editorial types (page, blog-post, job-posting, legal-document, tag, author, corridor); READ on the rest of `PUBLIC_READABLE`. No deletes, no users, no PII |
| `inspire-viewer` | READ on `PUBLIC_READABLE` only (= identical to the public token surface) |

`PUBLIC_READABLE` = site-setting, design-token, navigation, page, corridor,
blog-post, tag, author, legal-document, job-posting, form-definition
(`seed-roles.ts:29-41`).

> The custom `form-submission` controller additionally hard-gates GET/PUT/DELETE
> to `inspire-admin` regardless of role permissions
> (`controllers/form-submission.ts:85-90`).

## The Public role lock

`seed-roles.ts:117-131`: the built-in `public` role has **all** its permissions
deleted and re-created with exactly one:
`api::form-submission.form-submission.create`. So unauthenticated visitors can
submit forms but cannot read anything — all public reads go through the
read-only API token (`nextjs-public`). Confirm in the admin under
Settings → Users & Permissions → Roles → Public.

## Admin-panel roles

`src/bootstrap/seed-admin-roles.ts` adds three roles alongside Strapi's built-in
Super Admin / Editor / Author. Permissions use the content-manager explorer
actions (`read/create/update/delete/publish`) per content-type `subject`.

| Role (`code`) | Content types | Actions |
|---------------|---------------|---------|
| **Content Manager** (`inspire-content-manager`) | All editorial types (page, blog-post, job-posting, legal-document, corridor, tag, author, form-definition) | read, create, update, delete, publish — **plus** end-user management + analytics read (see below) |
| **Blog Editor** (`inspire-blog-editor`) | blog-post, tag, author | read, create, update, delete, publish |
| **Read-only Viewer** (`inspire-readonly`) | All editorial + site-setting, design-token, navigation, + the 3 analytics types | read only |

Content Manager explicitly **cannot** edit Site Settings / Design Tokens /
Navigation, nor manage admin-panel users (those stay with Super Admin).

### Content Manager extra permissions

`seed-admin-roles.ts:114-147` (`extraPermissions`):

- `content-manager.explorer.{read,create,update,delete}` on
  `plugin::users-permissions.user` — so Content Managers can manage **end
  users** via Content Manager → Users.
- `plugin::users-permissions.roles.read` (`subject: null`) — so the **Role**
  dropdown populates when assigning a role to a user.
- `content-manager.explorer.read` on the three analytics types — so they can
  open the **Analytics** dashboard (which reads via the content-manager API).

## The "Policy Failed" fix

Symptom: a Content Manager opening the user-create screen (to add an end user
and pick their role) hit a **"Policy Failed"** error, because the role
relation's options couldn't be read.

Fix (`seed-admin-roles.ts:111-139`): grant the Content Manager
`plugin::users-permissions.roles.read` (with `subject: null`, `properties: {}` —
the exact shape Strapi stores for plugin-settings permissions) alongside the
`users-permissions.user` CRUD permissions. With `roles.read` granted, the role
dropdown loads and the policy passes.

The analytics-read grant on the same role was added for the same reason — the
dashboard's content-manager reads would otherwise be denied.

## The admin_roles.description VARCHAR caveat

`seed-admin-roles.ts:179-182`:

```ts
// `admin_roles.description` is VARCHAR(255) on a fresh DB — clamp so a
// long spec description can never crash the bootstrap with "Data too
// long for column 'description'".
const description = spec.description.slice(0, 250);
```

Background: on a fresh database, `admin_roles.description` is `VARCHAR(255)`.
The Content Manager role's spec description is long; persisting it unclamped
caused a **"Data too long for column 'description'"** MySQL error that crashed
`bootstrap()` in a restart loop. Two mitigations are in place:

1. The seeder clamps every admin-role description to **250 chars** before
   writing (the permanent code-level guard).
2. On the **live DB**, the `admin_roles.description` column was separately
   **widened to VARCHAR(500)** after the original crash. This is a manual DB
   change, not reflected in code — see
   [`operations.md`](./operations.md#crash-loop-descriptiontoolong) for the
   diagnosis + the `ALTER TABLE` used.

> Because the clamp is in code, a brand-new environment will not crash on this
> even without the column widening. Keep the clamp; do not rely solely on the
> widened column.

## Keycloak role mapping

When SSO is enabled, `src/extensions/users-permissions/strategies/keycloak.ts`
maps Keycloak **realm roles** to users-permissions roles
(`resolveStrapiRole`): a user with the `KEYCLOAK_ROLE_ADMIN` realm role
(default `inspire-admin`) → `inspire-admin`; `KEYCLOAK_ROLE_EDITOR`
(default `inspire-editor`) → `inspire-editor`; otherwise `inspire-viewer`. The
role is re-synced on every login (Keycloak is the source of truth). The target
role must already be seeded. See [`api-reference.md`](./api-reference.md#keycloak-oidc-routes)
and [`keycloak-setup.md`](./keycloak-setup.md).
