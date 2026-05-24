import { factories } from '@strapi/strapi';

/**
 * Candidates contain PII. The schema already marks email / phone / resume /
 * portfolio / notes / assignedAgent as `private` (excluded from API
 * responses by default), but we also block all non-admin access at the
 * controller layer as defence-in-depth.
 */
export default factories.createCoreController(
  'api::candidate.candidate',
  ({ strapi }) => ({
    async find(ctx) {
      requireAdmin(ctx);
      return await super.find(ctx);
    },
    async findOne(ctx) {
      requireAdmin(ctx);
      return await super.findOne(ctx);
    },
    async create(ctx) {
      requireAdmin(ctx);
      return await super.create(ctx);
    },
    async update(ctx) {
      requireAdmin(ctx);
      return await super.update(ctx);
    },
    async delete(ctx) {
      requireAdmin(ctx);
      return await super.delete(ctx);
    },
  })
);

function requireAdmin(ctx: any) {
  const roleType = ctx.state.user?.role?.type;
  if (roleType !== 'inspire-admin') {
    ctx.throw(403, 'Candidates are restricted to inspire-admin role.');
  }
}
