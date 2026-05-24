import { factories } from '@strapi/strapi';

/**
 * Public reads always filter to published posts only — even if the
 * caller omits the filter. Editors / admins can pass `?status=draft`
 * (Strapi v5 native) to see unpublished work.
 */
export default factories.createCoreController(
  'api::blog-post.blog-post',
  ({ strapi }) => ({
    async find(ctx) {
      const userRole = ctx.state.user?.role?.type;
      const isPrivileged =
        userRole === 'inspire-admin' || userRole === 'inspire-editor';

      if (!isPrivileged) {
        ctx.query.filters = {
          ...((ctx.query.filters as object) || {}),
          publishedAt: { $notNull: true },
        };
      }
      return await super.find(ctx);
    },

    async findOne(ctx) {
      const response = await super.findOne(ctx);
      const userRole = ctx.state.user?.role?.type;
      const isPrivileged =
        userRole === 'inspire-admin' || userRole === 'inspire-editor';

      if (!response?.data?.publishedAt && !isPrivileged) {
        return ctx.notFound();
      }
      return response;
    },
  })
);
