import type { Core } from '@strapi/strapi';
import { BLOG_BODIES } from './blog-bodies';
import { blocksToPlain } from '../utils/rich-text';

/**
 * One-off: put the full article text back into the three launch blog posts
 * (2026-11-23). The original seeder only ever loaded abbreviated bodies; see
 * blog-bodies.ts.
 *
 *   RECOVER_BLOG_BODIES=dry-run   log exactly what would change, write nothing
 *   RECOVER_BLOG_BODIES=apply     replace the body, then publish
 *
 * Safety, per post (a post that fails any check is left untouched):
 *  - Only the three slugs in BLOG_BODIES are ever read or written.
 *  - The draft must equal the published version (body and every other field),
 *    so publishing can't push someone's unpublished work live.
 *  - Every current block must be made of the article's own words (≥ 85% of its
 *    words appear in the full article). The abbreviated seed copy passes; text
 *    an editor wrote would not, and is never overwritten.
 *  - Only `body` is written. `readMinutes` is passed through unchanged so the
 *    save hook doesn't recompute it; title, excerpt, image, credit, category,
 *    tags, author, SEO and dates are not sent at all.
 * Idempotent: a post whose body already equals the full article is skipped.
 */
const BLOG = 'api::blog-post.blog-post';

type Mode = 'dry-run' | 'apply';

function words(s: string): string[] {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .split(/[^a-z0-9$%'.,–—-]+/i)
    .map((w) => w.replace(/^[.,]+|[.,]+$/g, ''))
    .filter(Boolean);
}

/** Plain text of one body block, in reading order. */
function blockText(b: any): string {
  switch (b?.__component) {
    case 'blocks.paragraph':
      return blocksToPlain(b.text);
    case 'blocks.heading':
      return b.text ?? '';
    case 'blocks.list':
      return Array.isArray(b.content) && b.content.length ? blocksToPlain(b.content) : (b.items ?? []).join('\n');
    case 'blocks.callout':
      return `${b.title ?? ''}\n${Array.isArray(b.content) && b.content.length ? blocksToPlain(b.content) : (b.text ?? '')}`;
    case 'blocks.lede':
    case 'blocks.quote':
      return `${Array.isArray(b.content) && b.content.length ? blocksToPlain(b.content) : (b.text ?? '')}${b.attribution ? `\n${b.attribution}` : ''}`;
    default:
      return '';
  }
}

/** Comparable shape of a body: component + exact text (whitespace-normalised). */
function bodySignature(body: any[]): string {
  return JSON.stringify(
    (body ?? []).map((b) => [b.__component, blockText(b).replace(/\s+/g, ' ').trim(), b.level ?? null])
  );
}

/** Everything publishing would copy from draft to live, minus ids and timestamps. */
function docSignature(d: any): string {
  return JSON.stringify({
    title: d.title,
    slug: d.slug,
    excerpt: d.excerpt,
    heroAlt: d.heroAlt,
    heroImageCredit: d.heroImageCredit ?? null,
    readMinutes: d.readMinutes ?? null,
    dateDisplay: d.dateDisplay ?? null,
    displayDate: d.displayDate ?? null,
    heroImage: d.heroImage?.id ?? null,
    category: d.category?.documentId ?? null,
    author: d.author?.documentId ?? null,
    tags: (d.tags ?? []).map((t: any) => t.documentId).sort(),
    seo: d.seo ? { ...d.seo, id: undefined } : null,
    body: bodySignature(d.body),
  });
}

const POPULATE = {
  body: true,
  heroImage: { fields: ['id'] },
  category: { fields: ['documentId'] },
  author: { fields: ['documentId'] },
  tags: { fields: ['documentId'] },
  seo: true,
} as any;

export async function recoverBlogBodies(strapi: Core.Strapi, mode: Mode) {
  const tag = `[recover-blog-bodies ${mode}]`;
  const results: string[] = [];

  for (const [slug, target] of Object.entries(BLOG_BODIES)) {
    const draft: any = await strapi.documents(BLOG).findFirst({ filters: { slug }, status: 'draft', populate: POPULATE } as any);
    const live: any = await strapi.documents(BLOG).findFirst({ filters: { slug }, status: 'published', populate: POPULATE } as any);
    if (!draft || !live) {
      results.push(`${slug}: SKIPPED (no ${!draft ? 'draft' : 'published'} version found)`);
      continue;
    }

    const targetSig = bodySignature(target);
    if (bodySignature(draft.body) === targetSig && bodySignature(live.body) === targetSig) {
      results.push(`${slug}: already complete (${target.length} sections), nothing to do`);
      continue;
    }

    if (docSignature(draft) !== docSignature(live)) {
      results.push(`${slug}: SKIPPED. The draft has unpublished changes; publishing would push them live. Decide with the editor first.`);
      continue;
    }

    const articleWords = new Set(target.flatMap((b) => words(blockText(b))));
    const foreign = (draft.body ?? [])
      .map((b: any) => {
        const w = words(blockText(b));
        const known = w.filter((x) => articleWords.has(x)).length;
        return { comp: b.__component, ratio: w.length ? known / w.length : 1, text: blockText(b).slice(0, 80) };
      })
      .filter((x: any) => x.ratio < 0.85);
    if (foreign.length) {
      results.push(
        `${slug}: SKIPPED. ${foreign.length} block(s) contain text that is not in the article (an editor's writing?): ` +
          foreign.map((f: any) => `${f.comp} "${f.text}…" (${Math.round(f.ratio * 100)}% article words)`).join('; ')
      );
      continue;
    }

    const beforeWords = (draft.body ?? []).reduce((n: number, b: any) => n + words(blockText(b)).length, 0);
    const afterWords = target.reduce((n, b) => n + words(blockText(b)).length, 0);
    const summary = `${draft.body?.length ?? 0} → ${target.length} sections, ${beforeWords} → ${afterWords} words`;

    if (mode === 'dry-run') {
      results.push(`${slug}: WOULD RESTORE (${summary}); title "${draft.title}"`);
      continue;
    }

    await strapi.documents(BLOG).update({
      documentId: draft.documentId,
      locale: draft.locale,
      data: { body: target, readMinutes: draft.readMinutes },
    } as any);
    await strapi.documents(BLOG).publish({ documentId: draft.documentId, locale: draft.locale } as any);

    const check: any = await strapi.documents(BLOG).findFirst({ filters: { slug }, status: 'published', populate: POPULATE } as any);
    const ok = bodySignature(check?.body) === targetSig && docSignature({ ...check, body: [] }) === docSignature({ ...live, body: [] });
    results.push(`${slug}: ${ok ? 'RESTORED' : 'WRITTEN BUT VERIFY FAILED'} (${summary})`);
  }

  for (const r of results) strapi.log.info(`${tag} ${r}`);
  strapi.log.info(`${tag} done. Remove RECOVER_BLOG_BODIES and recreate the container.`);
}
