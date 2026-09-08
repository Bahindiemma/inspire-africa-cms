import type { Core } from '@strapi/strapi';
import { registerKeycloakRoutes } from './extensions/users-permissions/strategies/keycloak';
import { seedRoles } from './bootstrap/seed-roles';
import { seedAdminRoles } from './bootstrap/seed-admin-roles';
import { ensurePublicApiToken } from './bootstrap/ensure-public-api-token';
import { seedContent, seedLegalDocuments } from './bootstrap/seed-content';
import { seedPhotoCredits } from './bootstrap/seed-photo-credits';

export default {
  /**
   * register() runs at app boot, BEFORE plugins are mounted. Use it
   * to register custom routes / middlewares / lifecycle hooks.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    registerKeycloakRoutes(strapi);
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
    await seedRoles(strapi);
    await seedAdminRoles(strapi);
    await ensurePublicApiToken(strapi);
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

    strapi.log.info('[bootstrap] inspire-africa-cms is ready.');
  },
};
