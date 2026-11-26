import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

/**
 * Rules for the editor-managed lists (2026-11-24) that Strapi doesn't enforce
 * itself (`required` is not reliably enforced on relations in Strapi 5):
 *
 *  - A Job Posting can't be published without a sector and a destination,
 *    and its destination corridor must itself be published (Strapi would
 *    otherwise silently drop the link from the live job).
 *  - A Page can't be published while one of its testimonial cards has no label.
 *  - A Sector, Testimonial Label or Corridor still in use can't be deleted, and
 *    a Corridor that a live job uses can't be unpublished. The message names
 *    what uses it.
 *
 * Registered as a document-service middleware: covers the admin's single and
 * bulk actions and the REST API.
 */
const JOB = 'api::job-posting.job-posting';
const SECTOR = 'api::sector.sector';
const CORRIDOR = 'api::corridor.corridor';
const LABEL = 'api::testimonial-label.testimonial-label';
const PAGE = 'api::page.page';
const TESTIMONIAL = 'cards.testimonial';

function listOf(titles: string[]): string {
  const unique = [...new Set(titles.filter(Boolean))];
  const shown = unique.slice(0, 5).map((t) => `"${t}"`).join(', ');
  return unique.length > 5 ? `${shown} and ${unique.length - 5} more` : shown;
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

async function jobTitlesUsing(strapi: Core.Strapi, attr: 'sector' | 'destinationCountry', documentId: string, liveOnly = false) {
  const where: any = { [attr]: { documentId } };
  if (liveOnly) where.publishedAt = { $notNull: true };
  const rows: any[] = await strapi.db.query(JOB).findMany({ where, select: ['title'] });
  return [...new Set(rows.map((r) => r.title as string))];
}

/** Titles of the pages whose testimonial cards use this label. */
async function pagesUsingLabel(strapi: Core.Strapi, documentId: string): Promise<{ cards: number; pages: string[] }> {
  const cards: any[] = await strapi.db.query(TESTIMONIAL as any).findMany({
    where: { flag: { documentId } },
    select: ['id'],
  });
  if (!cards.length) return { cards: 0, pages: [] };
  const knex = strapi.db.connection;
  try {
    // card → Testimonials section → page, through Strapi's component link tables.
    const sections = await knex('components_sections_testimonials_cmps')
      .whereIn('cmp_id', cards.map((c) => c.id))
      .andWhere('component_type', TESTIMONIAL)
      .pluck('entity_id');
    const pageIds = sections.length
      ? await knex('pages_cmps')
          .whereIn('cmp_id', sections)
          .andWhere('component_type', 'sections.testimonials')
          .pluck('entity_id')
      : [];
    const pages: any[] = pageIds.length
      ? await strapi.db.query(PAGE).findMany({ where: { id: { $in: pageIds } }, select: ['title'] })
      : [];
    return { cards: cards.length, pages: [...new Set(pages.map((p) => p.title as string))] };
  } catch {
    return { cards: cards.length, pages: [] };
  }
}

export function registerListGuards(strapi: Core.Strapi) {
  strapi.documents.use(async (ctx: any, next: any) => {
    const { documentId, locale } = ctx.params ?? {};

    // ── Job Posting: publish needs a sector and a live destination ──────────
    if (ctx.uid === JOB && ctx.action === 'publish' && documentId) {
      const draft: any = await strapi.documents(JOB).findOne({
        documentId,
        status: 'draft',
        populate: { sector: { fields: ['name'] }, destinationCountry: { fields: ['country'] } },
      } as any);
      if (draft) {
        const missing: string[] = [];
        if (!draft.sector) missing.push('a sector');
        if (!draft.destinationCountry) missing.push('a destination country');
        if (missing.length) {
          throw new errors.ValidationError(
            `Choose ${missing.join(' and ')} before publishing this job. Pick from the list, or use "Create a relation" in that field to add a new one.`
          );
        }
        const live = await strapi.db.query(CORRIDOR).findOne({
          where: { documentId: draft.destinationCountry.documentId, publishedAt: { $notNull: true } },
          select: ['id'],
        });
        if (!live) {
          throw new errors.ValidationError(
            `The destination "${draft.destinationCountry.country}" is not published yet. Publish it in Content Manager → Corridor first, then publish this job. Once published it also appears in the homepage destinations strip.`
          );
        }
      }
    }

    // ── Page: every testimonial card needs a label ───────────────────────────
    if (ctx.uid === PAGE && ctx.action === 'publish' && documentId) {
      const draft: any = await strapi.documents(PAGE).findOne({
        documentId,
        locale,
        status: 'draft',
        populate: {
          sections: {
            on: { 'sections.testimonials': { populate: { items: { populate: { flag: { fields: ['name'] } } } } } },
          },
        },
      } as any);
      const unlabelled = (draft?.sections ?? [])
        .filter((s: any) => s.__component === 'sections.testimonials')
        .flatMap((s: any) => s.items ?? [])
        .filter((card: any) => !card.flag)
        .map((card: any) => card.name);
      if (unlabelled.length) {
        throw new errors.ValidationError(
          `Give every testimonial card a label before publishing. Missing on: ${listOf(unlabelled)}. Pick one in the card's "flag" field, or use "Create a relation" there to add a new label.`
        );
      }
    }

    // ── Sector: no deleting one that jobs use ────────────────────────────────
    if (ctx.uid === SECTOR && ctx.action === 'delete' && documentId) {
      const s: any = await strapi.db.query(SECTOR).findOne({ where: { documentId } });
      const titles = s ? await jobTitlesUsing(strapi, 'sector', documentId) : [];
      if (titles.length) {
        throw new errors.ValidationError(
          `"${s.name}" is used by ${titles.length} job ${plural(titles.length, 'posting', 'postings')}: ${listOf(titles)}. Move ${plural(titles.length, 'it', 'them')} to another sector first, then delete this one.`
        );
      }
    }

    // ── Corridor: no deleting one jobs use; no unpublishing one live jobs use ─
    if (ctx.uid === CORRIDOR && (ctx.action === 'delete' || ctx.action === 'unpublish') && documentId) {
      const c: any = await strapi.db.query(CORRIDOR).findOne({ where: { documentId } });
      const titles = c ? await jobTitlesUsing(strapi, 'destinationCountry', documentId, ctx.action === 'unpublish') : [];
      if (titles.length) {
        const verb = ctx.action === 'delete' ? 'delete' : 'unpublish';
        throw new errors.ValidationError(
          `"${c.country}" is the destination of ${titles.length} job ${plural(titles.length, 'posting', 'postings')}: ${listOf(titles)}. Change their destination first, then ${verb} this one.`
        );
      }
    }

    // ── Testimonial Label: no deleting one that cards use ───────────────────
    if (ctx.uid === LABEL && ctx.action === 'delete' && documentId) {
      const l: any = await strapi.db.query(LABEL).findOne({ where: { documentId } });
      if (l) {
        const { cards, pages } = await pagesUsingLabel(strapi, documentId);
        if (cards) {
          const where = pages.length ? ` on ${plural(pages.length, 'page', 'pages')} ${listOf(pages)}` : '';
          throw new errors.ValidationError(
            `"${l.name}" is used by testimonial cards${where}. Give those cards another label first, then delete this one.`
          );
        }
      }
    }

    return next();
  });
}
