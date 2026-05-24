export default ({ env }: { env: any }) => ({
  rest: {
    defaultLimit: 25,
    maxLimit: 100,
    withCount: true,
    // Strapi v5 returns documents directly under `data`; this is here in case
    // we want to wrap responses in additional metadata later.
    prefix: '/api',
  },
});
