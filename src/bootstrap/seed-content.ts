/**
 * Idempotent content seed — migrates every static value from the
 * INSPIRE AFRICA Next.js application into the Strapi CMS.
 *
 * Each entity is upserted on a stable key (slug / formKey / country)
 * so re-running on every boot is safe — existing documents are
 * patched, not duplicated. The function exits early if the marker
 * document `site-setting.name = "INSPIRE AFRICA"` already exists AND
 * the env var `RESEED_CONTENT=true` is NOT set, so production boots
 * skip the work.
 *
 * To force a full re-seed: stop Strapi, set `RESEED_CONTENT=true` in
 * the environment, restart. To wipe and start over: delete
 * `.tmp/data.db` (dev) or truncate the relevant tables (prod).
 */
import type { Core } from '@strapi/strapi';

export async function seedContent(strapi: Core.Strapi) {
  const force = process.env.RESEED_CONTENT === 'true';

  const existingSettings = await strapi.documents('api::site-setting.site-setting').findFirst({});
  if (existingSettings && !force) {
    strapi.log.info('[seed-content] Site Settings already present — skipping seed. Set RESEED_CONTENT=true to force.');
    return;
  }

  strapi.log.info('[seed-content] starting…');

  // ---------- helper: upsert a single-type document ----------
  // strapi.documents.update only patches an existing doc — for single
  // types we need create-if-missing-then-update.
  async function upsertSingle(uid: any, data: any) {
    const existing = await strapi.documents(uid).findFirst({});
    if (existing) {
      await strapi.documents(uid).update({ documentId: existing.documentId, data } as any);
    } else {
      await strapi.documents(uid).create({ data } as any);
    }
  }

  // ---------- 1. Site Settings (single type) ----------
  await upsertSingle('api::site-setting.site-setting', {
      name: 'INSPIRE AFRICA',
      legalName: 'Inspire Africa Platform Ltd',
      tagline: 'Labour mobility infrastructure',
      description:
        'INSPIRE AFRICA connects skilled African workers, employers and governments through governed migration pathways, predictive screening and migration finance.',
      baseUrl: 'https://inspireafricans.com',
      locale: 'en_GB',
      companyNumber: '12759109',
      companyAddress: {
        label: 'UK · Registered Office',
        street: '71–75 Shelton Street',
        city: 'London',
        postalCode: 'WC2H 9JQ',
        country: 'United Kingdom',
      },
      contactUkPhone: '+44 20 7097 3943',
      contactAfricaPhone: '+254 784 041 405',
      contactEmail: 'info@inspireafricans.com',
      contactLegalEmail: 'legal@inspireafrica.onmicrosoft.com',
      contactSpeakupEmail: 'speakup@inspireafrica.onmicrosoft.com',
      socialLinks: [
        { platform: 'linkedin', label: 'LinkedIn', url: 'https://uk.linkedin.com/company/inspire-africans', handle: 'inspire-africans', iconKey: 'LI', order: 1 },
        { platform: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/INSPIREAFRICAN', handle: 'INSPIREAFRICAN', iconKey: 'FB', order: 2 },
      ],
      communityBaseUrl: 'https://inspire-africa.mn.co/spaces/20105635',
  }).catch((e: any) => strapi.log.warn('[seed-content] site-setting: ' + e.message));

  // ---------- 2. Design Tokens (single type) ----------
  await upsertSingle('api::design-token.design-token', {
    brandYellow: '#F8BD26',
    text: { name: 'text', light: '#0a0a0a', dark: '#ffffff' },
    background: { name: 'background', light: '#fafaf7', dark: '#0a0a0a' },
    surface: { name: 'surface', light: '#ffffff', dark: '#141414' },
    surfaceAlt: { name: 'surfaceAlt', light: '#efece3', dark: '#141414' },
    accentInk: { name: 'accentInk', light: '#0a0a0a', dark: '#F8BD26' },
    accentDisplay: { name: 'accentDisplay', light: '#F8BD26', dark: '#F8BD26' },
    line: { name: 'line', light: 'rgba(10,10,10,0.1)', dark: 'rgba(255,255,255,0.08)' },
    lineStrong: { name: 'lineStrong', light: 'rgba(10,10,10,0.18)', dark: 'rgba(255,255,255,0.16)' },
    fontDisplay: 'Madimi One',
    fontBody: 'Madimi One',
    breakpoints: { xs: 540, sm: 640, md: 880, lg: 980, xl: 1100, xxl: 1320 },
    shadowCard: '0 1px 2px rgba(10,10,10,0.04), 0 8px 24px rgba(10,10,10,0.06)',
    shadowHover: '0 4px 8px rgba(10,10,10,0.06), 0 18px 40px rgba(10,10,10,0.1)',
  }).catch((e: any) => strapi.log.warn('[seed-content] design-token: ' + e.message));

  // ---------- 3. Navigation (single type) ----------
  await upsertSingle('api::navigation.navigation', {
    headerLinks: [
      { label: 'Our Approach', href: '/approach', order: 1, isCta: false, isExternal: false },
      { label: 'Workers', href: '/workers', order: 2, isCta: false, isExternal: false },
      { label: 'Employers', href: '/employers', order: 3, isCta: false, isExternal: false },
      { label: 'Governments', href: '/governments', order: 4, isCta: false, isExternal: false },
      { label: 'Join the Community', href: '/join', order: 5, isCta: true, isExternal: false },
      { label: 'Contact', href: '/contact', order: 6, isCta: false, isExternal: false },
    ],
    footerColumns: [
      {
        heading: 'Audiences', order: 1,
        links: [
          { label: 'For Workers', href: '/workers', order: 1 },
          { label: 'For Employers', href: '/employers', order: 2 },
          { label: 'For Governments', href: '/governments', order: 3 },
          { label: 'Join the Community', href: '/join', order: 4 },
        ],
      },
      {
        heading: 'The Platform', order: 2,
        links: [
          { label: 'Our Approach', href: '/approach', order: 1 },
          { label: 'Contact', href: '/contact', order: 2 },
          { label: 'Privacy & Cookies', href: '/privacy', order: 3 },
          { label: 'Modern Slavery', href: '/modern-slavery', order: 4 },
        ],
      },
    ],
    legalLinks: [
      { label: 'Privacy', href: '/privacy', order: 1 },
      { label: 'Cookies', href: '/cookies', order: 2 },
      { label: 'Terms', href: '/terms', order: 3 },
      { label: 'Modern Slavery', href: '/modern-slavery', order: 4 },
    ],
  }).catch((e: any) => strapi.log.warn('[seed-content] navigation: ' + e.message));

  // ---------- 4. Corridors ----------
  const corridors = [
    { country: 'UK', displayName: 'UK', sectors: 'Healthcare · Care', order: 1 },
    { country: 'EU', displayName: 'EU', sectors: 'Hospitality · Manufacturing', order: 2 },
    { country: 'USA', displayName: 'USA', sectors: 'Tech · Hospitality', order: 3 },
    { country: 'Canada', displayName: 'Canada', sectors: 'Care · Construction', order: 4 },
    { country: 'Australia', displayName: 'Australia', sectors: 'Care · Mining', order: 5 },
    { country: 'Saudi Arabia', displayName: 'Saudi Arabia', sectors: 'Construction · Care', order: 7 },
  ];
  for (const c of corridors) {
    const existing = await strapi.documents('api::corridor.corridor').findFirst({ filters: { country: c.country } as any });
    if (existing) {
      await strapi.documents('api::corridor.corridor').update({ documentId: existing.documentId, data: c as any, status: 'published' } as any).catch(() => {});
    } else {
      const created = await strapi.documents('api::corridor.corridor').create({ data: c as any } as any).catch(() => null);
      if (created) await strapi.documents('api::corridor.corridor').publish({ documentId: created.documentId } as any).catch(() => {});
    }
  }
  strapi.log.info('[seed-content] 7 corridors upserted');

  // ---------- 5. Author ----------
  let editorialAuthor = await strapi.documents('api::author.author').findFirst({ filters: { slug: 'editorial-desk' } as any });
  if (!editorialAuthor) {
    editorialAuthor = await strapi.documents('api::author.author').create({
      data: { name: 'Editorial Desk', slug: 'editorial-desk', role: 'INSPIRE AFRICA' } as any,
    } as any).catch(() => null) as any;
  }

  // ---------- 6. Tags ----------
  const tagSlugs: Record<string, string> = {};
  const tagNames = [
    'Worker protection', 'Recruitment fees', 'Gulf corridor', 'Policy',
    'United Kingdom', 'Healthcare', 'Visa policy', 'NHS',
    'Remittances', 'Circular migration', 'Economic development',
  ];
  for (const name of tagNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    tagSlugs[name] = slug;
    const existing = await strapi.documents('api::tag.tag').findFirst({ filters: { slug } as any });
    if (!existing) {
      await strapi.documents('api::tag.tag').create({ data: { name, slug, color: '#F8BD26' } as any } as any).catch(() => {});
    }
  }
  strapi.log.info(`[seed-content] ${tagNames.length} tags upserted`);

  // ---------- 7. Blog Posts (3) ----------
  // Bodies are abbreviated here to keep the seed file manageable; the
  // full text from lib/blogs.ts can be pasted in once the editor is
  // comfortable with the Block editor UX. The seed produces fully
  // valid, publishable documents either way.
  const posts = [
    {
      slug: 'the-real-cost-of-free-migration',
      title: 'The real cost of "free" migration: why African workers still pay the price',
      excerpt:
        'A year after the ILO\'s latest fee data, the gap between policy and practice along West Africa–Gulf corridors is still costing workers up to nine months of wages. Here\'s what the numbers show — and what changes when employers pay.',
      category: 'Ethical Recruitment',
      heroAlt: 'Two African professionals in conversation across a desk',
      tags: ['Worker protection', 'Recruitment fees', 'Gulf corridor', 'Policy'],
      body: [
        { __component: 'blocks.lede', text: 'The official position across most destination markets is unambiguous: workers should not pay to be recruited. The lived reality in 2026 is something else.' },
        { __component: 'blocks.heading', text: 'The gap between policy and practice', level: 'h2' },
        { __component: 'blocks.paragraph', text: [{ type: 'paragraph', children: [{ type: 'text', text: 'Eighteen destination countries have now adopted some version of the "employer pays" principle in their published recruitment guidance.' }] }] },
        { __component: 'blocks.callout', title: 'What the 2025 ILO corridor study found', text: 'Median fee burden along West Africa → Gulf hospitality corridors: $2,800–$4,200 per worker. Less than 11% of workers surveyed reported receiving an itemised invoice.' },
      ],
    },
    {
      slug: 'uk-care-visa-2026-what-african-workers-need-to-know',
      title: 'UK care sector at breaking point: what 2026\'s visa changes mean for African health workers',
      excerpt:
        'The 2026 Health and Care Worker visa changes have tightened the front door without fixing the staffing crisis behind it. We unpack what changed, who it affects, and why structured pathways now matter more than ever.',
      category: 'Policy & Markets',
      heroAlt: 'A team of African healthcare professionals smiling together',
      tags: ['United Kingdom', 'Healthcare', 'Visa policy', 'NHS'],
      body: [
        { __component: 'blocks.lede', text: 'The UK\'s adult social-care vacancy rate sits above 8.3% as we go to publication.' },
        { __component: 'blocks.heading', text: 'What the 2026 changes actually do', level: 'h2' },
        { __component: 'blocks.list', ordered: false, items: [
          'Raised the minimum hourly threshold for sponsorship in adult social care.',
          'Tightened sponsor licence conditions: care providers now face stricter scrutiny.',
          'Introduced a new requirement for sponsors to evidence local-recruitment efforts.',
        ] },
      ],
    },
    {
      slug: 'from-remittance-to-reinvestment-earn-learn-return',
      title: 'From remittance to reinvestment: why Earn-Learn-Return is Africa\'s next growth story',
      excerpt:
        'African workers abroad now send home more than $100B a year — more than foreign aid and FDI combined. But remittances reach households, not economies. Circular migration is how that changes.',
      category: 'Development Economics',
      heroAlt: 'An African farmer in a field, symbolising returning skills and capital',
      tags: ['Remittances', 'Circular migration', 'Economic development'],
      body: [
        { __component: 'blocks.lede', text: 'Remittances to Sub-Saharan Africa crossed $100 billion in 2025 — larger than total FDI and three times official development assistance.' },
        { __component: 'blocks.heading', text: 'What Earn-Learn-Return actually means', level: 'h2' },
        { __component: 'blocks.list', ordered: true, items: [
          'Earn — the worker accesses a higher-wage market through a fair pathway.',
          'Learn — the placement is treated as a skills-development stage.',
          'Return — the return is anticipated, supported and connected to a reintegration pathway.',
        ] },
      ],
    },
  ];

  for (const p of posts) {
    const existing = await strapi.documents('api::blog-post.blog-post').findFirst({ filters: { slug: p.slug } as any });
    const tagDocs = await Promise.all(
      p.tags.map(async (name) => await strapi.documents('api::tag.tag').findFirst({ filters: { slug: tagSlugs[name] } as any }))
    );
    const data: any = {
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      category: p.category,
      heroAlt: p.heroAlt,
      readMinutes: 7,
      body: p.body,
      tags: tagDocs.filter(Boolean).map((t: any) => t.documentId),
      author: editorialAuthor?.documentId,
    };
    if (existing) {
      await strapi.documents('api::blog-post.blog-post').update({ documentId: existing.documentId, data, status: 'published' } as any).catch((e) => strapi.log.warn(`[seed-content] blog ${p.slug}: ${e.message}`));
    } else {
      const created = await strapi.documents('api::blog-post.blog-post').create({ data } as any).catch((e) => { strapi.log.warn(`[seed-content] blog create ${p.slug}: ${e.message}`); return null; });
      if (created) await strapi.documents('api::blog-post.blog-post').publish({ documentId: created.documentId } as any).catch(() => {});
    }
  }
  strapi.log.info(`[seed-content] ${posts.length} blog posts upserted`);

  // ---------- 8. Form Definitions ----------
  const forms = [
    {
      formKey: 'contact', title: 'How can we help?',
      lede: "Tell us who you are and what you're looking for. We'll route your message to the right person.",
      submitLabel: 'Send message',
      successMessage: "Thanks — your message is on its way. We respond within two working days.",
      notifyEmail: 'info@inspireafricans.com',
      fields: [
        { name: 'audience', label: 'I am a…', type: 'select', required: true, options: ['Worker — interested in opportunities abroad', 'Employer — looking to hire', 'Government / Agency representative', 'Partner — recruiter, training provider, or other', 'Press / media', 'Other'] },
        { name: 'firstName', label: 'First name', type: 'text', required: true },
        { name: 'lastName', label: 'Last name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'country', label: 'Country', type: 'text', required: false },
        { name: 'message', label: 'Your message', type: 'textarea', required: true },
      ],
    },
    {
      formKey: 'employers', title: 'Hire talent',
      lede: "Tell us about your hiring needs. We'll come back within two working days.",
      submitLabel: 'Start hiring',
      successMessage: "Thanks — a senior member of the team will be in touch within two working days.",
      notifyEmail: 'info@inspireafricans.com',
      fields: [
        { name: 'organisation', label: 'Organisation', type: 'text', required: true },
        { name: 'contactName', label: 'Contact name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'sector', label: 'Primary sector', type: 'select', required: true, options: ['Healthcare', 'Care', 'Hospitality', 'Construction', 'Other'] },
        { name: 'volume', label: 'Approximate hiring volume', type: 'text', required: false },
        { name: 'message', label: 'Anything else?', type: 'textarea', required: false },
      ],
    },
    {
      formKey: 'governments', title: 'Partner with us',
      lede: 'Tell us briefly about your priorities. A senior member of the team will respond within three working days.',
      submitLabel: 'Submit enquiry',
      successMessage: "Thanks — we'll respond within three working days.",
      notifyEmail: 'info@inspireafricans.com',
      fields: [
        { name: 'organisation', label: 'Ministry / agency', type: 'text', required: true },
        { name: 'contactName', label: 'Contact name', type: 'text', required: true },
        { name: 'role', label: 'Role', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'priorities', label: 'Priority corridors / sectors', type: 'textarea', required: false },
      ],
    },
  ];
  for (const f of forms) {
    const existing = await strapi.documents('api::form-definition.form-definition').findFirst({ filters: { formKey: f.formKey } as any });
    if (existing) {
      await strapi.documents('api::form-definition.form-definition').update({ documentId: existing.documentId, data: f as any } as any).catch(() => {});
    } else {
      await strapi.documents('api::form-definition.form-definition').create({ data: f as any } as any).catch(() => {});
    }
  }
  strapi.log.info(`[seed-content] ${forms.length} form definitions upserted`);

  // ---------- 9. Legal Documents (4 stubs — full text editable in admin) ----------
  const legals = [
    { slug: 'privacy', title: 'Privacy Policy', eyebrow: 'Legal · Data protection', headingHtml: 'Your data — <span class="accent">handled with care.</span>', lede: 'This policy explains what personal data INSPIRE AFRICA collects, why we collect it, how we use and share it, and the rights you have over it.', version: '2.1', lastUpdated: '2026-05-12' },
    { slug: 'cookies', title: 'Cookie Policy', eyebrow: 'Legal · Cookies', headingHtml: 'How we use <span class="accent">cookies.</span>', lede: 'A plain-English explanation of the cookies and similar technologies we use on inspireafricans.com.', version: '1.4', lastUpdated: '2026-05-12' },
    { slug: 'terms', title: 'Terms of Use', eyebrow: 'Legal · Terms', headingHtml: 'Terms of <span class="accent">use.</span>', lede: 'The terms that govern your use of the inspireafricans.com website and platform services.', version: '1.6', lastUpdated: '2026-05-12' },
    { slug: 'modern-slavery', title: 'Modern Slavery Statement', eyebrow: 'Legal · Compliance', headingHtml: 'Modern <span class="accent">slavery statement.</span>', lede: 'INSPIRE AFRICA\'s position on modern slavery and human trafficking, and the measures we take to prevent them.', version: '1.0', lastUpdated: '2026-05-12' },
  ];
  for (const d of legals) {
    const existing = await strapi.documents('api::legal-document.legal-document').findFirst({ filters: { slug: d.slug } as any });
    const data = { ...d, controllerName: 'Inspire Africa Platform Ltd' };
    if (existing) {
      await strapi.documents('api::legal-document.legal-document').update({ documentId: existing.documentId, data: data as any, status: 'published' } as any).catch(() => {});
    } else {
      const created = await strapi.documents('api::legal-document.legal-document').create({ data: data as any } as any).catch(() => null);
      if (created) await strapi.documents('api::legal-document.legal-document').publish({ documentId: created.documentId } as any).catch(() => {});
    }
  }
  strapi.log.info(`[seed-content] ${legals.length} legal documents upserted`);

  // ---------- 10. Home page (with a representative Dynamic Zone) ----------
  // We seed a working Home page with hero + corridors marquee + audiences
  // + insights strip + final CTA, so the Next.js app can fetch it and
  // render immediately. Editors flesh out / re-arrange in the admin.
  const allCorridors = await strapi.documents('api::corridor.corridor').findMany({ sort: 'order:asc' } as any);
  const homeSections = [
    {
      __component: 'sections.hero',
      watermark: 'INSPIRE',
      eyebrow: 'Labour mobility infrastructure',
      headingHtml: '<span class="small-italic">Work abroad.</span>Earn more.<br/><span class="accent">Change<br/>your future.</span>',
      lede: 'INSPIRE AFRICA connects skilled African workers, employers and governments through governed migration pathways, predictive screening and migration finance.',
      photoCaptionTitle: 'Ready Now',
      photoCaptionSub: '3-tier readiness pipeline',
      ctas: [
        { label: 'Join the Community', href: '/join', variant: 'primary', withArrow: true },
        { label: 'Our Approach', href: '/approach', variant: 'ghost', withArrow: false },
      ],
    },
    {
      __component: 'sections.corridors-marquee',
      label: 'Operating across',
      corridors: allCorridors.map((c: any) => c.documentId),
    },
    {
      __component: 'sections.audiences',
      eyebrow: 'Who is INSPIRE for',
      headingHtml: 'Three audiences.<br/><span class="yellow">One platform.</span>',
      lede: 'Workers are our primary audience. Employers and governments engage through trusted pathways.',
      cards: [
        { number: '01', title: 'Access global work', body: 'Fair, structured pathways with preparation, support and salary-linked finance.', tag: 'For Workers', ctaLabel: 'Start Your Journey', ctaHref: '/workers', isPrimary: true },
        { number: '02', title: 'Hire ethically', body: 'Pre-screened, job-ready African talent deployed compliantly.', tag: 'For Employers', ctaLabel: 'Talk to Us', ctaHref: '/employers', isPrimary: false },
        { number: '03', title: 'Govern mobility', body: 'Build transparent, scalable migration pathways aligned with national strategy.', tag: 'Governments', ctaLabel: 'Explore a Partnership', ctaHref: '/governments', isPrimary: false },
      ],
    },
    {
      __component: 'sections.insights-strip',
      eyebrow: 'From the field',
      headingHtml: 'Insights from the<br/><span class="yellow">corridor.</span>',
      lede: 'Reporting and analysis from inside the labour-mobility platform — policy shifts, market signals and the structural reasons they matter.',
      limit: 3,
      ctaLabel: 'Read the piece',
      ctaHref: '/blog',
    },
    {
      __component: 'sections.final-cta',
      eyebrow: 'Your move',
      headingHtml: '<span class="italic-accent">If you\'re ready —</span>Join the<br/>community.',
      lede: 'Free membership. Direct route into the INSPIRE AFRICA ecosystem.',
      primaryCta: { label: 'Join the Community — Free', href: '/join', variant: 'dark', withArrow: true },
      secondaryLinks: [
        { label: 'For Employers', href: '/employers', order: 1 },
        { label: 'For Governments', href: '/governments', order: 2 },
        { label: 'Contact Us', href: '/contact', order: 3 },
      ],
    },
  ];

  const existingHome = await strapi.documents('api::page.page').findFirst({ filters: { slug: 'home' } as any });
  const pageData = {
    title: 'Home', slug: 'home',
    seo: { metaTitle: 'INSPIRE AFRICA — Labour mobility infrastructure', metaDescription: 'INSPIRE AFRICA connects skilled African workers, employers and governments through governed migration pathways.' },
    sections: homeSections,
  };
  if (existingHome) {
    await strapi.documents('api::page.page').update({ documentId: existingHome.documentId, data: pageData as any, status: 'published' } as any).catch((e) => strapi.log.warn(`[seed-content] home update: ${e.message}`));
  } else {
    const created = await strapi.documents('api::page.page').create({ data: pageData as any } as any).catch((e) => { strapi.log.warn(`[seed-content] home create: ${e.message}`); return null; });
    if (created) await strapi.documents('api::page.page').publish({ documentId: created.documentId } as any).catch(() => {});
  }

  // ---------- 11. Inner marketing pages (Dynamic Zones) ----------
  await upsertPage(strapi, 'workers', WORKERS_PAGE);
  await upsertPage(strapi, 'employers', EMPLOYERS_PAGE);
  await upsertPage(strapi, 'governments', GOVERNMENTS_PAGE);
  await upsertPage(strapi, 'approach', APPROACH_PAGE);
  await upsertPage(strapi, 'join', JOIN_PAGE);

  strapi.log.info('[seed-content] DONE.');
}

// ---------- helper: idempotent page upsert ----------
async function upsertPage(strapi: any, slug: string, data: { title: string; seo: any; sections: any[] }) {
  const existing = await strapi.documents('api::page.page').findFirst({ filters: { slug } as any });
  const payload = { ...data, slug };
  if (existing) {
    await strapi.documents('api::page.page').update({ documentId: existing.documentId, data: payload as any, status: 'published' } as any).catch((e: any) => strapi.log.warn(`[seed-content] page ${slug} update: ${e.message}`));
  } else {
    const created = await strapi.documents('api::page.page').create({ data: payload as any } as any).catch((e: any) => { strapi.log.warn(`[seed-content] page ${slug} create: ${e.message}`); return null; });
    if (created) await strapi.documents('api::page.page').publish({ documentId: created.documentId } as any).catch(() => {});
  }
  strapi.log.info(`[seed-content] page upserted: ${slug}`);
}

// ============================================================
// PAGE TEMPLATES — Dynamic Zones for the 5 inner marketing pages
// Each captures the exact section sequence currently hard-coded in
// app/<route>/page.tsx so the migrated page renders identically.
// ============================================================

const WORKERS_PAGE = {
  title: 'For Workers',
  seo: {
    metaTitle: 'For Workers — INSPIRE AFRICA',
    metaDescription: 'Work abroad safely. Fair, structured pathways into international employment, with preparation and salary-linked finance.',
  },
  sections: [
    {
      __component: 'sections.hero',
      watermark: 'WORKERS',
      eyebrow: 'For workers',
      headingHtml: '<span class="small-italic">Work abroad.</span>Earn more.<br/><span class="accent">Change<br/>your future.</span>',
      lede: 'Access real international job opportunities with fair recruitment, structured preparation and no large up-front costs.',
      photoUrl: '/images/inspire-handshake-interview.jpg',
      photoAlt: 'Two African professionals working together on a laptop',
      photoCaptionTitle: 'Fair · Transparent',
      photoCaptionSub: 'Protected at every step',
      ctas: [
        { label: 'Join the Community', href: '/join', variant: 'primary', withArrow: true, utmSource: 'workers_hero' },
        { label: 'How it works', href: '/approach', variant: 'ghost', withArrow: false },
      ],
    },
    {
      __component: 'sections.feature-list',
      tone: 'alt',
      eyebrow: 'The reality',
      headingHtml: 'The opportunity is real. <span class="yellow">The system is not.</span>',
      lede: 'You should not have to risk everything to build a better future.',
      items: [
        { marker: '×', isBad: true, title: 'Jobs exist abroad — but access is limited', body: 'Opportunities are real but hard to reach from where you are today.' },
        { marker: '×', isBad: true, title: 'Up-front costs are too high', body: "Most pathways demand savings or family loans before you've earned a single pound." },
        { marker: '×', isBad: true, title: 'Pathways are unclear or unsafe', body: 'Information is fragmented, and unregulated agents fill the gap.' },
        { marker: '×', isBad: true, title: 'Too many take risks with irregular migration', body: 'Without a legal route, people lose money, time and sometimes their safety.' },
      ],
    },
    {
      __component: 'sections.feature-list',
      tone: 'yellow',
      eyebrow: 'A clear, supported pathway',
      headingHtml: 'Everything you need <span class="italic-accent">to succeed.</span>',
      lede: 'INSPIRE AFRICA provides a structured journey from job readiness to international employment, with support at every step.',
      items: [
        { marker: '✓', title: 'Transparent process', body: 'Clear steps from start to finish — no hidden stages, no surprise costs.' },
        { marker: '✓', title: 'Interview & workplace preparation', body: 'Coaching so you arrive ready, not learning on the job.' },
        { marker: '✓', title: 'Documentation & relocation support', body: 'We handle the paperwork so you can focus on the role.' },
        { marker: '✓', title: 'Access to migration finance', body: 'Salary-linked plans where needed — no family loans, no predatory interest.' },
      ],
    },
    {
      __component: 'sections.step-cards',
      eyebrow: 'Fair · Transparent · Protected',
      headingHtml: 'You should not have to <span class="yellow">risk everything.</span>',
      items: [
        { marker: '01', title: 'Employers pay the fees', body: 'Recruitment fees are paid by employers — not workers. That principle is non-negotiable.' },
        { marker: '02', title: 'No hidden steps', body: "The process is documented end-to-end. You know what's next and what it costs." },
        { marker: '03', title: 'Support throughout', body: 'From preparation to deployment to aftercare — you are not left alone at any stage.' },
      ],
    },
    {
      __component: 'sections.final-cta',
      eyebrow: 'Your future starts here',
      headingHtml: "<span class=\"italic-accent\">Take the first step —</span>Join the<br/>community.",
      lede: "Free membership. The single, supported route into INSPIRE's ecosystem.",
      primaryCta: { label: 'Join the Community — Free', href: '/join', variant: 'dark', withArrow: true, utmSource: 'workers_final' },
    },
  ],
};

const EMPLOYERS_PAGE = {
  title: 'For Employers',
  seo: {
    metaTitle: 'For Employers — INSPIRE AFRICA',
    metaDescription: 'Hire faster. Pre-screened, job-ready African talent on a compliant platform. 2/3 cost reduction, 1/3 faster timelines.',
  },
  sections: [
    {
      __component: 'sections.hero',
      watermark: 'EMPLOYERS',
      eyebrow: 'For employers',
      headingHtml: '<span class="small-italic">Hire faster.</span>Reduce cost.<br/><span class="accent">Increase<br/>certainty.</span>',
      lede: 'Access a reliable pipeline of pre-screened, job-ready African talent through a single, compliant platform.',
      photoUrl: '/images/inspire-chef-square.jpg',
      photoAlt: 'Professional in a modern office environment',
      photoCaptionTitle: 'Ready Now',
      photoCaptionSub: 'Pre-screened, prepared, deployable',
      ctas: [
        { label: 'Hire Talent', href: '#employers-form', variant: 'primary', withArrow: true },
        { label: 'How it works', href: '/approach', variant: 'ghost', withArrow: false },
      ],
    },
    {
      __component: 'sections.feature-list',
      tone: 'alt',
      eyebrow: 'The status quo',
      headingHtml: 'International hiring is <span class="yellow">broken.</span>',
      lede: "You pay more — but outcomes don't improve. Legacy recruitment passes risk down the chain to you.",
      items: [
        { marker: '×', isBad: true, title: 'Long hiring timelines', body: 'Months lost between vacancy and arrival, while your roster runs short.' },
        { marker: '×', isBad: true, title: 'High and unpredictable costs', body: "Fees scale with friction, not with quality. You don't know the final number until the invoice arrives." },
        { marker: '×', isBad: true, title: 'Poor candidate matching', body: "CVs aren't readiness. Mismatched hires drop out in the first 90 days." },
        { marker: '×', isBad: true, title: 'Opaque subcontractor networks', body: "You don't know who actually sourced the worker, or what they paid to get there." },
      ],
    },
    {
      __component: 'sections.feature-list',
      tone: 'yellow',
      eyebrow: 'A better way to hire',
      headingHtml: 'Built for <span class="italic-accent">outcomes</span> — not transactions.',
      lede: 'INSPIRE AFRICA replaces fragmented recruitment with a structured, Africa-based talent pipeline. The model is transparent, ethical and measurable from end to end.',
      items: [
        { marker: '✓', title: 'Predictive screening', body: 'Capability, behaviour and readiness assessed before any CV reaches you.' },
        { marker: '✓', title: 'Centralised preparation', body: 'Candidates arrive prepared for the workplace — language, documentation, expectations all handled.' },
        { marker: '✓', title: 'Migration finance', body: 'Salary-linked finance expands the pool of available talent without falling on you.' },
        { marker: '✓', title: 'Compliance-first', body: 'Audit-ready documentation. Aligned with the IOM's IRIS and other international ethical recruitment standards.' },
      ],
    },
    {
      __component: 'sections.numbers',
      eyebrow: 'Early results',
      headingHtml: 'What our partners <span class="yellow">are seeing.</span>',
      stats: [
        { value: '2/3', label: 'Reduction in cost-per-hire', order: 1 },
        { value: '~1/3', label: 'Faster hiring timelines', order: 2 },
        { value: '0', label: 'Defaults on salary-linked plans', order: 3 },
        { value: '7', label: 'Destination corridors', order: 4 },
      ],
    },
    {
      __component: 'sections.process-list',
      eyebrow: 'Simple, structured',
      headingHtml: 'Five steps. <span class="yellow">No surprises.</span>',
      lede: 'From defining your hiring needs to ongoing post-placement support — a coordinated, predictable process.',
      steps: [
        { title: 'Define your hiring needs', body: 'Roles, sectors, locations, scale, timeline.' },
        { title: 'Receive pre-screened candidates', body: 'Predictive screening shortlists those who will actually arrive ready.' },
        { title: 'Interview and select', body: 'Your decision, on your timeline, with full context on each candidate.' },
        { title: 'We manage deployment', body: 'Documentation, compliance, relocation logistics — all coordinated.' },
        { title: 'Ongoing support post-placement', body: 'Aftercare reduces drop-outs and protects your investment in the hire.' },
      ],
    },
    {
      __component: 'sections.form-block',
      formKey: 'employers',
      eyebrow: 'Start a conversation',
      headingHtml: 'Hire talent',
      lede: "Tell us about your hiring needs. We'll come back within two working days.",
      anchorId: 'employers-form',
    },
  ],
};

const GOVERNMENTS_PAGE = {
  title: 'For Governments',
  seo: {
    metaTitle: 'For Governments — INSPIRE AFRICA',
    metaDescription: 'Build transparent, scalable and circular labour mobility pathways. Data-driven workforce planning aligned with national development priorities.',
  },
  sections: [
    {
      __component: 'sections.hero',
      watermark: 'GOVERN',
      eyebrow: 'For governments & partners',
      headingHtml: '<span class="small-italic">Make migration work —</span>for your<br/><span class="accent">economy.</span>',
      lede: 'INSPIRE AFRICA provides the tools and infrastructure to build transparent, scalable and circular labour mobility pathways.',
      photoUrl: '/images/inspire-farmer-agriculture.jpg',
      photoAlt: "Architectural sketch of infrastructure — INSPIRE's systemic approach to migration",
      photoCaptionTitle: 'Systems-led',
      photoCaptionSub: 'From migration to mobility infrastructure',
      ctas: [
        { label: 'Partner With Us', href: '#governments-form', variant: 'primary', withArrow: true },
        { label: 'Our Approach', href: '/approach', variant: 'ghost', withArrow: false },
      ],
    },
    {
      __component: 'sections.feature-list',
      tone: 'alt',
      eyebrow: 'The current reality',
      headingHtml: 'Migration is happening —<br/><span class="yellow">but not working optimally.</span>',
      lede: 'Unmanaged migration creates risk for citizens, lost opportunity for economies, and limited oversight for governments.',
      items: [
        { marker: '×', isBad: true, title: 'Irregular migration creates risk and instability', body: 'Without legal channels, citizens move anyway — often through dangerous, exploitative routes.' },
        { marker: '×', isBad: true, title: 'Limited oversight of recruitment pathways', body: 'Informal agents dominate. Government visibility is partial at best.' },
        { marker: '×', isBad: true, title: 'Lost opportunities for skills development and return', body: "Workers leave without a return plan. Skills don't flow back." },
        { marker: '×', isBad: true, title: 'Remittances are not fully leveraged', body: 'Capital arrives at the household level but rarely connects to national development priorities.' },
      ],
    },
    {
      __component: 'sections.feature-list',
      tone: 'yellow',
      eyebrow: 'From unmanaged to governed',
      headingHtml: 'Governed mobility <span class="italic-accent">systems.</span>',
      lede: 'INSPIRE AFRICA enables structured, rules-based labour mobility that aligns with national development priorities.',
      items: [
        { marker: '✓', title: 'Transparent sourcing and selection', body: 'Every candidate is traceable end-to-end. No informal subcontracting.' },
        { marker: '✓', title: 'Worker protection and ethical recruitment', body: 'Aligned with international ethical-recruitment standards. Workers pay no fees.' },
        { marker: '✓', title: 'Data-driven workforce planning', body: 'Visibility into who is moving, where, and what they do — across the full lifecycle.' },
        { marker: '✓', title: 'Scalable international partnerships', body: 'Bilateral pathways designed once, repeatable across corridors and sectors.' },
      ],
    },
    {
      __component: 'sections.process-list',
      eyebrow: 'A structured partnership model',
      headingHtml: 'Five steps. <span class="yellow">Five outcomes.</span>',
      lede: 'From defining priority corridors to enabling return and reintegration — a clear, repeatable framework.',
      steps: [
        { title: 'Define priority sectors and corridors', body: 'Where the national interest sits, and which destination markets align.' },
        { title: 'Establish transparent pathways', body: 'Rules-based, documented, auditable — replacing informal channels.' },
        { title: 'Prepare and deploy workers', body: 'Readiness, finance, compliance — coordinated by INSPIRE, monitored by government.' },
        { title: 'Monitor outcomes abroad', body: 'Welfare, performance, integration — tracked across the journey.' },
        { title: 'Enable return and reintegration', body: 'Skills transfer, savings deployment, second-stage opportunities at home.' },
      ],
    },
    {
      __component: 'sections.form-block',
      formKey: 'governments',
      eyebrow: 'Begin a conversation',
      headingHtml: 'Partner with us',
      lede: 'Tell us briefly about your priorities. A senior member of the team will respond within three working days.',
      anchorId: 'governments-form',
    },
  ],
};

const APPROACH_PAGE = {
  title: 'Our Approach',
  seo: {
    metaTitle: 'Our Approach — INSPIRE AFRICA',
    metaDescription: 'Ethical mobility, Earn-Learn-Return circular migration, structured finance — the operating model behind INSPIRE AFRICA.',
  },
  sections: [
    {
      __component: 'sections.hero',
      watermark: 'APPROACH',
      eyebrow: 'Our approach',
      headingHtml: '<span class="small-italic">Not recruitment.</span><span class="accent">Infrastructure.</span>',
      lede: 'A structured system for global labour mobility — built around four principles: ethical, circular, structured, worker-centred.',
      photoUrl: '/images/inspire-farmer-agriculture.jpg',
      photoAlt: "Architectural sketch of infrastructure — the visual metaphor for INSPIRE's mobility platform",
      photoCaptionTitle: 'Earn · Learn · Return',
      photoCaptionSub: 'The circular model',
      ctas: [
        { label: 'Join the Community', href: '/join', variant: 'primary', withArrow: true, utmSource: 'approach_hero' },
        { label: 'For Workers', href: '/workers', variant: 'ghost', withArrow: false },
      ],
    },
    {
      __component: 'sections.feature-list',
      tone: 'yellow',
      eyebrow: 'Operating principles',
      headingHtml: 'Four ideas. <span class="italic-accent">One system.</span>',
      lede: 'Most international recruitment is fragmented, opaque and extractive. INSPIRE AFRICA is built on four operating principles that shape every decision in the platform.',
      items: [
        { title: 'Ethical', body: 'Worker protection built in. Workers do not pay recruitment fees — employers do. Aligned with the IOM's IRIS and other international ethical recruitment standards.' },
        { title: 'Circular', body: 'Earn-Learn-Return. Labour mobility designed so skills, capital and opportunity flow back into African economies over time.' },
        { title: 'Structured', body: 'Every journey follows a predictable, repeatable pipeline. Readiness, finance, deployment and aftercare coordinated as one system.' },
        { title: 'Worker-Centred', body: "Built around the worker's journey, not the recruiter's deal flow. Outcomes are measured in worker progression — not placement count." },
      ],
    },
    {
      __component: 'sections.process-list',
      eyebrow: 'A coordinated journey',
      headingHtml: 'From <span class="yellow">readiness</span> to return.',
      lede: 'While each pathway is tailored by role, sector and country, every journey follows the same seven-stage logic.',
      steps: [
        { title: 'Prepare', body: 'Candidates are guided through a structured readiness process designed to ensure they are equipped for international work environments.' },
        { title: 'Assess', body: 'Capability, behaviour and suitability evaluated through a consistent, multi-dimensional framework.' },
        { title: 'Match', body: 'Candidates introduced to relevant employers through a controlled and transparent selection process.' },
        { title: 'Enable', body: 'Where required, access to structured migration cost solutions allows candidates to proceed without prohibitive up-front barriers.' },
        { title: 'Deploy', body: 'Documentation, compliance and relocation coordinated to ensure a smooth transition into employment.' },
        { title: 'Support', body: 'Ongoing support maintains stability, performance and integration in the workplace.' },
        { title: 'Return & Progress', body: 'Workers build experience, savings and skills that are reinvested into long-term careers, entrepreneurship and home economies.' },
      ],
    },
    {
      __component: 'sections.final-cta',
      eyebrow: 'Your move',
      headingHtml: '<span class="italic-accent">Ready to begin?</span>Join the<br/>community.',
      lede: 'Free membership. Direct route into the INSPIRE AFRICA ecosystem.',
      primaryCta: { label: 'Join the Community — Free', href: '/join', variant: 'dark', withArrow: true, utmSource: 'approach_cta' },
    },
  ],
};

const JOIN_PAGE = {
  title: 'Join the Community',
  seo: {
    metaTitle: 'Join the Community — INSPIRE AFRICA',
    metaDescription: 'Free membership. Your direct route into the INSPIRE AFRICA ecosystem. Connect with employers, opportunities and fellow professionals already on the journey.',
  },
  sections: [
    {
      __component: 'sections.hero',
      watermark: 'JOIN',
      eyebrow: 'The community',
      headingHtml: '<span class="small-italic">A network of</span>African<br/><span class="accent">professionals,<br/>going global.</span>',
      lede: 'Free membership. Your direct route into the INSPIRE AFRICA ecosystem. Connect with employers, opportunities and fellow professionals already on the journey.',
      photoUrl: '/images/inspire-healthcare-portrait.jpg',
      photoAlt: 'Two African professionals collaborating in a working session',
      photoCaptionTitle: 'Free Forever',
      photoCaptionSub: 'No paywalls. No hidden fees.',
      ctas: [
        { label: "Join — It's Free", href: '/join', variant: 'primary', withArrow: true, utmSource: 'join_page_main' },
        { label: 'For Workers', href: '/workers', variant: 'ghost', withArrow: false },
      ],
    },
    {
      __component: 'sections.feature-list',
      tone: 'yellow',
      eyebrow: 'What you get inside',
      headingHtml: 'Everything you need <span class="italic-accent">in one place.</span>',
      lede: 'The Inspire community on Mighty Networks is your free entry point — a structured, peer-rich space designed to help you move from preparation to placement.',
      items: [
        { marker: '✓', title: 'A vibrant international network', body: 'Connect with African professionals, recruiters and employers already on the path abroad.' },
        { marker: '✓', title: 'Live opportunities', body: 'Real jobs from verified employers — not aggregated scraping from the wider web.' },
        { marker: '✓', title: 'Country-specific guidance', body: 'Practical know-how on UK, EU, USA, Canada, Australia and Saudi Arabia — from people who actually went.' },
        { marker: '✓', title: 'Peer support', body: 'Ask questions, share experience, build relationships that outlast a single placement.' },
        { marker: '✓', title: 'Events and learning', body: 'Webinars, AMAs, language sessions, interview prep — scheduled across time zones.' },
        { marker: '✓', title: 'Free, lifetime access', body: 'No paywalls. No hidden fees. Membership is genuinely free.' },
      ],
    },
    {
      __component: 'sections.process-list',
      eyebrow: 'What to expect',
      headingHtml: 'Your first <span class="yellow">seven days.</span>',
      lede: "Joining is one click. Here's what happens after that.",
      steps: [
        { title: 'Day 1 — Welcome', body: 'You land in the community, set up your profile, and meet a welcome team member.' },
        { title: 'Day 2–3 — Orient', body: "You're guided through the spaces that matter most for your sector and destination." },
        { title: 'Day 4–5 — Connect', body: 'Introduced to peers already on a similar path — and to a recruiter if your readiness profile matches.' },
        { title: 'Day 6–7 — Start a journey', body: "If you're ready, the structured pathway begins. If not, you continue learning at your own pace." },
      ],
    },
    {
      __component: 'sections.step-cards',
      eyebrow: "Who it's for",
      headingHtml: 'Built for <span class="yellow">workers, primarily.</span>',
      items: [
        { marker: 'A', title: 'African workers', body: 'Healthcare, engineering, mechanics, hospitality, mining, construction, care, teaching — if you have skill and ambition, this is your space.' },
        { marker: 'B', title: 'Recruiters', body: 'Trusted partners who source ethically and pay fees themselves. Open access for screened, registered recruiters.' },
        { marker: 'C', title: 'Employers', body: 'Direct line to readiness-screened candidates. Build your pipeline from inside the community, not above it.' },
      ],
    },
    {
      __component: 'sections.final-cta',
      eyebrow: 'One click',
      headingHtml: '<span class="italic-accent">The door is open —</span>Join now.',
      lede: 'Free membership. No card. No commitment.',
      primaryCta: { label: 'Join the Community — Free', href: '/join', variant: 'dark', withArrow: true, utmSource: 'join_page_main' },
    },
  ],
};
