import type { Core } from '@strapi/strapi';
import { hasRichContent, itemsToListBlocks, textToBlocks } from '../utils/rich-text';

/**
 * Rich text and blog dates (2026-11-23). Runs on every boot and is idempotent.
 *
 *  1. Lede, Callout, Quote and List blocks gained a rich-text `content` field.
 *     Any row whose `content` is empty but whose old field (`text` / `items`)
 *     has words gets `content` built from it, keeping the inline <a>/<strong>
 *     the legal pages use as real links and bold. Rows are written directly
 *     (draft and published copies alike, same words as before), so nothing is
 *     re-published and no draft edit goes live.
 *     rich-text-sync.ts keeps the old field in step from then on, so a row an
 *     editor empties stays empty.
 *  2. Blog posts gain `displayDate`. Once, every post that is already published
 *     gets the date it currently shows (its earliest `publishedAt` across
 *     locales), so turning dates back on later shows the dates readers saw.
 *     Existing rows get the new fields' defaults (useSiteSetting, dates off).
 *  3. Content Manager: the old fields are hidden in the editor, and the new
 *     fields get plain-English labels and help text.
 */
const BLOG = 'api::blog-post.blog-post';
const SITE = 'api::site-setting.site-setting';

const TEXT_COMPONENTS = ['blocks.lede', 'blocks.callout', 'blocks.quote'] as const;
const LIST_COMPONENT = 'blocks.list';

async function backfillComponent(strapi: Core.Strapi, uid: string): Promise<number> {
  const isList = uid === LIST_COMPONENT;
  const rows: any[] = await strapi.db.query(uid as any).findMany({
    select: isList ? ['id', 'items', 'ordered', 'content'] : ['id', 'text', 'content'],
  });
  let converted = 0;
  for (const row of rows) {
    if (hasRichContent(row.content)) continue;
    const content = isList ? itemsToListBlocks(row.items, !!row.ordered) : textToBlocks(row.text ?? '');
    if (!content.length) continue;
    await strapi.db.query(uid as any).update({ where: { id: row.id }, data: { content } as any });
    converted += 1;
  }
  return converted;
}

async function backfillDisplayDates(strapi: Core.Strapi) {
  const store = strapi.store({ type: 'core', name: 'inspire-africa' });
  if (await store.get({ key: 'display-date-backfill' })) return;

  const published: any[] = await strapi.db.query(BLOG).findMany({
    where: { publishedAt: { $notNull: true } },
    select: ['documentId', 'publishedAt'],
  });
  const earliest = new Map<string, string>();
  for (const r of published) {
    const day = new Date(r.publishedAt).toISOString().slice(0, 10);
    const cur = earliest.get(r.documentId);
    if (!cur || day < cur) earliest.set(r.documentId, day);
  }
  let rows = 0;
  for (const [documentId, day] of earliest) {
    const res: any = await strapi.db.query(BLOG).updateMany({
      where: { documentId, displayDate: null },
      data: { displayDate: day },
    });
    rows += Number(res?.count ?? 0);
  }
  await store.set({ key: 'display-date-backfill', value: { at: new Date().toISOString(), posts: earliest.size, rows } });
  strapi.log.info(`[rich-text] displayDate set on ${earliest.size} published posts (${rows} rows).`);
}

const OLD_FIELDS: Record<string, string[]> = {
  'blocks.lede': ['text'],
  'blocks.callout': ['text'],
  'blocks.quote': ['text'],
  'blocks.list': ['items', 'ordered'],
};

const CONTENT_LABEL: Record<string, string> = {
  'blocks.lede': 'Lede text',
  'blocks.callout': 'Callout text',
  'blocks.quote': 'Quote text',
  'blocks.list': 'List',
};

const CONTENT_HELP =
  'Select words and use the toolbar for bold, italic, underline, links and lists. Links to other websites open in a new tab. Shows on the website exactly as formatted here.';

/** Set label/description only while still Strapi's default (label = field name). */
function relabel(meta: any, field: string, label: string, description: string): boolean {
  const edit = meta?.[field]?.edit;
  if (!edit || (edit.label && edit.label !== field)) return false;
  edit.label = label;
  edit.description = description;
  return true;
}

async function configureEditViews(strapi: Core.Strapi) {
  const cm = strapi.plugin('content-manager');
  try {
    const components: any = cm.service('components');
    for (const [uid, oldFields] of Object.entries(OLD_FIELDS)) {
      const comp = components.findComponent(uid);
      if (!comp) continue;
      const conf = await components.findConfiguration(comp);
      let changed = false;
      const edit: any[][] = (conf.layouts?.edit ?? [])
        .map((row: any[]) => row.filter((f) => !oldFields.includes(f.name)))
        .filter((row: any[]) => row.length);
      if (JSON.stringify(edit) !== JSON.stringify(conf.layouts?.edit ?? [])) changed = true;
      if (!edit.some((row) => row.some((f) => f.name === 'content'))) {
        edit.push([{ name: 'content', size: 12 }]);
        changed = true;
      }
      for (const f of oldFields) {
        if (conf.metadatas?.[f]?.edit && conf.metadatas[f].edit.visible !== false) {
          conf.metadatas[f].edit.visible = false;
          changed = true;
        }
      }
      if (relabel(conf.metadatas, 'content', CONTENT_LABEL[uid], CONTENT_HELP)) changed = true;
      if (changed) {
        await components.updateConfiguration(comp, { ...conf, layouts: { ...conf.layouts, edit } });
        strapi.log.info(`[rich-text] editor view of ${uid}: old field hidden, rich text shown`);
      }
    }

    const types: any = cm.service('content-types');
    const blog = types.findContentType(BLOG);
    const blogConf = await types.findConfiguration(blog);
    const a = relabel(
      blogConf.metadatas,
      'dateDisplay',
      'Date on website',
      'useSiteSetting follows "Show blog dates" in Site Setting. alwaysShow / alwaysHide override it for this post.'
    );
    const b = relabel(
      blogConf.metadatas,
      'displayDate',
      'Date shown',
      'Filled in the first time the post is published. Change it to show a different date. Re-publishing does not change it.'
    );
    if (a || b) await types.updateConfiguration(blog, blogConf);

    const site = types.findContentType(SITE);
    const siteConf = await types.findConfiguration(site);
    if (
      relabel(
        siteConf.metadatas,
        'showBlogDates',
        'Show blog dates',
        'On: dates show on blog posts and post cards. Off: no dates, except posts set to alwaysShow.'
      )
    ) {
      await types.updateConfiguration(site, siteConf);
    }
  } catch (e) {
    strapi.log.warn(`[rich-text] could not configure editor views: ${(e as Error).message}`);
  }
}

/** Existing rows predate the new fields; give them the defaults the editor shows. */
async function fillDateDefaults(strapi: Core.Strapi) {
  await strapi.db.query(BLOG).updateMany({ where: { dateDisplay: null }, data: { dateDisplay: 'useSiteSetting' } });
  await strapi.db.query(SITE).updateMany({ where: { showBlogDates: null }, data: { showBlogDates: false } });
}

export async function migrateRichText(strapi: Core.Strapi) {
  const counts: string[] = [];
  for (const uid of [...TEXT_COMPONENTS, LIST_COMPONENT]) {
    const n = await backfillComponent(strapi, uid);
    counts.push(`${uid.replace('blocks.', '')} ${n}`);
  }
  strapi.log.info(`[rich-text] rows converted to rich text: ${counts.join(', ')}`);
  await fillDateDefaults(strapi);
  await backfillDisplayDates(strapi);
  await configureEditViews(strapi);
}
