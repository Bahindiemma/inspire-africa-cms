/**
 * Custom Keycloak OIDC strategy for Strapi v5's users-permissions plugin.
 *
 * Why custom (and not a plugin):
 *   - At the time of writing there is no maintained `strapi-plugin-keycloak`
 *     release that targets Strapi v5. Hand-rolling a thin OIDC strategy
 *     with `openid-client` is ~120 lines and gives us deterministic
 *     control over the role mapping.
 *
 * Flow:
 *   1. Public client redirects to /api/auth/keycloak  → 302 to Keycloak
 *   2. Keycloak redirects back to KEYCLOAK_REDIRECT_URI with auth code
 *   3. We exchange code → id_token, verify signature against JWKS
 *   4. Resolve / create local users-permissions user keyed on KC `sub`
 *   5. Map `realm_access.roles[]` → Strapi role machine name
 *   6. Issue a Strapi JWT and redirect back to the admin or front-end
 */

import type { Core } from '@strapi/strapi';
import { Issuer, generators, type Client } from 'openid-client';

interface KeycloakProfile {
  sub: string;
  email: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
}

let cachedClient: Client | null = null;

async function getClient(): Promise<Client> {
  if (cachedClient) return cachedClient;
  const issuerUrl = process.env.KEYCLOAK_ISSUER_URL;
  if (!issuerUrl) throw new Error('KEYCLOAK_ISSUER_URL is not set.');

  const issuer = await Issuer.discover(issuerUrl);
  cachedClient = new issuer.Client({
    client_id: process.env.KEYCLOAK_CLIENT_ID!,
    client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
    redirect_uris: [process.env.KEYCLOAK_REDIRECT_URI!],
    response_types: ['code'],
  });
  return cachedClient;
}

/**
 * Map a Keycloak realm role name → a Strapi `users-permissions` role
 * machine name. The env vars allow renaming Keycloak roles without code
 * changes; the right-hand side must match a role you seed in
 * src/bootstrap/seed-roles.ts.
 */
function resolveStrapiRole(kcRoles: string[]): 'inspire-admin' | 'inspire-editor' | 'inspire-viewer' {
  const adminRole = process.env.KEYCLOAK_ROLE_ADMIN || 'inspire-admin';
  const editorRole = process.env.KEYCLOAK_ROLE_EDITOR || 'inspire-editor';
  if (kcRoles.includes(adminRole)) return 'inspire-admin';
  if (kcRoles.includes(editorRole)) return 'inspire-editor';
  return 'inspire-viewer';
}

export function registerKeycloakRoutes(strapi: Core.Strapi) {
  if (process.env.KEYCLOAK_ENABLED !== 'true') {
    strapi.log.info('[keycloak] disabled — set KEYCLOAK_ENABLED=true to enable.');
    return;
  }

  // ---------- Route 1: /api/auth/keycloak ----------
  // Initiates the OIDC flow.
  strapi.server.routes([
    {
      method: 'GET',
      path: '/api/auth/keycloak',
      handler: async (ctx: any) => {
        const client = await getClient();
        const state = generators.state();
        const nonce = generators.nonce();
        ctx.cookies.set('kc_state', state, { httpOnly: true, sameSite: 'lax' });
        ctx.cookies.set('kc_nonce', nonce, { httpOnly: true, sameSite: 'lax' });
        const authUrl = client.authorizationUrl({
          scope: process.env.KEYCLOAK_SCOPES || 'openid profile email roles',
          state,
          nonce,
        });
        ctx.redirect(authUrl);
      },
      config: { auth: false },
    },

    // ---------- Route 2: /api/auth/keycloak/callback ----------
    // Exchanges the auth code, provisions the user, returns a Strapi JWT.
    {
      method: 'GET',
      path: '/api/auth/keycloak/callback',
      handler: async (ctx: any) => {
        const client = await getClient();
        const state = ctx.cookies.get('kc_state');
        const nonce = ctx.cookies.get('kc_nonce');
        const params = client.callbackParams(ctx.req);

        const tokenSet = await client.callback(
          process.env.KEYCLOAK_REDIRECT_URI!,
          params,
          { state, nonce }
        );
        const claims = tokenSet.claims() as unknown as KeycloakProfile;

        if (!claims.email) {
          ctx.throw(400, 'Keycloak returned no email claim — check scopes.');
        }

        const kcRoles = [
          ...(claims.realm_access?.roles ?? []),
          ...Object.values(claims.resource_access ?? {}).flatMap(
            (r) => r.roles ?? []
          ),
        ];
        const targetRoleName = resolveStrapiRole(kcRoles);
        const role = await strapi.db
          .query('plugin::users-permissions.role')
          .findOne({ where: { type: targetRoleName } });
        if (!role) {
          ctx.throw(
            500,
            `Strapi role "${targetRoleName}" is missing — run npm run seed:roles.`
          );
        }

        // Upsert the user keyed on the Keycloak `sub` (kept in `provider` + `username`).
        const username = `kc:${claims.sub}`;
        let user = await strapi.db
          .query('plugin::users-permissions.user')
          .findOne({ where: { username } });

        if (!user) {
          user = await strapi.db
            .query('plugin::users-permissions.user')
            .create({
              data: {
                username,
                email: claims.email,
                provider: 'keycloak',
                confirmed: true,
                blocked: false,
                role: role.id,
                firstname: claims.given_name,
                lastname: claims.family_name,
              },
            });
        } else if (user.role !== role.id) {
          // Re-sync role on every login so Keycloak is the source of truth.
          user = await strapi.db
            .query('plugin::users-permissions.user')
            .update({ where: { id: user.id }, data: { role: role.id } });
        }

        // Issue a Strapi JWT.
        const jwt = strapi
          .plugin('users-permissions')
          .service('jwt')
          .issue({ id: user.id });

        // Redirect to admin (or wherever you prefer) with the JWT in URL fragment.
        const target = (ctx.query.target as string) || '/admin';
        ctx.redirect(`${target}#access_token=${jwt}`);
      },
      config: { auth: false },
    },
  ]);

  strapi.log.info('[keycloak] routes registered at /api/auth/keycloak[*].');
}
