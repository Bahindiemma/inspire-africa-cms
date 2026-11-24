import type { Core } from '@strapi/strapi';

/**
 * The "X feed" home-page section (2026-11-24): the latest posts from one X
 * account (default @andrewpound), shown by the website with the author's
 * name, title and photo. The website does the fetching; the CMS only holds
 * the section's settings. See the website's docs/26-x-feed.md.
 */
const XFEED = 'sections.x-feed';

/** The default settings, shared by the seeder and the one-off loader. */
export const X_FEED_DEFAULTS = {
  xHandle: 'andrewpound',
  authorName: 'Andrew Pound',
  authorTitle: 'Chief Executive Officer, INSPIRE AFRICA',
  eyebrow: 'Straight from the field',
  headingLine1: 'In his',
  headingLine2: 'own words.',
  intro:
    'What our CEO is seeing, saying and sharing on X: labour mobility, migration policy and the people building the pathways.',
  disclaimer: "Posts from Andrew Pound's personal X account.",
  followCtaLabel: 'Follow @andrewpound on X',
  postCount: 4,
  includeReplies: false,
  includeReposts: false,
  whenUnavailable: 'show_author_card',
};

const LABELS: Record<string, [string, string]> = {
  xHandle: ['X account', 'The X handle whose posts are shown, without the @. For example: andrewpound'],
  authorName: ['Name', 'Shown next to the posts.'],
  authorTitle: ['Title', 'Their role, shown under the name. Optional.'],
  authorPhoto: ['Photo', 'Optional portrait. Without one, the X profile picture is used (or their initials).'],
  authorPhotoAlt: ['Photo alt text', 'Describes the photo for people who cannot see it.'],
  authorPhotoCaption: ['Photo caption', 'One short line saying who the photo shows. Needed to publish when a photo is set.'],
  eyebrow: ['Small label', 'The small line above the heading.'],
  headingLine1: ['Heading — line 1', 'Shown in capitals.'],
  headingLine2: ['Heading — line 2 (yellow)', 'Shown in capitals, in yellow. Optional.'],
  intro: ['Intro', 'A sentence or two under the heading.'],
  disclaimer: ['Small print', 'Shown quietly under the posts, e.g. "Posts from … personal X account."'],
  followCtaLabel: ['Follow button text', 'The button that opens the X profile.'],
  postCount: ['How many posts', '3 or 4.'],
  includeReplies: ['Include replies', 'Off: replies to other people are never shown.'],
  includeReposts: ['Include reposts', "Off: other people's posts that this account reposted are never shown."],
  onlyWithKeywords: [
    'Only posts mentioning',
    'Optional. Comma-separated words or #hashtags; only posts containing at least one are shown. Empty: all posts.',
  ],
  hiddenPostIds: [
    'Hidden posts',
    'Posts never to show. One per line: the post link or the number at the end of it.',
  ],
  curatedPostUrls: [
    'Selected posts (used when the live feed is off)',
    'Up to 4 post links, one per line, newest first, e.g. https://x.com/andrewpound/status/123… Shown when the live X connection is not set up or is down.',
  ],
  whenUnavailable: [
    'When there are no posts to show',
    'show_author_card: show the name, photo and follow button. hide_section: hide the whole section.',
  ],
};

/** Content Manager: plain-English labels for the X feed fields. Runs once. */
export async function configureXFeedFields(strapi: Core.Strapi) {
  const store = strapi.store({ type: 'core', name: 'inspire-africa' });
  if (await store.get({ key: 'x-feed-layout' })) return;
  try {
    const components: any = strapi.plugin('content-manager').service('components');
    const c = components.findComponent(XFEED);
    if (!c) return;
    const conf = await components.findConfiguration(c);
    for (const [field, [label, description]] of Object.entries(LABELS)) {
      const edit = conf.metadatas?.[field]?.edit;
      if (edit && (!edit.label || edit.label === field)) {
        edit.label = label;
        edit.description = description;
      }
    }
    await components.updateConfiguration(c, conf);
    await store.set({ key: 'x-feed-layout', value: { at: new Date().toISOString() } });
    strapi.log.info('[x-feed] editor labels set');
  } catch (e) {
    strapi.log.warn(`[x-feed] could not configure the editor view: ${(e as Error).message}`);
  }
}

/**
 * One-off: add the X feed section to the live home page, between the
 * insights strip and the final call to action, without re-publishing
 * anything. It writes the component row and its link directly, for the
 * draft and the published version, so editors' unpublished drafts and every
 * other section are left exactly as they are.
 *
 *   ADD_X_FEED=dry-run   log what would change
 *   ADD_X_FEED=apply     do it (a second run changes nothing)
 */
export async function addXFeedToHome(strapi: Core.Strapi, mode: 'dry-run' | 'apply') {
  const tag = `[x-feed ${mode}]`;
  const knex: any = strapi.db.connection;
  const homes: any[] = await knex('pages').select('id', 'published_at').where({ slug: 'home' });
  if (!homes.length) {
    strapi.log.warn(`${tag} no home page found; nothing done.`);
    return;
  }
  for (const home of homes) {
    const which = home.published_at ? 'published' : 'draft';
    const links: any[] = await knex('pages_cmps')
      .select('component_type', 'order')
      .where({ entity_id: home.id, field: 'sections' })
      .orderBy('order', 'asc');
    if (links.some((l) => l.component_type === XFEED)) {
      strapi.log.info(`${tag} home (${which}, row ${home.id}): already has an X feed; skipped`);
      continue;
    }
    const orders = links.map((l) => Number(l.order)).filter((n) => Number.isFinite(n));
    const insights = links.find((l) => l.component_type === 'sections.insights-strip');
    const after = insights ? Number(insights.order) : Math.max(0, ...orders.filter((n) => n < 99));
    const next = orders.filter((n) => n > after).sort((a, b) => a - b)[0];
    const order = next !== undefined ? (after + next) / 2 : after + 1;
    strapi.log.info(
      `${tag} home (${which}, row ${home.id}): ${mode === 'apply' ? 'added' : 'would add'} the X feed at position ${order}`
    );
    if (mode !== 'apply') continue;
    await knex.transaction(async (trx: any) => {
      const row = {
        x_handle: X_FEED_DEFAULTS.xHandle,
        author_name: X_FEED_DEFAULTS.authorName,
        author_title: X_FEED_DEFAULTS.authorTitle,
        eyebrow: X_FEED_DEFAULTS.eyebrow,
        heading_line_1: X_FEED_DEFAULTS.headingLine1,
        heading_line_2: X_FEED_DEFAULTS.headingLine2,
        intro: X_FEED_DEFAULTS.intro,
        disclaimer: X_FEED_DEFAULTS.disclaimer,
        follow_cta_label: X_FEED_DEFAULTS.followCtaLabel,
        post_count: X_FEED_DEFAULTS.postCount,
        include_replies: X_FEED_DEFAULTS.includeReplies,
        include_reposts: X_FEED_DEFAULTS.includeReposts,
        when_unavailable: X_FEED_DEFAULTS.whenUnavailable,
      };
      const inserted = await trx('components_sections_x_feeds').insert(row, ['id']);
      const first = Array.isArray(inserted) ? inserted[0] : inserted;
      const cmpId = typeof first === 'object' ? first.id : first;
      await trx('pages_cmps').insert({
        entity_id: home.id,
        cmp_id: cmpId,
        component_type: XFEED,
        field: 'sections',
        order,
      });
    });
  }
  strapi.log.info(`${tag} done. Remove ADD_X_FEED and recreate the container, then refresh the home page.`);
}
