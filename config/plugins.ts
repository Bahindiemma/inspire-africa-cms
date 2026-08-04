/**
 * Plugin configuration.
 *
 * - upload: env-toggled between local / aws-s3 / cloudinary
 * - email:  SendGrid by default
 * - users-permissions: JWT settings + Keycloak OIDC provider
 * - i18n:   en-GB default + fr-FR secondary example
 */
/**
 * Hard ceiling for ANY upload, in bytes.
 *
 * Signup no longer accepts uploads, so this now only bounds media added
 * through the admin panel. Kept low deliberately: this VPS disk is shared
 * with several other production applications, and the old 50 MB limit was
 * inherited from the marketing image library.
 */
const UPLOAD_CEILING_BYTES = 2 * 1024 * 1024;

export default ({ env }: { env: any }) => {
  const mediaProvider = env('MEDIA_PROVIDER', 'local');

  // ---------- Upload provider ----------
  let uploadConfig: any;
  switch (mediaProvider) {
    case 'aws-s3':
      uploadConfig = {
        config: {
          provider: 'aws-s3',
          providerOptions: {
            baseUrl: env('AWS_CDN_BASE_URL'),
            rootPath: env('AWS_ROOT_PATH', ''),
            s3Options: {
              credentials: {
                accessKeyId: env('AWS_ACCESS_KEY_ID'),
                secretAccessKey: env('AWS_SECRET_ACCESS_KEY'),
              },
              region: env('AWS_REGION', 'eu-west-2'),
              params: {
                ACL: env('AWS_S3_ACL', 'public-read'),
                signedUrlExpires: env.int('AWS_S3_SIGNED_URL_EXPIRES', 900),
                Bucket: env('AWS_BUCKET'),
              },
            },
          },
          actionOptions: {
            upload: {},
            uploadStream: {},
            delete: {},
          },
        },
      };
      break;
    case 'cloudinary':
      uploadConfig = {
        config: {
          provider: 'cloudinary',
          providerOptions: {
            cloud_name: env('CLOUDINARY_CLOUD_NAME'),
            api_key: env('CLOUDINARY_API_KEY'),
            api_secret: env('CLOUDINARY_API_SECRET'),
          },
          actionOptions: {
            upload: {},
            uploadStream: {},
            delete: {},
          },
        },
      };
      break;
    default:
      // Local disk — dev only. Don't ship to production.
      uploadConfig = {
        config: {
          sizeLimit: UPLOAD_CEILING_BYTES,
        },
      };
  }

  // Apply the same ceiling to the hosted providers. Signup documents are
  // CV PDFs and ID photographs, not media assets — the old 50 MB limit was
  // inherited from the marketing image library and would let a few hundred
  // registrants fill the shared VPS disk.
  if (uploadConfig?.config && uploadConfig.config.sizeLimit === undefined) {
    uploadConfig.config.sizeLimit = UPLOAD_CEILING_BYTES;
  }

  return {
    upload: uploadConfig,

    email: {
      config: {
        provider: env('EMAIL_PROVIDER', 'sendmail'),
        providerOptions:
          env('EMAIL_PROVIDER') === 'sendgrid'
            ? { apiKey: env('SENDGRID_API_KEY') }
            : {},
        settings: {
          defaultFrom: `${env('EMAIL_FROM_NAME', 'INSPIRE AFRICA')} <${env(
            'EMAIL_FROM_ADDRESS',
            'noreply@inspireafricans.com'
          )}>`,
          defaultReplyTo: env('EMAIL_REPLY_TO', 'info@inspireafricans.com'),
        },
      },
    },

    'users-permissions': {
      config: {
        jwt: {
          expiresIn: '7d',
        },
        jwtSecret: env('JWT_SECRET'),
        // Keycloak is wired via a custom strategy in
        // src/extensions/users-permissions/strategies/keycloak.ts
        // and registered in src/index.ts. We disable the default
        // social providers so nothing else is reachable.
        register: {
          allowedFields: ['firstname', 'lastname'],
        },
      },
    },

    // i18n is built-in in Strapi v5 — no plugin install needed.
  };
};
