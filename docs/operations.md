# Operations & Runbooks

> Day-2 operations for the production VPS stack: DB + uploads backup/restore,
> crash-loop diagnosis (incl. the description-length bug), reseed, cron
> verification, and log access.
>
> Last reviewed: 2026-05-27 (commit 262ccc6)

## Contents

- [Shared-VPS rules](#shared-vps-rules)
- [Log access](#log-access)
- [Database backup & restore](#database-backup--restore)
- [Uploads-volume backup & restore](#uploads-volume-backup--restore)
- [Crash-loop: "Data too long for column 'description'"](#crash-loop-descriptiontoolong)
- [Other crash-loop causes](#other-crash-loop-causes)
- [Reseed](#reseed)
- [Cron verification](#cron-verification)
- [Rotating the public API token](#rotating-the-public-api-token)

## Shared-VPS rules

The Contabo host is **shared**. NEVER run host-wide destructive Docker commands
(`docker system prune`, a bare `docker compose down` that could affect other
projects, `docker volume prune`). Always scope to this stack and prefer
`up -d --force-recreate <service>` and `stop`/`start` of named services. The
compose project name is `inspire-africa`.

## Log access

```bash
cd /opt/inspire-africa
docker compose logs -f cms                 # follow CMS logs
docker compose logs --since=1h cms         # last hour
docker compose logs cms | grep -E "\[seed-content|\[bootstrap|\[analytics-cron|\[revalidate"
docker compose ps                          # service + health status
```

Useful log prefixes: `[bootstrap]`, `[seed-roles]`, `[seed-admin-roles]`,
`[ensure-api-token]`, `[seed-content]`, `[analytics-cron]`,
`[revalidate-frontend]`, `[keycloak]`, `[is-analytics-ingest]`.

## Database backup & restore

MySQL runs in the `db` container (internal only). Use `mysqldump` inside the
container; root credentials come from `MYSQL_ROOT_PASSWORD` in
`/opt/inspire-africa/.env`.

**Backup:**

```bash
cd /opt/inspire-africa
TS=$(date +%F-%H%M)
docker compose exec -T db sh -c \
  'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction \
   --routines --triggers "$MYSQL_DATABASE"' > "/opt/inspire-africa/backups/cms-db-$TS.sql"
```

`--single-transaction` gives a consistent dump without locking (InnoDB). Store
backups off-box (rsync/object storage) and rotate. **Always back up before a
reseed, an image upgrade, or a schema change.**

**Restore:**

```bash
cd /opt/inspire-africa
docker compose exec -T db sh -c \
  'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < backups/cms-db-<TS>.sql
docker compose up -d --force-recreate cms   # let Strapi re-validate schema
```

## Uploads-volume backup & restore

Production stores media on the `cms_uploads` named volume
(`MEDIA_PROVIDER=local`, mounted at `/app/public/uploads`).

**Backup:**

```bash
docker run --rm \
  -v inspire-africa_cms_uploads:/data:ro \
  -v /opt/inspire-africa/backups:/backup \
  alpine tar czf /backup/cms-uploads-$(date +%F-%H%M).tar.gz -C /data .
```

(Confirm the actual volume name with `docker volume ls | grep uploads` — compose
prefixes it with the project name `inspire-africa_`.)

**Restore:**

```bash
docker run --rm \
  -v inspire-africa_cms_uploads:/data \
  -v /opt/inspire-africa/backups:/backup \
  alpine sh -c 'cd /data && tar xzf /backup/cms-uploads-<TS>.tar.gz'
```

> Because uploads live on the volume (not S3), they are **only** protected by
> this backup. Don't delete the volume. A migration to S3/Cloudinary would
> remove this single point of failure (see [`known-issues.md`](./known-issues.md)).

## Crash-loop: description-too-long

**Symptom:** `cms` restarts repeatedly; logs show a MySQL error like
`Data too long for column 'description'` during `[seed-admin-roles]`, before
`[bootstrap] ... ready`.

**Cause:** `admin_roles.description` is `VARCHAR(255)` on a fresh DB; an
admin-role spec description exceeded it. The seeder now clamps descriptions to
250 chars (`src/bootstrap/seed-admin-roles.ts:179-182`), so current images do
**not** hit this. The live DB additionally had the column **widened to
VARCHAR(500)** after the original incident.

**If it recurs** (e.g. a future spec exceeds 250, or on a DB without the clamp):

```bash
cd /opt/inspire-africa
# Widen the column as a belt-and-braces fix:
docker compose exec -T db sh -c \
  'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" \
   -e "ALTER TABLE admin_roles MODIFY description VARCHAR(500);"'
docker compose up -d --force-recreate cms
```

The durable fix is the in-code clamp; the `ALTER TABLE` is a safety net.

## Other crash-loop causes

| Symptom in logs | Likely cause | Action |
|------------------|--------------|--------|
| `ECONNREFUSED`/`getaddrinfo` to `db` | DB not healthy yet / wrong `DATABASE_HOST` | ensure `db` healthy first; `DATABASE_HOST=db` |
| `Missing APP_KEYS`/secret errors | secrets unset in `.env` | populate all required secrets (see [`environment.md`](./environment.md)) |
| `attempt to write a readonly database` | SQLite anchored to `dist/` | not applicable in prod (MySQL); dev-only — see `config/database.ts:53-68` |
| reseed reverts editor content on restart | `RESEED_CONTENT=true` left set | unset it; reseed is one-shot ([`seeding.md`](./seeding.md)) |
| analytics ingest all 403 | `ANALYTICS_INGEST_TOKEN` unset/mismatched | set the **same** value on web + cms |

## Reseed

See [`seeding.md`](./seeding.md#running-a-reseed-safely). Back up the DB first.
One-shot `RESEED_CONTENT=true`, watch for `[seed-content] DONE.`, then recreate
without it.

## Cron verification

The nightly analytics maintenance runs at `02:15 UTC` when `CRON_ENABLED` is
true (`config/server.ts`). To verify:

```bash
docker compose logs cms | grep "\[analytics-cron\]"
# expect, after 02:15 UTC:
#   [analytics-cron] rollup YYYY-MM-DD: <n> sessions, <n> pageviews, <n> events.
#   [analytics-cron] purge < YYYY-MM-DD: removed <n> events, <n> sessions.
#   [analytics-cron] maintenance complete.
```

To force a build for testing, you can call `buildRollupForDate`/
`runAnalyticsMaintenance` from a `strapi console` session, or simply wait for
the schedule. If rollups never appear: check `CRON_ENABLED` and the container
clock/timezone (the task is pinned to UTC).

## Rotating the public API token

1. Admin → Settings → API Tokens → regenerate/create a read-only token.
2. Update `STRAPI_PUBLIC_TOKEN` in `/opt/inspire-africa/.env`.
3. `docker compose up -d --force-recreate web`.
4. Revoke the old token in the admin.

The auto-seeded `nextjs-public` token never expires; rotate it on schedule or on
suspected compromise. See [`security-privacy.md`](./security-privacy.md).
