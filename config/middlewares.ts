/**
 * Global middleware chain. Order matters.
 *
 * CORS is intentionally allow-listed via CORS_ORIGINS env — never `*` —
 * because the public API token grants read access to all published
 * content and we don't want it usable from arbitrary origins.
 */
export default ({ env }: { env: any }) => [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            // Allow CDN-served media to render in the admin previews.
            env('AWS_CDN_BASE_URL', 'https://*.cloudfront.net'),
            'https://res.cloudinary.com',
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            env('AWS_CDN_BASE_URL', 'https://*.cloudfront.net'),
            'https://res.cloudinary.com',
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: env.array('CORS_ORIGINS', [
        'http://localhost:3000',
        'http://localhost:3017',
      ]),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      keepHeaderOnError: true,
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      // JSON bodies up to 1 MB. File uploads are capped at 2 MB to match the
      // upload plugin ceiling in config/plugins.ts — signup documents are CV
      // PDFs and ID photos, and this disk is shared with other production
      // apps. Raising one without the other silently reintroduces the risk.
      jsonLimit: '1mb',
      formLimit: '1mb',
      textLimit: '1mb',
      formidable: {
        maxFileSize: 2 * 1024 * 1024,
      },
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  // Custom: hard-close the public admin register endpoint once an
  // admin exists (defence in depth on top of Strapi's own check).
  'global::disable-public-register',
  // Custom: fire a revalidation webhook at the Next.js app on publish.
  'global::revalidate-frontend',
];
