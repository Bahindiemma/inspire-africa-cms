/**
 * Belt-and-braces: hard-block the public admin register endpoint
 * regardless of whether Strapi's built-in "already an admin" guard is
 * disabled in a future version.
 *
 * After the first Super Admin exists, NEW admins must be created from
 * Settings → Administration Panel → Users → Invite new user (which
 * sends an email invitation with a single-use registration token —
 * a separate route, /admin/auth/register?registrationToken=…).
 */
export default (_config: any, { strapi }: any) => {
  return async (ctx: any, next: any) => {
    if (
      ctx.method === 'POST' &&
      ctx.path === '/admin/register-admin'
    ) {
      // Count existing admins. Any > 0 means the public register is closed.
      const count = await strapi.db
        .query('admin::user')
        .count({ where: {} });
      if (count > 0) {
        strapi.log.warn(
          `[disable-public-register] blocked attempt to POST /admin/register-admin from ${ctx.ip}`
        );
        ctx.throw(
          403,
          'Public admin registration is closed. Existing admins can invite new users from Settings → Administration Panel → Users.'
        );
      }
    }
    await next();
  };
};
