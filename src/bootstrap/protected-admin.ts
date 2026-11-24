import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

/**
 * A protected admin account (2026-11-24): Emmanuel Bahindi.
 *
 * No other user, including a Super Admin, can edit, deactivate, change the
 * roles of, or delete this account. He can still edit his own profile and
 * password, but can't deactivate himself or change his own roles.
 *
 * Two layers, so one missed route can't get round it:
 *  1. An HTTP check in front of the admin user routes
 *     (src/middlewares/protected-admin.ts). It refuses deletes and
 *     bulk deletes that include him, and edits that try to deactivate him or
 *     change his roles, before Strapi does anything. Strapi's bulk delete
 *     removes users one at a time, so this is what stops a mixed batch half
 *     running.
 *  2. A database lifecycle on `admin::user`. Any change to his row by another
 *     logged-in admin is refused, whichever route or plugin attempted it.
 *     Flows where nobody is logged in (forgot/reset password, which need his
 *     inbox) keep working, so he can't be locked out.
 *
 * Out of the app's reach: anyone with root on the server can still change the
 * database directly or run `strapi admin:reset-user-password`.
 *
 * Identified by the account's documentId, which never changes even if he
 * edits his own email, with the email as a fallback for a fresh database.
 */
const PROTECTED = {
  documentId: 'vuq4vagrb0v0pal6gb2pw6xu',
  email: 'ebahindi@gmail.com',
  name: 'Emmanuel Bahindi',
};

const MESSAGE = `${PROTECTED.name}'s account is protected: it can't be edited, deactivated, have its roles changed or be deleted by another user.`;

let protectedIds = new Set<number>();

async function resolveProtectedIds(strapi: Core.Strapi): Promise<Set<number>> {
  const rows: any[] = await strapi.db.query('admin::user').findMany({
    where: { $or: [{ documentId: PROTECTED.documentId }, { email: { $eqi: PROTECTED.email } }] },
    select: ['id'],
  });
  return new Set(rows.map((r) => Number(r.id)));
}

const forbid = (): never => {
  throw new errors.ForbiddenError(MESSAGE);
};

/** Ids targeted by a query `where` (id, {id}, {id: {$in}}, or anything else → look it up). */
async function targetedIds(strapi: Core.Strapi, where: any): Promise<number[]> {
  if (where == null) return [];
  if (typeof where === 'number' || typeof where === 'string') return [Number(where)];
  const rows: any[] = await strapi.db.query('admin::user').findMany({ where, select: ['id'] });
  return rows.map((r) => Number(r.id));
}

/** The admin making the current HTTP request, if any. */
function requester(strapi: Core.Strapi): { inRequest: boolean; userId: number | null } {
  const ctx: any = strapi.requestContext?.get?.();
  if (!ctx) return { inRequest: false, userId: null };
  const id = ctx.state?.user?.id;
  return { inRequest: true, userId: id == null ? null : Number(id) };
}

function checkUpdate(strapi: Core.Strapi, data: any) {
  const { inRequest, userId } = requester(strapi);
  // Never deactivated or blocked, by anyone, himself included.
  if (data?.isActive === false || data?.blocked === true) forbid();
  // Roles are changed only by the server itself (no HTTP request at all).
  if (inRequest && data && 'roles' in data) forbid();
  // Another logged-in admin may not change anything at all.
  if (userId != null && !protectedIds.has(userId)) forbid();
}

export function registerProtectedAdmin(strapi: Core.Strapi) {
  strapi.db.lifecycles.subscribe({
    models: ['admin::user'],
    async beforeUpdate(event: any) {
      const ids = await targetedIds(strapi, event.params?.where);
      if (ids.some((id) => protectedIds.has(id))) checkUpdate(strapi, event.params?.data);
    },
    async beforeUpdateMany(event: any) {
      const ids = await targetedIds(strapi, event.params?.where);
      if (ids.some((id) => protectedIds.has(id))) checkUpdate(strapi, event.params?.data);
    },
    async beforeDelete(event: any) {
      const ids = await targetedIds(strapi, event.params?.where);
      if (ids.some((id) => protectedIds.has(id))) forbid();
    },
    async beforeDeleteMany(event: any) {
      const ids = await targetedIds(strapi, event.params?.where);
      if (ids.some((id) => protectedIds.has(id))) forbid();
    },
  } as any);
}

/** Resolve the protected account's id(s). Call from bootstrap(). */
export async function loadProtectedAdmin(strapi: Core.Strapi) {
  protectedIds = await resolveProtectedIds(strapi);
  if (!protectedIds.size) {
    strapi.log.warn(`[protected-admin] ${PROTECTED.name}'s account was not found; nothing is protected.`);
  } else {
    strapi.log.info(`[protected-admin] protecting ${PROTECTED.name}'s account (id ${[...protectedIds].join(', ')})`);
  }
}

/**
 * HTTP layer (used by src/middlewares/protected-admin.ts, which runs after
 * Strapi's body parser). Returns a refusal message, or null to let it through.
 */
export function refuseAdminUserRequest(method: string, path: string, body: any): string | null {
  const one = path.match(/^\/admin\/users\/(\d+)\/?$/);
  if (one && protectedIds.has(Number(one[1]))) {
    if (method === 'DELETE') return MESSAGE;
    if (method === 'PUT' && (body?.isActive === false || body?.blocked === true)) return MESSAGE;
  }
  if (method === 'POST' && /^\/admin\/users\/batch-delete\/?$/.test(path)) {
    const ids: unknown[] = Array.isArray(body?.ids) ? body.ids : [];
    if (ids.some((id) => protectedIds.has(Number(id)))) return MESSAGE;
  }
  return null;
}

/** True for an edit of the protected account (the database layer decides whether it's allowed). */
export function isProtectedUserEdit(method: string, path: string): string | null {
  const one = path.match(/^\/admin\/users\/(\d+)\/?$/);
  return method === 'PUT' && one && protectedIds.has(Number(one[1])) ? MESSAGE : null;
}
