import { factories } from '@strapi/strapi';

/**
 * - POST is the only public verb (the Public role has only `create`).
 * - All other verbs require inspire-admin.
 * - On every successful create we:
 *     1. Capture IP + user-agent for abuse forensics.
 *     2. Fire a notification email to the form's configured notifyEmail
 *        (resolved from the matching form-definition document).
 */
export default factories.createCoreController(
  'api::form-submission.form-submission',
  ({ strapi }) => ({
    async create(ctx) {
      const body = (ctx.request.body as any)?.data ?? {};
      if (!body.formKey || !body.email) {
        ctx.throw(400, 'formKey and email are required.');
      }

      // Server-side enrichment — never trust client-supplied IP / UA.
      body.ipAddress = ctx.request.ip;
      body.userAgent = ctx.request.header['user-agent'] ?? null;
      body.status = 'New';
      // Always snapshot the full submission into `payload` for audit,
      // even when the client only supplies the typed top-level fields.
      // Required by the schema.
      if (!body.payload) {
        body.payload = { ...body };
      }

      // Strapi v5: Document Service (replaces v4 entityService).
      const created = await strapi
        .documents('api::form-submission.form-submission')
        .create({ data: body });

      // Resolve notify email from form-definition.
      const def = await strapi.db
        .query('api::form-definition.form-definition')
        .findOne({ where: { formKey: body.formKey } });
      const notify =
        def?.notifyEmail ??
        process.env.EMAIL_FORM_NOTIFY ??
        'info@inspireafricans.com';

      // Fire-and-forget email notification — never block the HTTP
      // response on the SMTP roundtrip. The default `sendmail`
      // provider hangs for 60s+ on macOS without postfix configured,
      // and even SendGrid latency would slow the user-facing form.
      void strapi
        .plugin('email')
        .service('email')
        .send({
          to: notify,
          subject: `[INSPIRE AFRICA] New ${body.formKey} submission`,
          text: `A new ${body.formKey} submission has been received.\n\nFrom: ${body.email}\n\nSee /admin/content-manager/collection-types/api::form-submission.form-submission/${(created as any).id}`,
        })
        .catch((err: Error) => {
          strapi.log.warn(
            `[form-submission] notification email failed: ${err.message}`
          );
        });

      return { data: { id: (created as any).id, status: 'received' } };
    },

    async find(ctx) {
      requireAdmin(ctx);
      return await super.find(ctx);
    },
    async findOne(ctx) {
      requireAdmin(ctx);
      return await super.findOne(ctx);
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
    ctx.throw(403, 'Form submissions are restricted to inspire-admin role.');
  }
}
