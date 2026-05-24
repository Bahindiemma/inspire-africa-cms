import type { Core } from '@strapi/strapi';

/**
 * Idempotent role + permission seeder.
 *
 * Creates / updates these users-permissions roles every boot:
 *   - inspire-admin   : full CRUD on every CMS collection + user management
 *   - inspire-editor  : create / update on content; cannot delete or manage users
 *   - inspire-viewer  : read-only on published content
 *
 * The default "Public" role keeps minimal permissions (only `form-submission.create`)
 * so unauthenticated visitors can submit forms but cannot read anything;
 * actual public reads go through the Next.js public API token (created in
 * the admin UI at Settings → API Tokens).
 */

interface RoleSpec {
  type: string;
  name: string;
  description: string;
  permissions: { action: string }[];
}

const READ_ACTIONS = ['find', 'findOne'] as const;
const WRITE_ACTIONS = ['create', 'update'] as const;
const ALL_ACTIONS = [...READ_ACTIONS, ...WRITE_ACTIONS, 'delete'] as const;

// All CMS collections + single types we want to wire RBAC for.
const PUBLIC_READABLE = [
  'api::site-setting.site-setting',
  'api::design-token.design-token',
  'api::navigation.navigation',
  'api::page.page',
  'api::corridor.corridor',
  'api::blog-post.blog-post',
  'api::tag.tag',
  'api::author.author',
  'api::legal-document.legal-document',
  'api::job-posting.job-posting',
  'api::form-definition.form-definition',
];

const EDITABLE_BY_EDITOR = [
  'api::page.page',
  'api::blog-post.blog-post',
  'api::job-posting.job-posting',
  'api::legal-document.legal-document',
  'api::tag.tag',
  'api::author.author',
  'api::corridor.corridor',
];

const ADMIN_ONLY = [
  'api::candidate.candidate',
  'api::form-submission.form-submission',
  'api::site-setting.site-setting',
  'api::design-token.design-token',
  'api::navigation.navigation',
];

function build(uid: string, actions: readonly string[]) {
  return actions.map((a) => ({ action: `${uid}.${a}` }));
}

const ROLE_SPECS: RoleSpec[] = [
  {
    type: 'inspire-admin',
    name: 'Inspire Admin',
    description: 'Full CRUD on all collections + user management.',
    permissions: [
      ...PUBLIC_READABLE.flatMap((uid) => build(uid, ALL_ACTIONS)),
      ...ADMIN_ONLY.flatMap((uid) => build(uid, ALL_ACTIONS)),
    ],
  },
  {
    type: 'inspire-editor',
    name: 'Inspire Editor',
    description: 'Create / update editorial content. No deletes, no user mgmt, no PII.',
    permissions: [
      ...EDITABLE_BY_EDITOR.flatMap((uid) => build(uid, [...READ_ACTIONS, ...WRITE_ACTIONS])),
      ...PUBLIC_READABLE.flatMap((uid) => build(uid, READ_ACTIONS)),
    ],
  },
  {
    type: 'inspire-viewer',
    name: 'Inspire Viewer',
    description: 'Read-only on published content. Identical to public API token.',
    permissions: PUBLIC_READABLE.flatMap((uid) => build(uid, READ_ACTIONS)),
  },
];

export async function seedRoles(strapi: Core.Strapi) {
  const roleRepo = strapi.db.query('plugin::users-permissions.role');
  const permRepo = strapi.db.query('plugin::users-permissions.permission');

  for (const spec of ROLE_SPECS) {
    let role = await roleRepo.findOne({ where: { type: spec.type } });
    if (!role) {
      role = await roleRepo.create({
        data: { type: spec.type, name: spec.name, description: spec.description },
      });
      strapi.log.info(`[seed-roles] created role: ${spec.type}`);
    }

    // Replace permissions wholesale so the file is the source of truth.
    await permRepo.deleteMany({ where: { role: role.id } });
    for (const perm of spec.permissions) {
      await permRepo.create({
        data: { ...perm, role: role.id, enabled: true },
      });
    }
    strapi.log.info(
      `[seed-roles] ${spec.type}: ${spec.permissions.length} permissions applied`
    );
  }

  // Public role — locked to form-submission.create only.
  const publicRole = await roleRepo.findOne({ where: { type: 'public' } });
  if (publicRole) {
    await permRepo.deleteMany({ where: { role: publicRole.id } });
    await permRepo.create({
      data: {
        action: 'api::form-submission.form-submission.create',
        role: publicRole.id,
        enabled: true,
      },
    });
    strapi.log.info(
      '[seed-roles] public role locked to form-submission.create only'
    );
  }
}
