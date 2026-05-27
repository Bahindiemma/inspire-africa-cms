import { factories } from '@strapi/strapi';

/**
 * Analytics sessions are never exposed on the public content API
 * (the schema sets content-api.visible = false, and the type is not
 * granted to the public token). Writes happen only through the custom
 * token-gated ingest endpoint (api::analytics.analytics.collect).
 * Admins read/manage these via the admin Content Manager, which uses
 * the separate /content-manager routes — not these. We still hard-block
 * every content-API verb here as defence in depth.
 */
export default factories.createCoreController(
  'api::analytics-session.analytics-session',
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
