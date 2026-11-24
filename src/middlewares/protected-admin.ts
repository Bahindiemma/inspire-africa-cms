import { isProtectedUserEdit, refuseAdminUserRequest } from '../bootstrap/protected-admin';

/**
 * Refuses, as a whole, any admin request that would delete, bulk-delete or
 * deactivate the protected admin account (see src/bootstrap/protected-admin.ts).
 * Placed after strapi::body in config/middlewares.ts so the JSON body is
 * already parsed. Strapi's bulk delete removes users one by one, so the whole
 * batch is refused here before any user is deleted.
 */
export default (_config: any, { strapi }: any) => {
  return async (ctx: any, next: any) => {
    if (ctx.path?.startsWith('/admin/users')) {
      const message = refuseAdminUserRequest(ctx.method, ctx.path, ctx.request.body);
      if (message) {
        strapi.log.warn(`[protected-admin] refused ${ctx.method} ${ctx.path}`);
        ctx.status = 403;
        ctx.body = { data: null, error: { status: 403, name: 'ForbiddenError', message, details: {} } };
        return;
      }
    }
    await next();
    // An edit the database layer refused: say why, instead of a bare "Forbidden".
    if (ctx.status === 403 && ctx.path?.startsWith('/admin/users')) {
      const message = isProtectedUserEdit(ctx.method, ctx.path);
      if (message) ctx.body = { data: null, error: { status: 403, name: 'ForbiddenError', message, details: {} } };
    }
  };
};
