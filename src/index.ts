import type { Core } from '@strapi/strapi';
import { registerKeycloakRoutes } from './extensions/users-permissions/strategies/keycloak';
import { seedRoles } from './bootstrap/seed-roles';
import { seedAdminRoles } from './bootstrap/seed-admin-roles';
import { ensurePublicApiToken } from './bootstrap/ensure-public-api-token';
import { seedContent, seedLegalDocuments } from './bootstrap/seed-content';
import { seedPhotoCredits } from './bootstrap/seed-photo-credits';
import { migrateBlogCategories } from './bootstrap/migrate-blog-categories';
import { registerCategoryGuards } from './bootstrap/category-guards';
import { registerRichTextSync } from './bootstrap/rich-text-sync';
import { registerBlogDates } from './bootstrap/blog-dates';
import { migrateRichText } from './bootstrap/migrate-rich-text';
import { migrateListFields } from './bootstrap/migrate-list-fields';
import { recoverBlogBodies } from './bootstrap/recover-blog-bodies';
import { registerListGuards } from './bootstrap/list-guards';
import { registerCaptionGuards } from './bootstrap/caption-guards';
import { configureCaptionFields, seedImageCaptions } from './bootstrap/image-captions';
import { registerProtectedAdmin, loadProtectedAdmin } from './bootstrap/protected-admin';
import { cleanupAdminRoles } from './bootstrap/cleanup-admin-roles';

export default {
  /**
   * register() runs at app boot, BEFORE plugins are mounted. Use it
   * to register custom routes / middlewares / lifecycle hooks.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    registerKeycloakRoutes(strapi);
    registerCategoryGuards(strapi);
    registerRichTextSync(strapi);
    registerBlogDates(strapi);
    registerListGuards(strapi);
    registerCaptionGuards(strapi);
    registerProtectedAdmin(strapi);
  },

  /**
   * bootstrap() runs AFTER plugins are mounted. Each seed is
   * idempotent — safe to run on every boot.
   *
   *  1. seedRoles          users-permissions roles (API consumers)
   *  2. seedAdminRoles     admin-panel roles (CMS editors)
   *  3. ensurePublicApiToken  create the nextjs-public token + write
   *                           it to .runtime/public-api-token.txt for
   *                           the Next.js app to pick up
   *  4. seedContent        idempotent migration of every static
   *                           string from the Next.js app into Strapi
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // First: nothing below may change the protected admin account.
    await loadProtectedAdmin(strapi);
    await seedRoles(strapi);
    await seedAdminRoles(strapi);
    await ensurePublicApiToken(strapi);
    // Categories before content: the content seeder links posts to them.
    await migrateBlogCategories(strapi);
    // Sector / destination / testimonial label lists (2026-11-24).
    await migrateListFields(strapi);
    await seedContent(strapi);

    // 5. Optional: refresh ONLY the legal documents from legal-bodies.ts.
    //    seedContent() above skips everything once the site is seeded, and
    //    forcing it with RESEED_CONTENT=true would rewrite every page and
    //    lose admin-side edits. Legal copy has to track what the code
    //    actually does (e.g. what data the signup gate collects), so it
    //    gets its own flag. Run once, then recreate without it.
    if (String(process.env.RESEED_LEGAL || '').toLowerCase() === 'true') {
      strapi.log.info('[bootstrap] RESEED_LEGAL=true — refreshing legal documents only.');
      await seedLegalDocuments(strapi);
    }

    // 6. Optional: fill in photo credits on Media Library files whose
    //    caption is empty and whose filename carries a photographer
    //    (`Benjamin-Lehman-Unsplash.jpg`). Never overwrites an editor's
    //    caption, never invents an attribution. Safe to run any time; it is
    //    scoped to media captions and touches no page content.
    if (String(process.env.RESEED_CREDITS || '').toLowerCase() === 'true') {
      strapi.log.info('[bootstrap] RESEED_CREDITS=true — filling blank photo credits.');
      await seedPhotoCredits(strapi);
    }

    // 7. Rich text + blog dates (2026-11-23). Last, so content any seeder
    //    above just wrote (fresh database, RESEED_LEGAL) is converted too.
    await migrateRichText(strapi);

    // 8. One-off (2026-11-23): restore the full text of the three launch blog
    //    posts, which the original seeder only loaded in abbreviated form.
    //    RECOVER_BLOG_BODIES=dry-run logs the plan; =apply writes and publishes.
    //    Run once, then recreate without it.
    const recover = String(process.env.RECOVER_BLOG_BODIES || '').toLowerCase();
    if (recover === 'dry-run' || recover === 'apply') {
      await recoverBlogBodies(strapi, recover);
    }

    // 9. Image captions (2026-11-24): label the caption fields in the editor
    //    (once), then optionally load the client-approved captions.
    //    SEED_IMAGE_CAPTIONS=dry-run logs the plan; =apply fills empty fields.
    //    Run once, then recreate without it.
    await configureCaptionFields(strapi);
    const captions = String(process.env.SEED_IMAGE_CAPTIONS || '').toLowerCase();
    if (captions === 'dry-run' || captions === 'apply') {
      await seedImageCaptions(strapi, captions);
    }

    // 10. One-off (2026-11-24): delete the redundant admin roles and take the
    //     extra roles off users who are Super Admins anyway.
    //     ADMIN_ROLES_CLEANUP=dry-run logs the plan; =apply does it.
    const roles = String(process.env.ADMIN_ROLES_CLEANUP || '').toLowerCase();
    if (roles === 'dry-run' || roles === 'apply') {
      await cleanupAdminRoles(strapi, roles);
    }

    strapi.log.info('[bootstrap] inspire-africa-cms is ready.');
  },
};
