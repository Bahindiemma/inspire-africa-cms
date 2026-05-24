import type { Core } from '@strapi/strapi';
import { registerKeycloakRoutes } from './extensions/users-permissions/strategies/keycloak';
import { seedRoles } from './bootstrap/seed-roles';
import { seedAdminRoles } from './bootstrap/seed-admin-roles';
import { ensurePublicApiToken } from './bootstrap/ensure-public-api-token';
import { seedContent } from './bootstrap/seed-content';

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
    strapi.log.info('[bootstrap] inspire-africa-cms is ready.');
  },
};
