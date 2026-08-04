import { factories } from '@strapi/strapi';

/** Reference data. Admin-only: content-api.visible is false, so no role can be granted it. */
export default factories.createCoreController('api::issuing-body.issuing-body');
