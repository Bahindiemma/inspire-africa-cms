# REST API contract

Every public endpoint the Next.js app calls. All examples assume:

```
BASE   = https://cms.inspireafricans.com
TOKEN  = <Strapi public API token> (Bearer)
```

Use `Authorization: Bearer $TOKEN` on every request. Strapi v5 response shape is `{ data, meta }`.

---

## Auth model

| Caller                                       | Token                            | What they can do            |
| -------------------------------------------- | -------------------------------- | --------------------------- |
| Next.js anonymous (forms)                    | none                             | `POST /api/form-submissions` only |
| Next.js server-side fetchers (build + ISR)   | Strapi **API token** (read-only) | All `GET` on published content |
| Editorial team                               | Keycloak SSO → Strapi JWT        | CRUD on editor-allowed types |
| Platform admins                              | Keycloak SSO → Strapi JWT        | Everything                  |

Public token is created **once** in the admin UI: Settings → API Tokens → Create new → name "nextjs-public" → Type "Read-only" → Token duration "Unlimited". Copy the resulting token into the Next.js app's `.env` as `STRAPI_PUBLIC_TOKEN`.

---

## Site-wide singletons

### `GET /api/site-setting`

```http
GET /api/site-setting?populate=deep,3&locale=en-GB
```

Returns the site-wide brand + contact bundle.

```jsonc
{
  "data": {
    "id": 1,
    "name": "INSPIRE AFRICA",
    "tagline": "Labour mobility infrastructure",
    "description": "INSPIRE AFRICA connects skilled African workers...",
    "baseUrl": "https://inspireafricans.com",
    "logo": { "url": "https://cdn.inspireafricans.com/.../logo.png" },
    "socialLinks": [{ "platform": "linkedin", "url": "...", "iconKey": "LI" }],
    "companyAddress": { "street": "71-75 Shelton Street", "city": "London", "postalCode": "WC2H 9JQ", "country": "United Kingdom" }
  },
  "meta": {}
}
```

### `GET /api/design-tokens`

```http
GET /api/design-tokens?populate=*&locale=en-GB
```

Returns CSS-variable values keyed by token name. The Next.js app injects them as `<style>:root { --yellow: …; --text: …; }</style>` in the root layout.

### `GET /api/navigation`

```http
GET /api/navigation?populate[headerLinks]=true&populate[footerColumns][populate]=links&populate[legalLinks]=true&locale=en-GB
```

---

## Pages (Dynamic Zone)

### `GET /api/pages?filters[slug][$eq]=<slug>`

Populating a Dynamic Zone in Strapi v5 requires the discriminated `populate[sections][on][...]` syntax. **Example for the home page**, fully populated:

```http
GET /api/pages
  ?filters[slug][$eq]=home
  &locale=en-GB
  &populate[seo][populate]=ogImage
  &populate[sections][on][sections.hero][populate]=photo,ctas
  &populate[sections][on][sections.audiences][populate][cards][populate]=photo
  &populate[sections][on][sections.corridors-marquee][populate][corridors][populate]=flagIcon
  &populate[sections][on][sections.numbers][populate]=stats
  &populate[sections][on][sections.testimonials][populate][items][populate]=photo
  &populate[sections][on][sections.feature-list][populate]=items
  &populate[sections][on][sections.process-list][populate]=steps
  &populate[sections][on][sections.step-cards][populate]=items
  &populate[sections][on][sections.insights-strip][populate]=filterTag
  &populate[sections][on][sections.form-block]=true
  &populate[sections][on][sections.final-cta][populate]=primaryCta,secondaryLinks
```

Response (truncated):

```jsonc
{
  "data": [{
    "id": 1,
    "title": "Home",
    "slug": "home",
    "sections": [
      { "__component": "sections.hero",
        "eyebrow": "Labour mobility infrastructure",
        "headingHtml": "<span class='small-italic'>Work abroad.</span>Earn more.<br/><span class='accent'>Change<br/>your future.</span>",
        "lede": "...",
        "ctas": [{ "label": "Join the Community", "href": "...", "variant": "primary" }],
        "photo": { "url": "https://cdn.../inspire-healthcare-team.jpg" }
      },
      { "__component": "sections.corridors-marquee", "label": "Operating across", "corridors": [{ "country": "UK", "sectors": "Healthcare · Care" }] }
    ]
  }],
  "meta": { "pagination": { "page": 1, "pageSize": 25, "pageCount": 1, "total": 1 } }
}
```

---

## Blog

### `GET /api/blog-posts` — list (published only)

```http
GET /api/blog-posts
  ?filters[publishedAt][$notNull]=true
  &sort=publishedAt:desc
  &pagination[pageSize]=10
  &populate=heroImage,tags,author
```

### `GET /api/blog-posts?filters[slug][$eq]=…` — single

```http
GET /api/blog-posts
  ?filters[slug][$eq]=the-real-cost-of-free-migration
  &populate[heroImage]=true
  &populate[author][populate]=avatar,socialLinks
  &populate[tags]=true
  &populate[seo][populate]=ogImage
  &populate[body][on][blocks.lede]=true
  &populate[body][on][blocks.heading]=true
  &populate[body][on][blocks.paragraph]=true
  &populate[body][on][blocks.list]=true
  &populate[body][on][blocks.callout]=true
  &populate[body][on][blocks.quote]=true
  &populate[body][on][blocks.image][populate]=image
  &populate[body][on][blocks.video][populate]=poster
```

---

## Corridors

```http
GET /api/corridors?sort=order:asc&populate=flagIcon
```

---

## Legal

```http
GET /api/legal-documents?filters[slug][$eq]=privacy&populate=deep,5
```

---

## Job postings (public-facing — `Published` only)

```http
GET /api/job-postings?filters[status][$eq]=Published&sort=closingDate:asc&populate=tags
GET /api/job-postings?filters[slug][$eq]=<slug>&populate=*
```

---

## Form submission (public POST only)

```http
POST /api/form-submissions
Content-Type: application/json

{
  "data": {
    "formKey": "contact",
    "audience": "Worker — interested in opportunities abroad",
    "firstName": "Amina",
    "lastName": "Bello",
    "email": "amina@example.com",
    "country": "Kenya",
    "message": "I'd like to apply for the UK care corridor.",
    "payload": { /* whole form for audit */ }
  }
}
```

**201 Created** →

```jsonc
{ "data": { "id": 42, "status": "received" } }
```

`GET /api/form-submissions` returns **403** to any non-admin token (custom controller).

---

## Candidates (admin-only)

| Endpoint                          | Public token | inspire-editor | inspire-admin |
| --------------------------------- | :----------: | :------------: | :-----------: |
| `GET /api/candidates`             |    403       |      403       |      200      |
| `GET /api/candidates/:id`         |    403       |      403       |      200      |
| `PUT /api/candidates/:id`         |    403       |      403       |      200      |
| `DELETE /api/candidates/:id`      |    403       |      403       |      200      |

Even on a 200, private fields (`email`, `phone`, `resume`, `notes`, `assignedAgent`) are **omitted** from the response by schema `private: true`. Direct DB access remains the only way to surface them, which is the intended GDPR posture.

---

## Form definitions (read-only)

```http
GET /api/form-definitions?filters[formKey][$eq]=contact&locale=en-GB
```

---

## Smoke tests

After deploy, these should all pass:

```bash
TOK=<your public token>
BASE=https://cms.inspireafricans.com

# 200s
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOK" "$BASE/api/site-setting"
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOK" "$BASE/api/blog-posts?filters[publishedAt][\$notNull]=true"
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOK" "$BASE/api/legal-documents?filters[slug][\$eq]=privacy"

# 403 (PII)
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOK" "$BASE/api/candidates"
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOK" "$BASE/api/form-submissions"

# 201
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Content-Type: application/json" \
  -d '{"data":{"formKey":"contact","email":"test@example.com","message":"hi"}}' \
  "$BASE/api/form-submissions"
```

Expected: `200 200 200 403 403 201`.
