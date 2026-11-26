import type { Core } from '@strapi/strapi';

/**
 * Second half of the enum → Category migration (first half:
 * database/migrations/2026.11.22T00.00.00.stash-blog-categories.js).
 *
 *  1. On an empty Category collection, create the categories the old
 *     enumeration offered, in their original order, so editors start from the
 *     list they know. Never runs again once any category exists, so a category
 *     an editor deletes stays deleted.
 *  2. For every stashed row not yet applied, make sure a Category with that
 *     name exists and link that exact `blog_posts` row (draft AND published
 *     copies, every locale) to it, directly in the join table. Going through
 *     the document service would mean re-publishing, which would push unsaved
 *     draft edits live.
 *
 * Idempotent: applied rows are stamped, and a row is only linked if it has no
 * category yet.
 */
const BLOG = 'api::blog-post.blog-post';
const CATEGORY = 'api::category.category';
const STASH = 'blog_category_stash';

export const DEFAULT_CATEGORIES = [
  'Ethical Recruitment',
  'Policy & Markets',
  'Development Economics',
  'Worker Stories',
  'Employer Stories',
  'Government Partnerships',
  'Platform Updates',
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensureCategory(strapi: Core.Strapi, name: string, order: number): Promise<number> {
  const found = await strapi.db.query(CATEGORY).findOne({ where: { name } });
  if (found) return found.id;
  await strapi.documents(CATEGORY).create({
    data: { name, slug: slugify(name), order } as any,
  });
  const created = await strapi.db.query(CATEGORY).findOne({ where: { name } });
  return created.id;
}

/**
 * Category list view: show the `order` column and sort by it, so the order
 * editors set is the order they see. Applied only while the view is still
 * Strapi's untouched default (list = id/name/slug/description, sorted by
 * name); once anyone changes it under "Configure the view", this leaves it alone.
 */
async function configureCategoryListView(strapi: Core.Strapi) {
  try {
    const svc: any = strapi.plugin('content-manager').service('content-types');
    const ct = svc.findContentType(CATEGORY);
    const conf = await svc.findConfiguration(ct);
    const list: string[] = conf?.layouts?.list ?? [];
    const untouched =
      conf?.settings?.defaultSortBy === 'name' &&
      list.join(',') === ['id', 'name', 'slug', 'description'].join(',');
    if (!untouched) return;
    await svc.updateConfiguration(ct, {
      settings: { ...conf.settings, defaultSortBy: 'order', defaultSortOrder: 'ASC' },
      metadatas: conf.metadatas,
      layouts: { ...conf.layouts, list: ['name', 'order', 'slug', 'color'] },
    });
    strapi.log.info('[categories] list view: sorted by order, order column shown');
  } catch (e) {
    strapi.log.warn(`[categories] could not configure the list view: ${(e as Error).message}`);
  }
}

export async function migrateBlogCategories(strapi: Core.Strapi) {
  const knex = strapi.db.connection;
  await configureCategoryListView(strapi);

  // 1. Starter list on an empty collection.
  const count = await strapi.db.query(CATEGORY).count();
  if (count === 0) {
    for (const [i, name] of DEFAULT_CATEGORIES.entries()) {
      await ensureCategory(strapi, name, (i + 1) * 10);
    }
    strapi.log.info(`[categories] created ${DEFAULT_CATEGORIES.length} starter categories`);
  }

  // 2. Apply the stash, if the migration left one.
  if (!(await knex.schema.hasTable(STASH))) return;
  const pending = await knex(STASH).whereNull('applied_at').orderBy('id');
  if (!pending.length) return;

  const meta: any = strapi.db.metadata.get(BLOG);
  const jt = meta.attributes.category.joinTable;
  const postCol: string = jt.joinColumn.name;
  const catCol: string = jt.inverseJoinColumn.name;
  const ordCol: string | undefined = jt.inverseOrderColumnName;

  const nextOrder: Record<number, number> = {};
  let linked = 0;
  let skipped = 0;

  for (const row of pending) {
    const name = String(row.category).trim();
    const idx = DEFAULT_CATEGORIES.indexOf(name);
    const catId = await ensureCategory(strapi, name, idx >= 0 ? (idx + 1) * 10 : 1000);

    const postExists = await knex(meta.tableName).where({ id: row.blog_post_id }).first();
    const alreadyLinked = await knex(jt.name).where({ [postCol]: row.blog_post_id }).first();

    if (postExists && !alreadyLinked) {
      if (nextOrder[catId] === undefined) {
        const max = ordCol
          ? await knex(jt.name).where({ [catCol]: catId }).max({ m: ordCol }).first()
          : null;
        nextOrder[catId] = Number(max?.m ?? 0);
      }
      nextOrder[catId] += 1;
      await knex(jt.name).insert({
        [postCol]: row.blog_post_id,
        [catCol]: catId,
        ...(ordCol ? { [ordCol]: nextOrder[catId] } : {}),
      });
      linked += 1;
    } else {
      skipped += 1;
    }
    await knex(STASH).where({ id: row.id }).update({ applied_at: new Date() });
  }

  strapi.log.info(
    `[categories] migrated enum → relation: ${linked} blog post rows linked, ${skipped} skipped (gone or already linked)`
  );
}
