import type { Core } from '@strapi/strapi';

/**
 * Image captions (2026-11-24): the approved caption text and a one-off loader.
 *
 * Every caption here was approved by the client in
 * `IMAGE_CAPTIONS_REVIEW.md` before it was loaded. Don't add text that wasn't
 * approved: captions are editor copy.
 *
 *   SEED_IMAGE_CAPTIONS=dry-run   log exactly what would change, write nothing
 *   SEED_IMAGE_CAPTIONS=apply     fill the empty caption fields
 *
 * Safety:
 *  - Writes only a caption field (and, for an approved alt-text correction, the
 *    alt field), and only where it is empty, or where the alt still holds the
 *    exact old wording. Text an editor typed is never overwritten.
 *  - Each caption is tied to the file it describes. If an editor has since
 *    swapped the photo, the caption no longer fits and the row is skipped.
 *  - Rows are written directly (draft and published alike), so nothing is
 *    re-published and no unpublished editor work is pushed live.
 *  - Running it again changes nothing.
 */
const BLOG = 'api::blog-post.blog-post';
const CARD = 'cards.audience-card';
const HERO = 'sections.hero';

export interface PostCaption {
  slug: string;
  /** Media Library file name of the cover image the caption describes. */
  file: string;
  caption: string;
}
export interface CardCaption {
  /** The audience card's title. */
  title: string;
  file: string;
  caption: string;
}
export interface AltFix {
  kind: 'hero' | 'card';
  /** Hero: the page slug. Card: the card title. */
  where: string;
  file: string;
  from: string;
  to: string;
}

/** Blog post cover images, as live on 2026-11-24. */
export const POST_CAPTIONS: PostCaption[] = [
  { slug: 'an-honest-account-of-the-benefits-and-costs-of-international-health-worker-recruitment', file: 'Ian-Kelsall-Unsplash.jpg', caption: 'The Houses of Parliament in Westminster, London.' },
  { slug: 'europe-s-union-of-skills-needs-mobility-infrastructure', file: 'PES.png', caption: 'Delegates at a meeting of the Cyprus Presidency of the Council of the EU.' },
  { slug: 'finance-the-pathway-build-the-skills-base-circulate-the-benefits', file: 'EU Delegation Geneva.png', caption: 'The flags of the European Union and the United Nations, at the EU Delegation to the UN in Geneva.' },
  { slug: 'from-extraction-to-regeneration-designing-systems-for-africa-s-real-informal-economy', file: 'Brookings-Informality.jpg', caption: 'Women selling handicrafts at an open-air market.' },
  { slug: 'from-qualifications-to-capability', file: 'NFER.png', caption: 'The Skills Imperative 2035: The story so far, from NFER and the Nuffield Foundation.' },
  { slug: 'from-remittance-to-reinvestment-earn-learn-return', file: 'ilo-minimum-wages-africa.jpg', caption: 'Cover of the ILO report Minimum wages in Africa (2025).' },
  { slug: 'qualifications-matter-turning-capability-into-opportunity-takes-a-system', file: 'Careers Enterprise Company.png', caption: 'The Careers & Enterprise Company insight briefing Learner career readiness in 2025/26.' },
  { slug: 'the-real-cost-of-free-migration', file: 'gulf-corridor-rebar.jpg', caption: 'Nigerian construction workers erecting rebar columns.' },
  { slug: 'uk-care-visa-2026-what-african-workers-need-to-know', file: 'Benjamin-Lehman-Unsplash.jpg', caption: 'A doctor in protective equipment holding a vial.' },
  { slug: 'unlocking-migration-s-potential-through-better-development-financing', file: 'LISER.png', caption: 'The LISER Policy Lab of the Luxembourg Institute of Socio-Economic Research.' },
  { slug: 'why-successful-integration-underpins-effective-labour-mobility', file: 'Samuel Amoah-Unsplash.jpg', caption: 'A woman standing by a tram in a German city.' },
];

/** Home page audience cards, as live on 2026-11-24. */
export const CARD_CAPTIONS: CardCaption[] = [
  { title: 'Access global work', file: 'home-card-workers-construction.jpg', caption: 'A construction worker hammering timber on a building site.' },
  { title: 'Hire with confidence', file: 'home-card-employers-hospitality.jpg', caption: 'Chefs cooking over an open flame in a busy hospitality kitchen.' },
  { title: 'Build mobility systems', file: 'Abuja Conference.png', caption: 'Delegates at the SASASNET 3rd Annual Regional Conference in Abuja.' },
];

/** Alt text that describes a different photo from the one now shown. */
export const ALT_FIXES: AltFix[] = [
  {
    kind: 'hero',
    where: 'governments',
    file: 'Abuja Conference.png',
    from: 'Busy Senegalese market scene — traders and buyers moving goods through a working commercial corridor',
    to: 'Team photo from the SASASNET 3rd Annual Regional Conference in Abuja',
  },
  {
    kind: 'card',
    where: 'Build mobility systems',
    file: 'Abuja Conference.png',
    from: 'Wide view of Nigerian farmers working together across a rice field — workforce at scale',
    to: 'Team photo from the SASASNET 3rd Annual Regional Conference in Abuja',
  },
];

/**
 * Captions for a fresh database (seed-content.ts), which seeds the original
 * in-repo photos. Keyed by blog slug or card title.
 */
export const SEED_CAPTIONS: Record<string, string> = {
  'the-real-cost-of-free-migration': 'Nigerian construction workers erecting rebar columns.',
  'uk-care-visa-2026-what-african-workers-need-to-know': 'UK Home Office and UK Visas & Immigration signage.',
  'from-remittance-to-reinvestment-earn-learn-return': 'Cover of the ILO report Minimum wages in Africa (2025).',
  'Access global work': 'A construction worker hammering timber on a building site.',
  'Hire with confidence': 'Chefs cooking over an open flame in a busy hospitality kitchen.',
  'Build mobility systems': 'Farmers working together across a rice field.',
};

const empty = (v: unknown) => !(typeof v === 'string' && v.trim() !== '');

export async function seedImageCaptions(strapi: Core.Strapi, mode: 'dry-run' | 'apply') {
  const tag = `[image-captions ${mode}]`;
  const out: string[] = [];
  let writes = 0;

  for (const c of POST_CAPTIONS) {
    const rows: any[] = await strapi.db.query(BLOG).findMany({
      where: { slug: c.slug },
      select: ['id', 'heroImageCaption', 'publishedAt', 'locale'],
      populate: { heroImage: { select: ['name'] } },
    });
    if (!rows.length) out.push(`post ${c.slug}: SKIPPED (not found)`);
    for (const r of rows) {
      const v = r.publishedAt ? 'published' : 'draft';
      if (r.heroImage?.name !== c.file) {
        out.push(`post ${c.slug} (${v}): SKIPPED, the cover is now "${r.heroImage?.name ?? 'none'}", not "${c.file}"`);
      } else if (!empty(r.heroImageCaption)) {
        out.push(`post ${c.slug} (${v}): kept the editor's caption "${r.heroImageCaption}"`);
      } else {
        out.push(`post ${c.slug} (${v}): ${mode === 'apply' ? 'SET' : 'WOULD SET'} "${c.caption}"`);
        if (mode === 'apply') await strapi.db.query(BLOG).update({ where: { id: r.id }, data: { heroImageCaption: c.caption } });
        writes++;
      }
    }
  }

  for (const c of CARD_CAPTIONS) {
    const rows: any[] = await strapi.db.query(CARD as any).findMany({
      where: { title: c.title },
      select: ['id', 'photoCaption'],
      populate: { photo: { select: ['name'] } },
    });
    if (!rows.length) out.push(`card "${c.title}": SKIPPED (not found)`);
    for (const r of rows) {
      if (r.photo?.name !== c.file) {
        out.push(`card "${c.title}" #${r.id}: SKIPPED, the photo is now "${r.photo?.name ?? 'none'}", not "${c.file}"`);
      } else if (!empty(r.photoCaption)) {
        out.push(`card "${c.title}" #${r.id}: kept the editor's caption "${r.photoCaption}"`);
      } else {
        out.push(`card "${c.title}" #${r.id}: ${mode === 'apply' ? 'SET' : 'WOULD SET'} "${c.caption}"`);
        if (mode === 'apply') await strapi.db.query(CARD as any).update({ where: { id: r.id }, data: { photoCaption: c.caption } });
        writes++;
      }
    }
  }

  for (const f of ALT_FIXES) {
    const uid = f.kind === 'hero' ? HERO : CARD;
    const rows: any[] =
      f.kind === 'card'
        ? await strapi.db.query(uid as any).findMany({ where: { title: f.where }, select: ['id', 'photoAlt'], populate: { photo: { select: ['name'] } } })
        : await heroesOnPage(strapi, f.where);
    if (!rows.length) out.push(`alt ${f.kind} "${f.where}": SKIPPED (not found)`);
    for (const r of rows) {
      if (r.photo?.name !== f.file) {
        out.push(`alt ${f.kind} "${f.where}" #${r.id}: SKIPPED, the photo is now "${r.photo?.name ?? 'none'}"`);
      } else if (r.photoAlt !== f.from) {
        out.push(`alt ${f.kind} "${f.where}" #${r.id}: kept, the alt text was already changed to "${r.photoAlt}"`);
      } else {
        out.push(`alt ${f.kind} "${f.where}" #${r.id}: ${mode === 'apply' ? 'SET' : 'WOULD SET'} "${f.to}"`);
        if (mode === 'apply') await strapi.db.query(uid as any).update({ where: { id: r.id }, data: { photoAlt: f.to } });
        writes++;
      }
    }
  }

  for (const line of out) strapi.log.info(`${tag} ${line}`);
  strapi.log.info(
    `${tag} done: ${writes} field(s) ${mode === 'apply' ? 'written' : 'would be written'}. ` +
      'Remove SEED_IMAGE_CAPTIONS, recreate the container, then revalidate the pages and posts.'
  );
}

/** Hero sections of a page (draft and published). */
async function heroesOnPage(strapi: Core.Strapi, slug: string): Promise<any[]> {
  const pages: any[] = await strapi.db.query('api::page.page').findMany({
    where: { slug },
    populate: { sections: { on: { [HERO]: { populate: { photo: { select: ['name'] } } } } } },
  } as any);
  return pages.flatMap((p) => (p.sections ?? []).filter((s: any) => s.__component === HERO));
}

/**
 * Relabel a field (while its label is still Strapi's default) and, when
 * `move`, put it on its own row right after the row holding `after`. Runs
 * once (store key below), so an editor's later layout changes are kept.
 */
function placeField(conf: any, field: string, after: string, label: string, description: string, move = true): boolean {
  let changed = false;
  const meta = conf.metadatas?.[field]?.edit;
  if (meta && (!meta.label || meta.label === field)) {
    meta.label = label;
    meta.description = description;
    changed = true;
  }
  const rows: any[][] = conf.layouts?.edit ?? [];
  const at = rows.findIndex((row) => row.some((f) => f.name === after));
  const mine = rows.findIndex((row) => row.some((f) => f.name === field));
  const alreadyPlaced = mine === at + 1 && rows[mine].length === 1;
  if (move && at >= 0 && !alreadyPlaced) {
    const without = rows.map((row) => row.filter((f) => f.name !== field)).filter((row) => row.length);
    const anchor = without.findIndex((row) => row.some((f) => f.name === after));
    without.splice(anchor + 1, 0, [{ name: field, size: 12 }]);
    conf.layouts.edit = without;
    changed = true;
  }
  return changed;
}

const HELP =
  'One short line under the photo saying what or who it shows. Not the photographer credit (that is the credit field, shown as "Photo By:"). Needed to publish.';

/** Content Manager: label the caption fields and put them next to their photo. */
export async function configureCaptionFields(strapi: Core.Strapi) {
  const store = strapi.store({ type: 'core', name: 'inspire-africa' });
  if (await store.get({ key: 'image-captions-layout' })) return;
  const cm = strapi.plugin('content-manager');
  try {
    const components: any = cm.service('components');
    const types: any = cm.service('content-types');
    const comp = async (uid: string, fn: (conf: any) => boolean) => {
      const c = components.findComponent(uid);
      if (!c) return;
      const conf = await components.findConfiguration(c);
      if (fn(conf)) await components.updateConfiguration(c, conf);
    };
    await comp(CARD, (conf) => placeField(conf, 'photoCaption', 'photoCredit', 'Photo caption', HELP));
    await comp('cards.testimonial', (conf) => placeField(conf, 'photoCaption', 'photo', 'Photo caption', HELP));
    await comp(HERO, (conf) => {
      const a = placeField(conf, 'photoCaptionTitle', 'photoAlt', 'Caption — title', 'Bold first part of the caption bar under the hero photo, e.g. "Ready Now". Needed to publish (or line 2).', false);
      const b = placeField(conf, 'photoCaptionSub', 'photoCaptionTitle', 'Caption — line 2', 'Smaller second part of the caption bar, e.g. "3-tier readiness pipeline".', false);
      return a || b;
    });
    const blog = types.findContentType(BLOG);
    const blogConf = await types.findConfiguration(blog);
    if (placeField(blogConf, 'heroImageCaption', 'heroImageCredit', 'Image caption', HELP)) {
      await types.updateConfiguration(blog, blogConf);
    }
    await store.set({ key: 'image-captions-layout', value: { at: new Date().toISOString() } });
    strapi.log.info('[image-captions] caption fields labelled and placed next to their photos');
  } catch (e) {
    strapi.log.warn(`[image-captions] could not configure editor views: ${(e as Error).message}`);
  }
}
