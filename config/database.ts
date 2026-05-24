import path from 'path';

/**
 * Strapi v5 ships first-class support only for SQL connectors (postgres,
 * mysql, sqlite). MongoDB exists via the community connector — see
 * docs/deployment.md for the swap procedure. This file resolves the
 * client from DATABASE_CLIENT so you can change databases without
 * touching code.
 */
export default ({ env }: { env: any }) => {
  const client = env('DATABASE_CLIENT', 'postgres');

  const connections: Record<string, any> = {
    postgres: {
      connection: {
        connectionString: env('DATABASE_URL'),
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'inspire_africa_cms'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: {
        min: env.int('DATABASE_POOL_MIN', 2),
        max: env.int('DATABASE_POOL_MAX', 10),
      },
    },
    mysql: {
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'inspire_africa_cms'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
      },
      pool: {
        min: env.int('DATABASE_POOL_MIN', 2),
        max: env.int('DATABASE_POOL_MAX', 10),
      },
    },
    sqlite: {
      connection: {
        // Anchor to process.cwd() (project root), NOT __dirname — at
        // dev-mode compile time `__dirname` becomes `dist/config/`,
        // so __dirname + '..' = `dist/`. Strapi's TS watcher cleans
        // `dist/` on every rebuild, which wipes the DB file out from
        // under any open better-sqlite3 connection → "attempt to
        // write a readonly database". Anchoring to cwd keeps the DB
        // at <project>/.tmp/data.db where nothing nukes it.
        filename: path.resolve(
          process.cwd(),
          env('DATABASE_FILENAME', '.tmp/data.db')
        ),
      },
      useNullAsDefault: true,
    },
  };

  if (!connections[client]) {
    throw new Error(
      `Unsupported DATABASE_CLIENT=${client}. Use one of: ${Object.keys(connections).join(', ')}. ` +
        `For MongoDB, install the community connector and follow docs/deployment.md.`
    );
  }

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
};
