/**
 * Custom analytics routes. The collect endpoint is public (auth: false)
 * but gated by the shared-secret policy; the browser reaches it only via
 * the Next.js server-side proxy, which holds the secret.
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/analytics/collect',
      handler: 'analytics.collect',
      config: {
        auth: false,
        policies: ['global::is-analytics-ingest'],
      },
    },
  ],
};
