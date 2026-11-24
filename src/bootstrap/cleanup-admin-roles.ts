import type { Core } from '@strapi/strapi';

/**
 * One-off (2026-11-24): remove the redundant admin-panel roles the client
 * confirmed, and take the extra roles off users who are Super Admins anyway.
 * A Super Admin can already do everything, so this changes nobody's access.
 *
 *   ADMIN_ROLES_CLEANUP=dry-run   log exactly what would change, write nothing
 *   ADMIN_ROLES_CLEANUP=apply     do it
 *
 * Deleted: Strapi's default Editor and Author, the hand-made "Manage Blog",
 * "manage relations" and "bog manager", and the unused Read-only Viewer (also
 * removed from seed-admin-roles.ts, so it isn't re-created on boot).
 * Kept, unassigned: Content Manager and Blog Editor, for future editors who
 * should not be Super Admins.
 *
 * Safety:
 *  - A role is deleted only if no user who is NOT a Super Admin holds it.
 *    Otherwise it is skipped and reported, because that user would lose access.
 *  - The protected admin account is never touched.
 *  - Running it again changes nothing.
 */
const SUPER = 'strapi-super-admin';
export const REDUNDANT_ROLE_CODES = [
  'strapi-editor',
  'strapi-author',
  'manage-blog-mwrmed6y',
  'manage-relations-mwrmpiqo',
  'bog-manager-mwrmxy0z',
  'inspire-readonly',
];
const PROTECTED_DOCUMENT_ID = 'vuq4vagrb0v0pal6gb2pw6xu';

export async function cleanupAdminRoles(strapi: Core.Strapi, mode: 'dry-run' | 'apply') {
  const tag = `[admin-roles ${mode}]`;
  const out: string[] = [];
  const act = mode === 'apply';

  const superRole: any = await strapi.db.query('admin::role').findOne({ where: { code: SUPER } });
  if (!superRole) {
    strapi.log.error(`${tag} no Super Admin role found; nothing done.`);
    return;
  }

  const users: any[] = await strapi.db.query('admin::user').findMany({
    select: ['id', 'documentId', 'firstname', 'lastname'],
    populate: { roles: { select: ['id', 'code', 'name'] } },
  });
  const name = (u: any) => `${u.firstname ?? ''} ${u.lastname ?? ''}`.trim() || `user ${u.id}`;
  const isSuper = (u: any) => (u.roles ?? []).some((r: any) => r.code === SUPER);

  // 1. Super Admins keep only Super Admin.
  for (const u of users) {
    const extra = (u.roles ?? []).filter((r: any) => r.code !== SUPER);
    if (!isSuper(u) || !extra.length) continue;
    if (u.documentId === PROTECTED_DOCUMENT_ID) {
      out.push(`${name(u)}: protected account, left as it is (${extra.map((r: any) => r.name).join(', ')})`);
      continue;
    }
    out.push(`${name(u)}: ${act ? 'removed' : 'would remove'} ${extra.map((r: any) => r.name).join(', ')}; keeps Super Admin`);
    if (act) await strapi.db.query('admin::user').update({ where: { id: u.id }, data: { roles: [superRole.id] } });
  }

  // 2. Delete the redundant roles nobody else relies on.
  const roles: any[] = await strapi.db.query('admin::role').findMany({
    where: { code: { $in: REDUNDANT_ROLE_CODES } },
    select: ['id', 'code', 'name'],
  });
  const deletable: number[] = [];
  for (const r of roles) {
    const reliant = users.filter((u) => !isSuper(u) && (u.roles ?? []).some((x: any) => x.id === r.id));
    if (reliant.length) {
      out.push(`role "${r.name}": SKIPPED, still the access of ${reliant.map(name).join(', ')} (not Super Admins)`);
      continue;
    }
    out.push(`role "${r.name}" (${r.code}): ${act ? 'deleted' : 'would delete'}`);
    deletable.push(r.id);
  }
  if (act && deletable.length) {
    await strapi.service('admin::role').deleteByIds(deletable);
  }
  const missing = REDUNDANT_ROLE_CODES.filter((c) => !roles.some((r) => r.code === c));
  if (missing.length) out.push(`already gone: ${missing.join(', ')}`);

  for (const line of out) strapi.log.info(`${tag} ${line}`);
  strapi.log.info(`${tag} done. Remove ADMIN_ROLES_CLEANUP and recreate the container.`);
}
