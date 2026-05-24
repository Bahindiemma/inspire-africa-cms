/**
 * Reusable policy that allows GETs only. Attach to routes that should
 * be readable by anyone holding the public token but never mutated.
 *
 * Usage in a route file:
 *
 *   config: { policies: ['global::is-public-readable'] }
 */
export default (policyContext: any, _config: any, { strapi }: any) => {
  const method = policyContext.request.method?.toUpperCase();
  if (method === 'GET' || method === 'HEAD') return true;
  strapi.log.warn(
    `[is-public-readable] blocked ${method} on ${policyContext.request.path}`
  );
  return false;
};
