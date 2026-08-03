/**
 * Custom community-signup routes.
 *
 * Paths are namespaced under /community/* rather than /community-signups/*
 * — same convention as the analytics module's /analytics/collect — so they
 * can never collide with the core router's /community-signups/:id.
 *
 * track / submit / redirect are `auth: false` but gated by the shared-secret
 * policy: only the Next.js server can call them, and it never exposes the
 * secret to the browser. `stats` uses normal Strapi auth and the controller
 * requires the inspire-admin role.
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/community/track',
      handler: 'community-signup.track',
      config: { auth: false, policies: ['global::is-signup-ingest'] },
    },
    {
      method: 'POST',
      path: '/community/submit',
      handler: 'community-signup.submit',
      config: { auth: false, policies: ['global::is-signup-ingest'] },
    },
    {
      method: 'POST',
      path: '/community/redirect',
      handler: 'community-signup.redirect',
      config: { auth: false, policies: ['global::is-signup-ingest'] },
    },
    {
      // Aggregate counts ONLY — the handler selects just status/source/
      // utmCampaign/clickedAt/botScore, so no name, email, phone or ipHash
      // can appear in the response. Gated by the same shared secret as the
      // write routes rather than by a users-permissions role.
      //
      // This is a deliberate decision, not an oversight: seed-roles.ts wipes
      // the Public role down to `form-submission.create`, which also removes
      // `users-permissions.auth.callback`. POST /api/auth/local therefore
      // returns 403 and NO users-permissions JWT can be issued at all unless
      // KEYCLOAK_ENABLED=true — a role-gated route here would be unreachable
      // in every environment without Keycloak. The PII itself remains
      // admin-only via the core router + requireAdmin().
      method: 'GET',
      path: '/community/stats',
      handler: 'community-signup.stats',
      config: { auth: false, policies: ['global::is-signup-ingest'] },
    },
  ],
};
