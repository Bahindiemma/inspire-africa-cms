export default ({ env }: { env: any }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  // Strapi v5 forwards these into the admin shell's <head> at server-side
  // render time, so the browser title is right before the JS bundle loads.
  head: {
    title: 'INSPIRE AFRICA — CMS',
    description:
      'Headless CMS for inspireafricans.com — manage every piece of content on the labour-mobility platform.',
  },
  // Suppress Strapi's NPS survey + EE upsell in the admin.
  flags: {
    nps: env.bool('FLAG_NPS', false),
    promoteEE: env.bool('FLAG_PROMOTE_EE', false),
  },
  // Where editors visit the admin (used for password-reset emails,
  // OIDC redirects, etc). Defaults to PUBLIC_URL + /admin.
  url: env('ADMIN_URL', '/admin'),
  autoOpen: false,
  watchIgnoreFiles: ['./public/uploads/**'],
});
