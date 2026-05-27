import { factories } from '@strapi/strapi';

/**
 * Analytics events are never exposed on the public content API. Writes
 * happen only through api::analytics.analytics.collect (token-gated).
 * Admins view them via the admin Content Manager. Block all content-API
 * verbs as defence in depth.
 */
export default factories.createCoreController(
  'api::analytics-event.analytics-event',
  () => ({
    async find(ctx) {
      return ctx.forbidden('Analytics data is admin-only.');
    },
    async findOne(ctx) {
      return ctx.forbidden('Analytics data is admin-only.');
    },
    async create(ctx) {
      return ctx.forbidden('Use POST /api/analytics/collect.');
    },
    async update(ctx) {
      return ctx.forbidden('Analytics data is admin-only.');
    },
    async delete(ctx) {
      return ctx.forbidden('Analytics data is admin-only.');
    },
  })
);
