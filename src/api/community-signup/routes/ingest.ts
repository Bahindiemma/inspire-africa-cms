/**
 * Custom community-signup routes.
 *
 * Paths are namespaced under /community/* rather than /community-signups/*
 * — same convention as the analytics module's /analytics/collect — so they
 * can never collide with the core router's /community-signups/:id.
 *
 * All are `auth: false` but gated by the shared-secret policy: only the
 * Next.js server can call them, and it never exposes the secret to the
 * browser. `stats` returns aggregate counts only (no PII), which is why it
 * shares the same gate rather than needing a users-permissions role — see
 * the note in the controller.
 */
const gated = { auth: false, policies: ['global::is-signup-ingest'] };

export default {
  routes: [
    { method: 'POST', path: '/community/track', handler: 'community-signup.track', config: gated },
    { method: 'POST', path: '/community/submit', handler: 'community-signup.submit', config: gated },
    // Email verification — nobody reaches the community without it.
    { method: 'POST', path: '/community/verify', handler: 'community-signup.verify', config: gated },
    { method: 'POST', path: '/community/resend', handler: 'community-signup.resend', config: gated },
    { method: 'POST', path: '/community/redirect', handler: 'community-signup.redirect', config: gated },
    { method: 'GET', path: '/community/stats', handler: 'community-signup.stats', config: gated },
  ],
};
