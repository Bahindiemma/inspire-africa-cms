/**
 * Global middleware: on every successful publish / unpublish of a
 * publishable collection, POST to the Next.js app's
 * /api/revalidate?secret=<shared> endpoint with a JSON body of:
 *
 *   { collection: "blog-post", slug: "the-real-cost-of-free-migration" }
 *
 * The Next.js handler verifies the secret and calls
 * `revalidatePath(...)` / `revalidateTag(...)` accordingly. See
 * docs/frontend-integration.md.
 */
import axios from 'axios';

const REVALIDATABLE_COLLECTIONS = new Set([
  'api::page.page',
  'api::blog-post.blog-post',
  'api::legal-document.legal-document',
  'api::job-posting.job-posting',
  'api::corridor.corridor',
  'api::site-setting.site-setting',
  'api::design-token.design-token',
  'api::navigation.navigation',
  'api::form-definition.form-definition',
]);

export default (_config: any, { strapi }: any) => {
  // Wire lifecycle subscriber once at boot, not per-request.
  strapi.db.lifecycles.subscribe({
    async afterUpdate(event: any) {
      await maybeRevalidate(event, strapi);
    },
    async afterCreate(event: any) {
      await maybeRevalidate(event, strapi);
    },
    async afterDelete(event: any) {
      await maybeRevalidate(event, strapi);
    },
  });

  // Pass-through middleware — we only wanted to register the subscriber.
  return async (ctx: any, next: any) => {
    await next();
  };
};

async function maybeRevalidate(event: any, strapi: any) {
  const uid: string | undefined = event?.model?.uid;
  if (!uid || !REVALIDATABLE_COLLECTIONS.has(uid)) return;

  const url = process.env.FRONTEND_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) {
    strapi.log.debug(
      '[revalidate-frontend] FRONTEND_REVALIDATE_URL or REVALIDATE_SECRET not set — skipping.'
    );
    return;
  }

  const slug = event?.result?.slug ?? null;
  const collection = uid.split('.').pop();
  const target = `${url}?secret=${encodeURIComponent(secret)}`;

  try {
    await axios.post(
      target,
      { collection, slug, uid },
      { timeout: 5000, headers: { 'Content-Type': 'application/json' } }
    );
    strapi.log.info(
      `[revalidate-frontend] notified ${url} → ${collection}${slug ? ':' + slug : ''}`
    );
  } catch (err) {
    strapi.log.warn(
      `[revalidate-frontend] webhook failed for ${collection}: ${(err as Error).message}`
    );
  }
}
