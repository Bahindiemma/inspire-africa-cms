import type { Core } from '@strapi/strapi';
import { blocksToListItems, blocksToPlain, countWordsInBody } from '../utils/rich-text';

/**
 * Lede, Callout, Quote and List blocks gained a rich-text `content` field on
 * 2026-11-23. Their old plain fields (`text`, `items`, `ordered`) are hidden in
 * the editor but kept, so:
 *
 *  - a website that has not been redeployed yet still has text to show, and
 *  - clearing `content` clears the old field too, so the boot-time conversion
 *    in migrate-rich-text.ts never brings back text an editor removed.
 *
 * On every create/update of a document with a `body` dynamic zone, this copies
 * `content` into the old field as plain text, and fills in a blog post's
 * reading time when it is empty. Registered as a document-service
 * middleware, so it covers the admin, bulk actions and the REST API.
 */
const BLOG = 'api::blog-post.blog-post';
const WPM = 220;

const MIRRORED = new Set(['blocks.lede', 'blocks.callout', 'blocks.quote', 'blocks.list']);

export function mirrorRichText(body: unknown): void {
  if (!Array.isArray(body)) return;
  for (const block of body as any[]) {
    if (!block || !MIRRORED.has(block.__component) || !('content' in block)) continue;
    const content = block.content;
    if (block.__component === 'blocks.list') {
      block.items = blocksToListItems(content);
      const list = Array.isArray(content) ? content.find((n: any) => n?.type === 'list') : null;
      if (list) block.ordered = list.format === 'ordered';
    } else {
      block.text = blocksToPlain(content);
    }
  }
}

export function registerRichTextSync(strapi: Core.Strapi) {
  strapi.documents.use(async (ctx: any, next: any) => {
    if ((ctx.action === 'create' || ctx.action === 'update') && ctx.params?.data?.body) {
      mirrorRichText(ctx.params.data.body);
      // Reading time, when the editor left it empty (see the Blog Post lifecycle).
      const data = ctx.params.data;
      if (ctx.uid === BLOG && Array.isArray(data.body) && !(typeof data.readMinutes === 'number' && data.readMinutes > 0)) {
        const words = countWordsInBody(data.body);
        if (words > 0) data.readMinutes = Math.max(1, Math.round(words / WPM));
      }
    }
    return next();
  });
}
