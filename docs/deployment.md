# Deployment runbook

End-to-end deployment of `inspire-africa-cms` to production.

## Architecture

```
                  Public traffic (Next.js app)
                              │
                              ▼
                  ┌────────────────────┐
                  │   CloudFront CDN   │  ← media files
                  └────────────────────┘
                              │
                              ▼
                  ┌────────────────────┐
                  │     AWS S3         │  ← media storage
                  └────────────────────┘

  ┌────────────┐      ┌────────────────────┐      ┌──────────────────┐
  │  Keycloak  │ ◀──▶ │   Strapi v5 (this) │ ◀──▶ │  MySQL 8         │
  │  (OIDC)    │      │   on Render        │      │  (DO / RDS)      │
  └────────────┘      └────────────────────┘      └──────────────────┘
                              │
                              │  POST /api/revalidate
                              ▼
                       Next.js (Vercel)
```

## 1. Provision MySQL

Strapi v5 supports MySQL 5.7.8+ and MariaDB 10.3+ as first-class clients.
The driver (`mysql2`) is already in `package.json`.

**Option A — DigitalOcean Managed MySQL (recommended for ease + cost)**
1. Create cluster `inspire-africa-cms` in your preferred EU region.
2. MySQL 8.0, smallest plan (~$15/mo for dev, ~$30/mo for prod with backups).
3. Add the Render service's outbound IP (or 0.0.0.0/0 if Render egress is dynamic — then **must** enforce SSL).
4. Create the DB + user (DigitalOcean's console can do this for you):

   ```sql
   CREATE DATABASE inspire_africa_cms
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci;
   CREATE USER 'strapi'@'%' IDENTIFIED BY '<strong-password>';
   GRANT ALL PRIVILEGES ON inspire_africa_cms.* TO 'strapi'@'%';
   FLUSH PRIVILEGES;
   ```

5. Set in Strapi env:

   ```env
   DATABASE_CLIENT=mysql
   DATABASE_HOST=<do-host>.db.ondigitalocean.com
   DATABASE_PORT=25060
   DATABASE_NAME=inspire_africa_cms
   DATABASE_USERNAME=strapi
   DATABASE_PASSWORD=<strong-password>
   DATABASE_SSL=true
   DATABASE_SSL_REJECT_UNAUTHORIZED=true
   ```

**Option B — AWS RDS MySQL 8**
1. `db.t4g.micro` for dev, `db.t4g.small` for prod, multi-AZ for production.
2. Private subnet; security group allows port 3306 from the Strapi host SG only.
3. Enable automated backups (7 days minimum) + parameter group enforcing `character_set_server=utf8mb4`.
4. Connection string identical shape to Option A — replace host + port.

**Option C — PlanetScale**
1. PlanetScale uses the MySQL wire protocol but doesn't support foreign keys by default. **Set `RELATION_MODE=prisma` in their dashboard and verify Strapi v5 relations still work** — Strapi v5 expects FKs.
2. Recommended only if you specifically need branching/serverless and are willing to accept the trade-off.

**Charset gotcha (read once):** always `utf8mb4` (4-byte UTF-8). The legacy `utf8` charset in MySQL is 3-byte and silently truncates emoji and some African scripts. Strapi rich-text and any user-supplied content will hit this.

## 1bis. (Alternative) PostgreSQL

PostgreSQL is also first-class supported — the scaffold's `config/database.ts`
routes both clients. To swap:

```bash
# pg driver is already in package.json
```

```env
DATABASE_CLIENT=postgres
DATABASE_PORT=5432
DATABASE_SCHEMA=public
```

Managed options: **Neon** (serverless, free tier), **Supabase**, **AWS RDS for PostgreSQL**, **DigitalOcean Managed Postgres**, or the **Render-bundled Postgres** in `render.yaml`.

## 1ter. (Alternative) MongoDB

Strapi v5 does not ship an official MongoDB connector. To use MongoDB:

```bash
npm install strapi-database-mongo   # community-maintained, lags behind Strapi releases
```

Then set:

```env
DATABASE_CLIENT=mongo
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/inspire_africa_cms
```

and replace the connector wiring in `config/database.ts` per the community connector's README. **Trade-off**: you lose access to Strapi's relation/transactional guarantees for some advanced relations. Strapi v5 single-types, collection types with basic relations, and Dynamic Zones work; many-to-many with join tables and some lifecycle behaviours may differ.

## 2. Provision S3 + CloudFront

```bash
aws s3api create-bucket --bucket inspire-africa-cms-media \
  --region eu-west-2 --create-bucket-configuration LocationConstraint=eu-west-2
aws s3api put-public-access-block --bucket inspire-africa-cms-media \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

Create the IAM user `inspire-cms-uploader` with least-privilege policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"
    ],
    "Resource": [
      "arn:aws:s3:::inspire-africa-cms-media",
      "arn:aws:s3:::inspire-africa-cms-media/*"
    ]
  }]
}
```

Create a CloudFront distribution with the S3 bucket as origin (use Origin Access Control). Set the alternate domain name to `cdn.inspireafricans.com` and attach an ACM cert.

Set Strapi env:

```env
MEDIA_PROVIDER=aws-s3
AWS_ACCESS_KEY_ID=<from-iam>
AWS_SECRET_ACCESS_KEY=<from-iam>
AWS_REGION=eu-west-2
AWS_BUCKET=inspire-africa-cms-media
AWS_CDN_BASE_URL=https://cdn.inspireafricans.com
AWS_S3_ACL=public-read
```

## 3. Provision Keycloak

See [`keycloak-setup.md`](./keycloak-setup.md). Self-host or use Keycloak Cloud.

## 4. Deploy Strapi (Render — chosen for simplicity)

Render gives you free Postgres → managed Strapi node in two commits. Free tier is enough for editorial; bump to a Starter for production media.

A ready `render.yaml` lives in the repo root. To deploy:

1. Push `inspire-africa-cms` to its own GitHub repo (NOT inside the Next.js repo).
2. In Render dashboard, "New → Blueprint", point at the repo.
3. Render reads `render.yaml`, provisions the Postgres + the web service.
4. In the Render dashboard, paste env vars from `.env.example`.
5. Service builds + boots; first boot creates schema and runs `seedRoles`.

Alternative hosts that work identically: **Railway** (`railway.json`), **DigitalOcean App Platform** (`spec.yaml`), or self-host the `Dockerfile` on Fly.io / a VPS.

## 5. First-boot steps (one-off, in this order)

1. Open `https://cms.inspireafricans.com/admin` → create the super-admin.
2. Settings → Internationalization → confirm `en-GB` (and add `fr-FR` if needed).
3. Settings → Users & Permissions → Roles → check that `inspire-admin`, `inspire-editor`, `inspire-viewer` exist (seeded automatically; if not, run `npm run seed:roles`).
4. Settings → Users & Permissions → Roles → **Public** → confirm only `form-submission.create` is enabled.
5. Settings → API Tokens → **Create new** → name `nextjs-public` → type `Read-only` → duration `Unlimited` → copy token → put in Next.js `.env` as `STRAPI_PUBLIC_TOKEN`.
6. Settings → Webhooks → optional: extra Slack/Make webhook on Entry Publish for editor notifications.

## 6. Smoke tests (after deploy)

See the bottom of [`api-contract.md`](./api-contract.md) — copy/paste the `curl` block. Expected outcome: `200 200 200 403 403 201`.

## 7. Backups

- **Postgres**: managed provider's automated daily backups; 7-day retention minimum.
- **S3**: enable versioning + lifecycle to Glacier after 90 days.
- **Strapi config + uploads**: covered by the above two.

## 8. Observability

- Render auto-tails logs to its dashboard.
- For production, ship logs to Datadog / Logtail via the Strapi `winston` transport.
- Strapi's built-in `/admin/marketplace` has a UptimeRobot integration if you want page-level uptime alerts.

## 9. Rotating secrets

Quarterly:
1. Generate fresh `APP_KEYS`, `ADMIN_JWT_SECRET`, `JWT_SECRET`, `API_TOKEN_SALT`, `TRANSFER_TOKEN_SALT`.
2. Update them in Render env.
3. Restart service (this invalidates all admin sessions — expected).
4. Generate a new public API token, update Next.js, revoke the old token.
