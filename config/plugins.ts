/**
 * Plugin configuration.
 *
 * - upload: env-toggled between local / aws-s3 / cloudinary
 * - email:  SendGrid by default
 * - users-permissions: JWT settings + Keycloak OIDC provider
 * - i18n:   en-GB default + fr-FR secondary example
 */
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
          sizeLimit: 50 * 1024 * 1024,
        },
      };
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
