import { factories } from '@strapi/strapi';

/**
 * Core CRUD router. The content type sets `content-api.visible: false`,
 * so these routes never appear in the users-permissions matrix and no
 * role — Public included — can be granted them by accident. The
 * controller additionally enforces inspire-admin on every verb.
 */
export default factories.createCoreRouter('api::community-signup.community-signup');
