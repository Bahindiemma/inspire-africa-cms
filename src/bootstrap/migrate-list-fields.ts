import type { Core } from '@strapi/strapi';

/**
 * Second half of the fixed-list → collection migration (2026-11-24). First
 * half: database/migrations/2026.11.24T00.00.00.stash-list-fields.js.
 *
 *  - Job Posting `sector`             → Sector collection
 *  - Job Posting `destinationCountry` → Corridor collection (existing list)
 *  - Testimonial card `flag`          → Testimonial Label collection
 *
 * 1. On an empty Sector / Testimonial Label collection, create the values the
 *    old fixed lists offered, in their old order. Never again once any entry
 *    exists, so an entry an editor deletes stays deleted.
 * 2. Link every stashed row to its entry, straight in the join table (no
 *    re-publish, which would push draft edits live). A job's draft row links
 *    to the corridor's draft, its live row to the corridor's live version.
 *    A destination with no corridor yet (e.g. Mauritius) is left pending and
 *    logged; it links on a later boot once an editor creates that corridor.
 * 3. Sector and Testimonial Label list views: sorted by `order`.
 *
 * Idempotent: applied rows are stamped, and a row that already has a value is
 * never overwritten.
 */
const JOB = 'api::job-posting.job-posting';
const SECTOR = 'api::sector.sector';
const CORRIDOR = 'api::corridor.corridor';
const LABEL = 'api::testimonial-label.testimonial-label';
const TESTIMONIAL = 'cards.testimonial';
const STASH = 'list_field_stash';

export const DEFAULT_SECTORS = [
  'Healthcare',
  'Care',
  'Hospitality',
  'Construction',
  'Manufacturing',
  'Agriculture',
  'Tech',
  'Mining',
  'Logistics',
  'Other',
];

export const DEFAULT_LABELS = ['Worker voice', 'Employer voice', 'Government voice', 'Partner voice'];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Find an entry by name (case-insensitive) or create it. Returns its row id. */
async function ensureNamed(strapi: Core.Strapi, uid: string, name: string, order: number): Promise<number> {
  const all: any[] = await strapi.db.query(uid as any).findMany({ select: ['id', 'name'] });
  const found = all.find((r) => String(r.name).trim().toLowerCase() === name.trim().toLowerCase());
  if (found) return found.id;
  const data: any = { name, order };
  if (uid === SECTOR) data.slug = slugify(name);
  await strapi.documents(uid as any).create({ data });
  const created = await strapi.db.query(uid as any).findOne({ where: { name } });
  return created.id;
}

async function seedDefaults(strapi: Core.Strapi, uid: string, names: string[], label: string) {
  if ((await strapi.db.query(uid as any).count()) > 0) return;
  for (const [i, name] of names.entries()) await ensureNamed(strapi, uid, name, (i + 1) * 10);
  strapi.log.info(`[lists] created ${names.length} starter ${label}`);
}

/**
 * Link one source row to one target row through the relation's join table,
 * unless that source row already has a value. Returns true when it linked.
 */
async function link(strapi: Core.Strapi, uid: string, attr: string, rowId: number, targetId: number) {
  const knex = strapi.db.connection;
  const meta: any = strapi.db.metadata.get(uid as any);
  const jt = meta.attributes[attr].joinTable;
  const srcCol: string = jt.joinColumn.name;
  const tgtCol: string = jt.inverseJoinColumn.name;

  if (!(await knex(meta.tableName).where({ id: rowId }).first())) return false;
  if (await knex(jt.name).where({ [srcCol]: rowId }).first()) return false;

  const row: Record<string, unknown> = { [srcCol]: rowId, [tgtCol]: targetId };
  if (jt.inverseOrderColumnName) {
    const max = await knex(jt.name).where({ [tgtCol]: targetId }).max({ m: jt.inverseOrderColumnName }).first();
    row[jt.inverseOrderColumnName] = Number((max as any)?.m ?? 0) + 1;
  }
  if (jt.orderColumnName) row[jt.orderColumnName] = 1;
  await knex(jt.name).insert(row);
  return true;
}

/** The corridor row a job row should point at: same draft/live state, default locale. */
async function corridorRowFor(strapi: Core.Strapi, country: string, jobRowId: number): Promise<number | null> {
  const knex = strapi.db.connection;
  const job = await knex(strapi.db.metadata.get(JOB as any).tableName).where({ id: jobRowId }).first();
  if (!job) return null;
  const live = job.published_at != null;
  const locale = (await strapi.plugin('i18n')?.service('locales')?.getDefaultLocale?.()) || 'en';
  const rows: any[] = await strapi.db.query(CORRIDOR).findMany({
    where: { locale, publishedAt: live ? { $notNull: true } : null },
    select: ['id', 'country', 'displayName'],
  });
  const want = country.trim().toLowerCase();
  const hit = rows.find(
    (r) => String(r.country).trim().toLowerCase() === want || String(r.displayName ?? '').trim().toLowerCase() === want
  );
  return hit ? hit.id : null;
}

async function applyStash(strapi: Core.Strapi) {
  const knex = strapi.db.connection;
  if (!(await knex.schema.hasTable(STASH))) return;
  const pending = await knex(STASH).whereNull('applied_at').orderBy('id');
  if (!pending.length) return;

  const counts: Record<string, { linked: number; skipped: number; waiting: number }> = {};
  const tally = (k: string) => (counts[k] ??= { linked: 0, skipped: 0, waiting: 0 });

  for (const row of pending) {
    const value = String(row.value).trim();
    const key = `${row.table_name}.${row.field}`;
    let linked = false;

    if (key === 'job_postings.sector') {
      const idx = DEFAULT_SECTORS.indexOf(value);
      const id = await ensureNamed(strapi, SECTOR, value, idx >= 0 ? (idx + 1) * 10 : 1000);
      linked = await link(strapi, JOB, 'sector', row.row_id, id);
    } else if (key === 'job_postings.destination_country') {
      const id = await corridorRowFor(strapi, value, row.row_id);
      if (id == null) {
        tally(key).waiting += 1;
        strapi.log.warn(
          `[lists] job posting row ${row.row_id}: no corridor "${value}" yet. Create and publish it (Content Manager → Corridor); it links on the next restart.`
        );
        continue; // stays pending
      }
      linked = await link(strapi, JOB, 'destinationCountry', row.row_id, id);
    } else if (key === 'components_cards_testimonials.flag') {
      const idx = DEFAULT_LABELS.indexOf(value);
      const id = await ensureNamed(strapi, LABEL, value, idx >= 0 ? (idx + 1) * 10 : 1000);
      linked = await link(strapi, TESTIMONIAL, 'flag', row.row_id, id);
    }

    if (linked) tally(key).linked += 1;
    else tally(key).skipped += 1;
    await knex(STASH).where({ id: row.id }).update({ applied_at: new Date() });
  }

  for (const [k, c] of Object.entries(counts)) {
    strapi.log.info(
      `[lists] ${k}: ${c.linked} linked, ${c.skipped} skipped (gone or already set), ${c.waiting} waiting for a corridor`
    );
  }
}

/** Sort the list view by `order` and show it, once per collection. */
async function configureListView(strapi: Core.Strapi, uid: string, columns: string[]) {
  const store = strapi.store({ type: 'core', name: 'inspire-africa' });
  const key = `list-view:${uid}`;
  if (await store.get({ key })) return;
  try {
    const svc: any = strapi.plugin('content-manager').service('content-types');
    const ct = svc.findContentType(uid);
    const conf = await svc.findConfiguration(ct);
    await svc.updateConfiguration(ct, {
      settings: { ...conf.settings, defaultSortBy: 'order', defaultSortOrder: 'ASC' },
      metadatas: conf.metadatas,
      layouts: { ...conf.layouts, list: columns },
    });
    await store.set({ key, value: new Date().toISOString() });
  } catch (e) {
    strapi.log.warn(`[lists] could not configure the ${uid} list view: ${(e as Error).message}`);
  }
}

export async function migrateListFields(strapi: Core.Strapi) {
  await seedDefaults(strapi, SECTOR, DEFAULT_SECTORS, 'sectors');
  await seedDefaults(strapi, LABEL, DEFAULT_LABELS, 'testimonial labels');
  await applyStash(strapi);
  await configureListView(strapi, SECTOR, ['name', 'order', 'slug']);
  await configureListView(strapi, LABEL, ['name', 'order']);
}
