import type { Core } from '@strapi/strapi';

/**
 * A blog post's shown date is `displayDate`. Strapi's own `publishedAt` moves
 * every time a post is re-published, so it is not a stable "date of the
 * article". The first time a post is published with no `displayDate`, this
 * stamps today's date on the draft just before Strapi copies it to the live
 * version. Editors can change it afterwards; re-publishing never touches it.
 */
const BLOG = 'api::blog-post.blog-post';

export function registerBlogDates(strapi: Core.Strapi) {
  strapi.documents.use(async (ctx: any, next: any) => {
    if (ctx.uid === BLOG && ctx.action === 'publish') {
      const { documentId } = ctx.params ?? {};
      if (documentId) {
        const missing = await strapi.db.query(BLOG).findOne({
          where: { documentId, publishedAt: null, displayDate: null },
          select: ['id'],
        });
        if (missing) {
          const today = new Date().toISOString().slice(0, 10);
          // displayDate is not localized: stamp every locale's draft.
          await strapi.db.query(BLOG).updateMany({
            where: { documentId, publishedAt: null, displayDate: null },
            data: { displayDate: today },
          });
        }
      }
    }
    return next();
  });
}
