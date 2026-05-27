import { runAnalyticsMaintenance } from '../src/crons/analytics-maintenance';

export default ({ env }: { env: any }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', 'http://localhost:1337'),
  app: {
    keys: env.array('APP_KEYS'),
  },
  // Tell the admin where it's actually served from when behind a proxy/CDN.
  proxy: env.bool('IS_PROXIED', false),
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
  // Scheduled jobs. Disable with CRON_ENABLED=false.
  cron: {
    enabled: env.bool('CRON_ENABLED', true),
    tasks: {
      // Daily at 02:15 UTC: build yesterday's analytics rollup, then
      // purge raw events/sessions older than the retention window.
      analyticsMaintenance: {
        task: async ({ strapi }: { strapi: any }) => {
          await runAnalyticsMaintenance(strapi);
        },
        options: { rule: '15 2 * * *', tz: 'UTC' },
      },
    },
  },
});
