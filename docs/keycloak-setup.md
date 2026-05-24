# Keycloak setup

Step-by-step realm + client configuration for production. Use Keycloak Cloud or self-host (Docker image: `quay.io/keycloak/keycloak`).

## 1. Realm

- **Realm name**: `inspire-africa`
- Token lifetimes: access 5m, refresh 30d
- Enable `User registration` only if you want editors to self-sign-up; usually off — admins invite users.

## 2. Client

| Field                | Value                                                         |
| -------------------- | ------------------------------------------------------------- |
| Client ID            | `inspire-africa-cms`                                          |
| Client Protocol      | `openid-connect`                                              |
| Access Type          | `confidential`                                                |
| Valid Redirect URIs  | `https://cms.inspireafricans.com/api/auth/keycloak/callback`  |
| Web Origins          | `https://cms.inspireafricans.com`                             |
| Standard Flow        | Enabled                                                       |
| Direct Access Grants | Disabled (use auth code, not password grant)                  |

Copy the **Credentials → Secret** value into `KEYCLOAK_CLIENT_SECRET`.

## 3. Realm roles

Create three realm roles (Realm Settings → Roles → Add):

- `inspire-admin`
- `inspire-editor`
- `inspire-viewer`

Optionally set `inspire-viewer` as a Default Role so new users land with read-only access.

## 4. Client scopes

Add a default scope `roles` to the client so `realm_access.roles[]` ships in the id_token. (Keycloak default scope, just confirm it's attached.)

## 5. Users

Create users in the realm and assign them one of the three roles.

## 6. Test the flow

```bash
# 1. Visit the auth init endpoint (browser):
open "https://cms.inspireafricans.com/api/auth/keycloak"

# 2. Log in with a test user.
# 3. You land back on the Strapi admin with #access_token=... in the URL fragment.
# 4. The Strapi admin should report you as logged in with the mapped role.
```

## 7. Realm export (template)

Save this as `realm-export.json` and import via Keycloak admin UI to bootstrap a fresh realm.

```json
{
  "realm": "inspire-africa",
  "enabled": true,
  "registrationAllowed": false,
  "loginWithEmailAllowed": true,
  "duplicateEmailsAllowed": false,
  "resetPasswordAllowed": true,
  "editUsernameAllowed": false,
  "bruteForceProtected": true,
  "roles": {
    "realm": [
      { "name": "inspire-admin", "description": "Full CMS access" },
      { "name": "inspire-editor", "description": "Content editor" },
      { "name": "inspire-viewer", "description": "Read-only" }
    ]
  },
  "defaultRoles": ["inspire-viewer"],
  "clients": [
    {
      "clientId": "inspire-africa-cms",
      "protocol": "openid-connect",
      "publicClient": false,
      "standardFlowEnabled": true,
      "directAccessGrantsEnabled": false,
      "redirectUris": ["https://cms.inspireafricans.com/api/auth/keycloak/callback"],
      "webOrigins": ["https://cms.inspireafricans.com"],
      "defaultClientScopes": ["openid", "profile", "email", "roles"]
    }
  ]
}
```

## RBAC matrix (after seeding)

| Action                                  | inspire-admin | inspire-editor | inspire-viewer | public token (Next.js anonymous) |
| --------------------------------------- | :-----------: | :------------: | :------------: | :------------------------------: |
| CRUD pages / blog-posts / job-postings  |       ✓       |       ✓        |       —        |                —                 |
| Publish / unpublish                     |       ✓       |       ✓        |       —        |                —                 |
| Delete                                  |       ✓       |       —        |       —        |                —                 |
| Read candidates                         |       ✓       |       —        |       —        |                —                 |
| Manage Strapi users                     |       ✓       |       —        |       —        |                —                 |
| GET published pages / blog-posts / etc. |       ✓       |       ✓        |       ✓        |                ✓                 |
| Submit forms (POST /api/form-submissions)|      ✓       |       ✓        |       ✓        |                ✓                 |
