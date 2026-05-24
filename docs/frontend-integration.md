# Frontend integration — advisory patch

This is the minimal diff the Next.js team applies to switch from in-repo
constants to Strapi as the source of truth. It is **not** applied here;
this lives as documentation so the frontend repo can be reviewed and
merged in its own PR.

## 1. Env vars in `INSPIRE AFRICA WEBSITE/.env.local`

```env
STRAPI_BASE_URL=https://cms.inspireafricans.com
STRAPI_PUBLIC_TOKEN=<paste from CMS Settings → API Tokens>
REVALIDATE_SECRET=<must match the CMS env value>
```

## 2. New file — `lib/strapi.ts`

```ts
const BASE = process.env.STRAPI_BASE_URL!;
const TOKEN = process.env.STRAPI_PUBLIC_TOKEN!;

export async function strapiFetch<T>(
  path: string,
  options: { revalidate?: number; tags?: string[] } = {}
): Promise<T> {
  const url = `${BASE}/api${path.startsWith('/') ? path : '/' + path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    next: {
      revalidate: options.revalidate ?? 60,
      tags: options.tags ?? [],
    },
  });
  if (!res.ok) throw new Error(`Strapi ${res.status} on ${path}`);
  return (await res.json()) as T;
}
```

## 3. Replace `lib/site.ts` constants

```ts
// lib/site.ts
import { strapiFetch } from './strapi';

export async function getSiteSettings() {
  const json = await strapiFetch<{ data: any }>('/site-setting?populate=deep,3', {
    tags: ['site-setting'],
  });
  return json.data;
}

export async function getNavigation() {
  const json = await strapiFetch<{ data: any }>(
    '/navigation?populate[headerLinks]=true&populate[footerColumns][populate]=links&populate[legalLinks]=true',
    { tags: ['navigation'] }
  );
  return json.data;
}

export async function getDesignTokens() {
  const json = await strapiFetch<{ data: any }>('/design-tokens?populate=*', {
    tags: ['design-tokens'],
  });
  return json.data;
}
```

Then in `app/layout.tsx`, fetch settings + tokens at the top and inject
the tokens into a `<style>` element:

```tsx
const tokens = await getDesignTokens();
return (
  <html>
    <head>
      <style dangerouslySetInnerHTML={{ __html: tokensToCss(tokens) }} />
    </head>
    ...
  </html>
);
```

## 4. Replace `lib/blogs.ts`

```ts
// lib/blogs.ts
import { strapiFetch } from './strapi';

export async function getBlogPosts(limit = 10) {
  const qs = new URLSearchParams({
    'filters[publishedAt][$notNull]': 'true',
    'sort': 'publishedAt:desc',
    'pagination[pageSize]': String(limit),
    'populate': 'heroImage,tags,author',
  });
  const json = await strapiFetch<{ data: BlogPost[] }>(`/blog-posts?${qs}`, {
    tags: ['blog-post'],
  });
  return json.data;
}

export async function getBlogPost(slug: string) {
  // see docs/api-contract.md for the full populate string
  const json = await strapiFetch<{ data: BlogPost[] }>(
    `/blog-posts?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=...`,
    { tags: [`blog-post:${slug}`] }
  );
  return json.data[0] ?? null;
}
```

Replace `lib/blogs.ts`'s in-repo BLOG_POSTS array with these calls. The
3 seed posts move into the Strapi UI as the first published documents.

## 5. New file — `app/api/revalidate/route.ts`

```ts
import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }
  const body = (await req.json()) as { collection: string; slug?: string };

  // Tag-level invalidation
  revalidateTag(body.collection);
  if (body.slug) revalidateTag(`${body.collection}:${body.slug}`);

  // Path-level invalidation for specific high-traffic routes
  switch (body.collection) {
    case 'blog-post':
      revalidatePath('/');
      if (body.slug) revalidatePath(`/blog/${body.slug}`);
      break;
    case 'page':
      revalidatePath('/');
      if (body.slug && body.slug !== 'home') revalidatePath(`/${body.slug}`);
      break;
    case 'site-setting':
    case 'design-tokens':
    case 'navigation':
      revalidatePath('/', 'layout');
      break;
    case 'legal-document':
      if (body.slug) revalidatePath(`/${body.slug}`);
      break;
  }

  return NextResponse.json({ revalidated: true, ...body });
}
```

## 6. Render pages from the Dynamic Zone

New component `components/dynamic-zone/DynamicZoneRenderer.tsx`:

```tsx
import { Hero } from '@/components/sections/Hero';
import { Audiences } from '@/components/sections/Audiences';
// ... import the rest

type Section = { __component: string; [k: string]: any };

const MAP: Record<string, React.ComponentType<any>> = {
  'sections.hero': Hero,
  'sections.audiences': Audiences,
  'sections.corridors-marquee': CorridorsMarquee,
  'sections.numbers': Numbers,
  'sections.testimonials': Testimonials,
  'sections.feature-list': FeatureListSection,
  'sections.process-list': ProcessListSection,
  'sections.step-cards': StepCardsSection,
  'sections.insights-strip': InsightsStrip,
  'sections.form-block': FormBlock,
  'sections.final-cta': FinalCta,
};

export function DynamicZoneRenderer({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map((s, i) => {
        const C = MAP[s.__component];
        if (!C) return null;
        return <C key={`${s.__component}-${i}`} {...s} />;
      })}
    </>
  );
}
```

`app/page.tsx` becomes:

```tsx
import { strapiFetch } from '@/lib/strapi';
import { DynamicZoneRenderer } from '@/components/dynamic-zone/DynamicZoneRenderer';

export default async function HomePage() {
  const { data } = await strapiFetch<{ data: any[] }>(
    `/pages?filters[slug][$eq]=home&populate=...`, // see docs/api-contract.md
    { tags: ['page:home'] }
  );
  const page = data[0];
  return <DynamicZoneRenderer sections={page.sections} />;
}
```

## 7. Forms

The 3 form components keep their existing markup but submit via:

```ts
await fetch(`${process.env.NEXT_PUBLIC_STRAPI_BASE_URL}/api/form-submissions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: { formKey: 'contact', /* fields */ } }),
});
```

(No `Authorization` header — the Public role on Strapi accepts anonymous POSTs to this endpoint only.)

## 8. Migration plan

1. Deploy the CMS as described in `deployment.md`.
2. Create the public API token, paste into Next.js `.env`.
3. From the CMS admin, create:
   - one Site Settings document (copy values from current `lib/site.ts`)
   - one Design Tokens document (copy current `globals.css` CSS vars)
   - one Navigation document
   - seven Page documents (`home`, `approach`, `workers`, `employers`, `governments`, `join`, `contact`) — assemble the Dynamic Zones using the existing copy
   - 7 Corridor documents
   - the 3 seed blog posts (copy from `lib/blogs.ts`)
   - 4 Legal documents
   - 3 Form Definitions
4. Apply this patch to the Next.js repo.
5. Verify locally against the production CMS URL.
6. Ship.
7. Remove the in-repo constants (`lib/site.ts`, `lib/blogs.ts`) entirely.
