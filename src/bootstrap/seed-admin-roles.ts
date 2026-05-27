/**
 * Idempotent seeder for Strapi v5 ADMIN PANEL roles (the people who
 * log into /admin to manage content).
 *
 * This is separate from `seed-roles.ts` — that file seeds
 * users-permissions roles for END-USERS who consume the public API
 * (Workers, anonymous form submitters, etc).
 *
 * The Strapi admin ships with three built-in roles:
 *   - Super Admin  (`strapi-super-admin`) — everything, untouchable
 *   - Editor       (`strapi-editor`)      — manage all content
 *   - Author       (`strapi-author`)      — manage own content only
 *
 * We add three more, scoped to the INSPIRE AFRICA editorial workflow:
 *   - Content Manager  — full CRUD on pages + blog + jobs + corridors,
 *                        cannot touch Site Settings / Design Tokens / Users
 *   - Blog Editor      — CRUD only on blog-posts, tags, authors
 *   - Read-only Viewer — read-only access to every collection (useful
 *                        for stakeholders who want to preview without
 *                        risk)
 *
 * Each custom role's permissions are applied via the official
 * permission engine, so Strapi's built-in checks all work without
 * any extra plumbing.
 */
import type { Core } from '@strapi/strapi';

interface AdminRoleSpec {
  name: string;
  code: string;
  description: string;
  /** Strapi content-type UIDs this role can touch */
  contentTypes: string[];
  /** Actions allowed per content type */
  actions: Array<
    | 'plugin::content-manager.explorer.read'
    | 'plugin::content-manager.explorer.create'
    | 'plugin::content-manager.explorer.update'
    | 'plugin::content-manager.explorer.delete'
    | 'plugin::content-manager.explorer.publish'
  >;
  /**
   * Raw permissions applied verbatim, for capabilities that don't fit the
   * simple "content-type × action" grid above — e.g. managing END-USERS
   * (`plugin::users-permissions.user`) and reading users-permissions roles
   * so the "Role" dropdown populates when assigning a role.
   *
   * `subject: null` is correct for plugin settings permissions (roles.read);
   * `properties` mirrors the exact shape Strapi stores (`{ fields: null,
   * locales: null }` = all fields for explorer actions, `{}` for settings).
   */
  extraPermissions?: Array<{
    action: string;
    subject: string | null;
    properties: Record<string, unknown>;
  }>;
}

const PUBLISHABLE_TYPES = [
  'api::page.page',
  'api::blog-post.blog-post',
  'api::job-posting.job-posting',
  'api::legal-document.legal-document',
];

const ALL_EDITORIAL_TYPES = [
  ...PUBLISHABLE_TYPES,
  'api::corridor.corridor',
  'api::tag.tag',
  'api::author.author',
  'api::form-definition.form-definition',
];

const BLOG_ONLY = [
  'api::blog-post.blog-post',
  'api::tag.tag',
  'api::author.author',
];

const ALL_READABLE = [
  ...ALL_EDITORIAL_TYPES,
  'api::site-setting.site-setting',
  'api::design-token.design-token',
  'api::navigation.navigation',
];

const ROLE_SPECS: AdminRoleSpec[] = [
  {
    name: 'Content Manager',
    code: 'inspire-content-manager',
    description:
      'Manage every editorial collection (pages, blog, jobs, corridors, tags, authors, form-definitions) AND manage END-USERS (API consumers): create users and assign them users-permissions roles. Cannot edit Site Settings / Design Tokens / Navigation, and cannot manage ADMIN-PANEL users (Settings → Administration Panel → Users stays Super-Admin-only).',
    contentTypes: ALL_EDITORIAL_TYPES,
    actions: [
      'plugin::content-manager.explorer.read',
      'plugin::content-manager.explorer.create',
      'plugin::content-manager.explorer.update',
      'plugin::content-manager.explorer.delete',
      'plugin::content-manager.explorer.publish',
    ],
    // Manage END-USERS via Content Manager → Users, and read U&P roles so the
    // "Role" relation dropdown populates (the fix for the "Policy Failed"
    // error when assigning a role on the user-create screen).
    extraPermissions: [
      {
        action: 'plugin::content-manager.explorer.read',
        subject: 'plugin::users-permissions.user',
        properties: { fields: null, locales: null },
      },
      {
        action: 'plugin::content-manager.explorer.create',
        subject: 'plugin::users-permissions.user',
        properties: { fields: null, locales: null },
      },
      {
        action: 'plugin::content-manager.explorer.update',
        subject: 'plugin::users-permissions.user',
        properties: { fields: null, locales: null },
      },
      {
        action: 'plugin::content-manager.explorer.delete',
        subject: 'plugin::users-permissions.user',
        properties: { fields: null, locales: null },
      },
      {
        action: 'plugin::users-permissions.roles.read',
        subject: null,
        properties: {},
      },
    ],
  },
  {
    name: 'Blog Editor',
    code: 'inspire-blog-editor',
    description: 'CRUD on blog-posts, tags, and authors only.',
    contentTypes: BLOG_ONLY,
    actions: [
      'plugin::content-manager.explorer.read',
      'plugin::content-manager.explorer.create',
      'plugin::content-manager.explorer.update',
      'plugin::content-manager.explorer.delete',
      'plugin::content-manager.explorer.publish',
    ],
  },
  {
    name: 'Read-only Viewer',
    code: 'inspire-readonly',
    description:
      'Read access to every collection. Useful for stakeholders who want to preview the CMS without risk of accidental edits.',
    contentTypes: ALL_READABLE,
    actions: ['plugin::content-manager.explorer.read'],
  },
];

export async function seedAdminRoles(strapi: Core.Strapi) {
  const roleRepo = strapi.db.query('admin::role');
  const permRepo = strapi.db.query('admin::permission');

  for (const spec of ROLE_SPECS) {
    let role = await roleRepo.findOne({ where: { code: spec.code } });

    if (!role) {
      role = await roleRepo.create({
        data: {
          name: spec.name,
          code: spec.code,
          description: spec.description,
        },
      });
      strapi.log.info(`[seed-admin-roles] created role: ${spec.code}`);
    } else {
      // Keep description in sync with the spec (cheap, idempotent).
      await roleRepo.update({
        where: { id: role.id },
        data: { name: spec.name, description: spec.description },
      });
    }

    // Replace permissions wholesale so the file remains the source of truth.
    await permRepo.deleteMany({ where: { role: role.id } });

    for (const subject of spec.contentTypes) {
      for (const action of spec.actions) {
        await permRepo.create({
          data: {
            action,
            subject,
            properties: { fields: null, locales: null },
            conditions: [],
            role: role.id,
          },
        });
      }
    }

    // Apply any raw "extra" permissions (e.g. end-user management).
    for (const perm of spec.extraPermissions ?? []) {
      await permRepo.create({
        data: {
          action: perm.action,
          subject: perm.subject,
          properties: perm.properties,
          conditions: [],
          role: role.id,
        },
      });
    }

    const extraCount = spec.extraPermissions?.length ?? 0;
    strapi.log.info(
      `[seed-admin-roles] ${spec.code}: ${spec.contentTypes.length} types × ${spec.actions.length} actions` +
        (extraCount ? ` + ${extraCount} extra permission(s)` : '') +
        ' applied'
    );
  }
}
