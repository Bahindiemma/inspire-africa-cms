import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

/**
 * Rules the Category relation needs and Strapi does not enforce itself.
 *
 *  - A blog post cannot be PUBLISHED without a category. (`required` is not
 *    reliably enforced on relations in Strapi 5, and the site shows the
 *    category on every card.) Drafts may still be saved without one.
 *  - A category that any blog post still uses cannot be deleted, so no post is
 *    ever left without one. The message names the posts to move first.
 *
 * Registered as a document-service middleware, so it covers the admin's
 * single and bulk publish/delete as well as the REST API.
 */
const BLOG = 'api::blog-post.blog-post';
const CATEGORY = 'api::category.category';

export function registerCategoryGuards(strapi: Core.Strapi) {
  strapi.documents.use(async (ctx: any, next: any) => {
    if (ctx.uid === BLOG && ctx.action === 'publish') {
      const { documentId, locale } = ctx.params ?? {};
      const draft: any = await strapi.documents(BLOG).findOne({
        documentId,
        locale,
        status: 'draft',
        populate: { category: { fields: ['name'] } },
      } as any);
      if (draft && !draft.category) {
        throw new errors.ValidationError(
          'Choose a category before publishing this post. Pick one in the "category" field, or use "Create a relation" there to add a new one.'
        );
      }
    }

    if (ctx.uid === CATEGORY && ctx.action === 'delete') {
      const { documentId } = ctx.params ?? {};
      const cat: any = await strapi.db.query(CATEGORY).findOne({ where: { documentId } });
      if (cat) {
        const posts = await strapi.db.query(BLOG).findMany({
          where: { category: { documentId } },
          select: ['title'],
        });
        const titles = [...new Set(posts.map((p: any) => p.title))];
        if (titles.length) {
          const shown = titles.slice(0, 5).map((t) => `"${t}"`).join(', ');
          const more = titles.length > 5 ? ` and ${titles.length - 5} more` : '';
          throw new errors.ValidationError(
            `"${cat.name}" is used by ${titles.length} blog post${titles.length === 1 ? '' : 's'}: ${shown}${more}. Move ${titles.length === 1 ? 'it' : 'them'} to another category first, then delete this one.`
          );
        }
      }
    }

    return next();
  });
}
