/**
 * Full CMS bodies for the four legal documents, migrated verbatim from
 * the Next.js legal page TSX so editors can maintain them in the admin.
 *
 * Conventions:
 *  - Headings: `level: 'h2'` entries are auto-numbered (01, 02 …) by the
 *    frontend LegalBlocks renderer; `anchorId` matches the sticky-TOC.
 *  - Paragraphs: Strapi Blocks (rich-text) AST so inline links/bold survive.
 *  - Lists / table cells: plain strings that MAY contain inline <a>/<strong>.
 *  - Company details are written as {{tokens}} ({{legalName}},
 *    {{companyNumber}}, {{addressFull}}, {{addressStreet}}, {{addressCity}},
 *    {{addressPostalCode}}, {{addressCountry}}, {{legalEmail}}, {{email}},
 *    {{speakupEmail}}, {{whatsapp}}, {{whatsappLink}}) and substituted at
 *    render time from the CMS site-settings, so they stay a single source
 *    of truth.
 */

export interface LegalBodyDoc {
  tocAnchors: Array<{ label: string; anchorId: string }>;
  body: Array<{ __component: string; [k: string]: any }>;
}

const p = (children: any[]) => ({
  __component: 'blocks.paragraph',
  text: [{ type: 'paragraph', children }],
});
const t = (text: string, extra: Record<string, any> = {}) => ({ type: 'text', text, ...extra });
const link = (url: string, label: string) => ({
  type: 'link',
  url,
  children: [{ type: 'text', text: label }],
});

export const LEGAL_BODIES: Record<string, LegalBodyDoc> = {
  // ─────────────────────────────────────────── PRIVACY ───────────────
  privacy: {
    tocAnchors: [
      { label: 'Who we are', anchorId: 'who-we-are' },
      { label: 'Data we collect', anchorId: 'data-we-collect' },
      { label: 'How we use your data', anchorId: 'how-we-use' },
      { label: 'Lawful basis', anchorId: 'lawful-basis' },
      { label: 'Sharing & disclosure', anchorId: 'sharing' },
      { label: 'International transfers', anchorId: 'international' },
      { label: 'Retention', anchorId: 'retention' },
      { label: 'Your rights', anchorId: 'your-rights' },
      { label: 'Security', anchorId: 'security' },
      { label: 'Changes', anchorId: 'changes' },
      { label: 'Contact', anchorId: 'contact' },
    ],
    body: [
      { __component: 'blocks.lede', text: 'INSPIRE AFRICA operates labour mobility infrastructure across multiple jurisdictions. Protecting the personal data of workers, employers and government partners is foundational to our model — not an afterthought.' },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'who-we-are', text: 'Who we are' },
      p([
        t('{{legalName}}', { bold: true }),
        t(' (company no. {{companyNumber}}) is the data controller for personal data processed through this website and our pathways. Our registered office is {{addressStreet}}, {{addressCity}}, {{addressPostalCode}}, {{addressCountry}}. Our regional office handles operations across our African corridors.'),
      ]),
      p([
        t('For data-protection enquiries, contact our legal team at '),
        link('mailto:{{legalEmail}}', '{{legalEmail}}'),
        t('.'),
      ]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'data-we-collect', text: 'Data we collect' },
      p([t('We collect personal data only where it is necessary to deliver our services, meet legal obligations, or pursue legitimate operational interests. The categories of data we collect depend on your relationship with us.')]),
      { __component: 'blocks.heading', level: 'h3', text: 'From workers and candidates' },
      { __component: 'blocks.list', ordered: false, items: [
        'Identity: name, date of birth, nationality, passport and ID details',
        'Contact: email address, phone number, postal address',
        'Professional: CV, qualifications, work history, references, language proficiency',
        'Assessment data: readiness scores, behavioural assessments, interview notes',
        'Financial: bank details and information necessary for salary-linked finance',
        'Health and biometric data where required by destination-country immigration rules',
      ] },
      { __component: 'blocks.heading', level: 'h3', text: 'From employers and government partners' },
      { __component: 'blocks.list', ordered: false, items: [
        'Organisation, role and contact details of representatives',
        'Job descriptions, role requirements and placement records',
        'Compliance documentation related to ethical-recruitment standards',
      ] },
      { __component: 'blocks.heading', level: 'h3', text: 'When you join the community' },
      p([t('Our community is hosted on Mighty Networks. Before we hand you over, we ask for your details on our own signup page so that we — not only our community provider — can support you.')]),
      { __component: 'blocks.list', ordered: false, items: [
        'Your first name, last name, email address and phone number',
        'The country you tell us you live in, where you provide it',
        'Which page or campaign you came from, so we know what is working',
        'A one-way, irreversible hash of your IP address and your browser&rsquo;s user-agent string, used to block automated abuse — we do not store the IP address itself',
      ] },
      p([t('We also record the fact that a “Join the Community” button was clicked, before any details are entered. That record contains no name, email or phone number — only the page it came from and the anonymised values above. Once you arrive at Mighty Networks they will ask you to create an account with them, governed by their own privacy policy.')]),

      { __component: 'blocks.heading', level: 'h3', text: 'Automatically' },
      { __component: 'blocks.list', ordered: false, items: [
        'Device and browser information, IP address, approximate location',
        'Pages viewed, referral source and interaction events (see our <a href="/cookies">Cookie Policy</a>)',
      ] },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'how-we-use', text: 'How we use your data' },
      p([t('We use personal data to operate the INSPIRE platform — matching qualified workers to ethical employers, supporting governments to govern mobility, and ensuring compliant deployment.')]),
      { __component: 'blocks.list', ordered: false, items: [
        'Assess readiness, suitability and eligibility for international roles',
        'Match candidates to employer vacancies and coordinate selection',
        'Operate salary-linked migration finance, including affordability checks',
        'Manage immigration documentation, travel and aftercare',
        'Communicate updates relevant to your application or partnership',
        'Comply with legal, regulatory and ethical-recruitment obligations',
        'Improve our platform, products and service quality',
      ] },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'lawful-basis', text: 'Lawful basis' },
      p([t('Under UK GDPR and equivalent frameworks in our operating jurisdictions, we rely on one or more of the following lawful bases when processing your personal data:')]),
      { __component: 'blocks.table', headers: ['Basis', 'When we rely on it'], rows: [
        ['<strong>Contract</strong>', 'To deliver services you have engaged us to provide — readiness, matching, deployment, finance.'],
        ['<strong>Legal obligation</strong>', 'Where required by immigration, employment, tax, anti-trafficking or financial-services law.'],
        ['<strong>Legitimate interests</strong>', 'For platform improvement, fraud prevention and operational continuity, balanced against your rights. This includes holding the details you give us when joining the community, and measuring how many people click through to it, so we can support members directly rather than depending solely on a third-party platform.'],
        ['<strong>Consent</strong>', 'For optional marketing, sensitive categories of data and non-essential cookies. You may withdraw consent at any time.'],
      ] },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'sharing', text: 'Sharing & disclosure' },
      p([t('We share personal data only with parties necessary to deliver our services — and only under contractual safeguards consistent with this policy.')]),
      { __component: 'blocks.list', ordered: false, items: [
        'Employers and prospective employers — where you have applied or been matched',
        'Mighty Networks, Inc. — our community platform. When you continue from our signup page to the community, you create an account with them directly and their privacy policy applies to it',
        'Government, regulatory and immigration authorities — where legally required',
        'Service providers (cloud hosting, identity verification, payment, communications) bound by data-processing agreements',
        'Professional advisers — legal, audit, compliance',
        'Successors in interest in the event of corporate reorganisation',
      ] },
      { __component: 'blocks.callout', title: 'We do not sell your personal data.', text: 'Worker data is never sold to recruiters, marketers or any third party. Workers do not pay recruitment fees — employers do.' },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'international', text: 'International transfers' },
      p([t('Because INSPIRE AFRICA operates across the UK, EU, USA, Canada, Australia, Saudi Arabia and African corridor countries, your personal data may be transferred outside your country of residence. Where it is, we use appropriate safeguards such as the UK International Data Transfer Agreement, EU Standard Contractual Clauses, or adequacy regulations.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'retention', text: 'Retention' },
      p([t('We retain personal data only for as long as necessary to deliver the service, meet legal obligations, and support legitimate operational needs. Specific retention windows depend on the data category:')]),
      { __component: 'blocks.list', ordered: false, items: [
        'Active candidate and placement records — for the duration of the relationship and up to seven years thereafter',
        'Financial records — six to ten years, depending on jurisdiction',
        'Marketing data — until you withdraw consent',
        'Community signup details (name, email, phone) — three years from your last interaction with us, unless you ask us to erase them sooner',
        'Community click records, which contain no name, email or phone number — fourteen months',
        'Cookies — as set out in our <a href="/cookies">Cookie Policy</a>',
      ] },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'your-rights', text: 'Your rights' },
      p([t('Subject to applicable law, you have the right to:')]),
      { __component: 'blocks.list', ordered: false, items: [
        'Access the personal data we hold about you',
        'Request correction of inaccurate data',
        'Request erasure where there is no overriding legal basis to retain',
        'Restrict or object to certain processing',
        'Request data portability in a structured, machine-readable format',
        'Withdraw consent for processing based on consent',
        'Lodge a complaint with a supervisory authority (e.g. the UK Information Commissioner\'s Office)',
      ] },
      p([
        t('To exercise these rights, email '),
        link('mailto:{{legalEmail}}', '{{legalEmail}}'),
        t('. We respond within one month, extendable by two months for complex requests.'),
      ]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'security', text: 'Security' },
      p([t('We apply organisational and technical measures appropriate to the sensitivity of the data we process — including encryption in transit and at rest, role-based access control, vendor due diligence, secure cloud infrastructure and regular security review. No system is invulnerable, but we treat data security as load-bearing infrastructure.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'changes', text: 'Changes to this policy' },
      p([t('We update this policy as our services and the regulatory landscape evolve. Material changes are flagged on this page and, where appropriate, communicated by email to active users. The version and last-updated date at the top of this page record the current effective version.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'contact', text: 'Contact' },
      p([t('For any question about this policy or your personal data:')]),
      { __component: 'blocks.list', ordered: false, items: [
        'Email: <a href="mailto:{{legalEmail}}">{{legalEmail}}</a>',
        'Post: {{legalName}}, {{addressFull}}',
        'WhatsApp (no calls): <a href="{{whatsappLink}}" target="_blank" rel="noopener">{{whatsapp}}</a>',
      ] },
    ],
  },

  // ─────────────────────────────────────────── TERMS ─────────────────
  terms: {
    tocAnchors: [
      { label: 'Acceptance', anchorId: 'acceptance' },
      { label: 'Definitions', anchorId: 'definitions' },
      { label: 'Eligibility', anchorId: 'eligibility' },
      { label: 'Your account', anchorId: 'account' },
      { label: 'Acceptable use', anchorId: 'acceptable-use' },
      { label: 'Intellectual property', anchorId: 'ip' },
      { label: 'Third-party services', anchorId: 'third-party' },
      { label: 'Fees', anchorId: 'fees' },
      { label: 'Disclaimers', anchorId: 'disclaimers' },
      { label: 'Limitation of liability', anchorId: 'liability' },
      { label: 'Indemnity', anchorId: 'indemnity' },
      { label: 'Suspension & termination', anchorId: 'termination' },
      { label: 'Governing law', anchorId: 'governing-law' },
      { label: 'Changes', anchorId: 'changes' },
      { label: 'Contact', anchorId: 'contact' },
    ],
    body: [
      { __component: 'blocks.lede', text: 'By accessing or using INSPIRE AFRICA, you agree to these terms. If you do not agree, please do not use the platform. Workers, employers and government partners may have additional terms in their respective onboarding agreements; in case of conflict, those signed agreements take precedence.' },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'acceptance', text: 'Acceptance of these terms' },
      p([
        t('These Terms of Use form a binding agreement between you and {{legalName}} (company no. {{companyNumber}}), referred to as '),
        t('"INSPIRE"', { bold: true }),
        t(', '),
        t('"we"', { bold: true }),
        t(' or '),
        t('"us"', { bold: true }),
        t('. By using the website, the community or any of our services, you confirm that you have read, understood and agreed to be bound by these terms and our '),
        link('/privacy', 'Privacy Policy'),
        t('.'),
      ]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'definitions', text: 'Definitions' },
      { __component: 'blocks.list', ordered: false, items: [
        '<strong>"Platform"</strong> means the INSPIRE AFRICA website, community, applications and any related services we provide.',
        '<strong>"Worker"</strong> means an individual seeking or holding international employment through the platform.',
        '<strong>"Employer"</strong> means an organisation engaging the platform to hire workers.',
        '<strong>"Government Partner"</strong> means a public-sector body engaging the platform on migration pathways.',
        '<strong>"User"</strong> means any worker, employer, government partner or visitor using the platform.',
      ] },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'eligibility', text: 'Eligibility' },
      p([t('You must be at least 18 years old and legally able to enter a contract in your country of residence. If you are using the platform on behalf of an organisation, you confirm that you have the authority to bind that organisation to these terms.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'account', text: 'Your account' },
      p([t('Some parts of the platform — including the community — require registration. You agree to:')]),
      { __component: 'blocks.list', ordered: false, items: [
        'Provide accurate, current and complete information when you register',
        'Keep your credentials secure and not share them with others',
        'Notify us promptly of any unauthorised access',
        'Be responsible for activity carried out under your account',
      ] },
      p([t('Joining the community involves two separate steps. First you give your details to INSPIRE AFRICA on our own signup page; we hold those under our <a href="/privacy">Privacy Policy</a>. You are then taken to Mighty Networks, where you create a community account governed by their terms. We do not control that account, and cannot log in to, moderate or recover it on your behalf beyond what their platform allows us as the community host.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'acceptable-use', text: 'Acceptable use' },
      p([t('When using the platform you must not:')]),
      { __component: 'blocks.list', ordered: false, items: [
        'Use the platform for any unlawful, fraudulent or harmful purpose',
        'Misrepresent your identity, qualifications or organisation',
        'Charge workers recruitment fees or otherwise breach ethical-recruitment standards',
        'Engage in trafficking, forced labour or any practice contrary to the UK Modern Slavery Act 2026',
        'Upload content that is defamatory, abusive, discriminatory or violates third-party rights',
        'Interfere with the platform\'s operation, including by scraping, automated access or attempting to gain unauthorised access',
        'Use the platform to circumvent immigration, employment or sanctions laws in any jurisdiction',
      ] },
      { __component: 'blocks.callout', title: 'Our worker-first commitment', text: 'Workers do not pay recruitment fees through this platform. Any attempt by an employer or partner to charge workers contravenes these terms and may lead to immediate suspension.' },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'ip', text: 'Intellectual property' },
      p([t('The platform, including its design, code, text, graphics and trademarks, is owned by Inspire Africa Platform Ltd or licensed to us. You receive a limited, non-exclusive, non-transferable licence to use the platform for its intended purpose. You may not copy, modify, distribute or create derivative works without our prior written consent.')]),
      p([t('Content you submit — such as your CV, profile or community posts — remains yours. You grant us a worldwide, non-exclusive licence to host, process and display that content as necessary to deliver the platform.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'third-party', text: 'Third-party services' },
      p([t('The platform integrates third-party services for hosting, analytics, payments and community. Your use of those services is governed by their own terms. We are not responsible for third-party content or practices but choose our providers carefully and bind them under data-processing agreements where applicable.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'fees', text: 'Fees' },
      p([t('Use of the public website and community is free. Employers and government partners are subject to fees as set out in their respective service agreements. Worker-side services that involve structured finance are governed by separate, transparent salary-linked agreements signed before any obligation arises.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'disclaimers', text: 'Disclaimers' },
      p([
        t('The platform is provided '),
        t('"as is"', { bold: true }),
        t(' and '),
        t('"as available"', { bold: true }),
        t('. While we work hard to maintain availability and accuracy, we do not warrant that the platform will be uninterrupted, error-free or meet your specific requirements. Nothing in these terms excludes liability that cannot be excluded by law — including liability for death or personal injury caused by negligence and liability for fraud.'),
      ]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'liability', text: 'Limitation of liability' },
      p([t('To the maximum extent permitted by law, INSPIRE is not liable for:')]),
      { __component: 'blocks.list', ordered: false, items: [
        'Indirect, consequential or special losses',
        'Loss of profit, revenue, business, opportunity, goodwill or anticipated savings',
        'Loss or corruption of data or interruption of service',
      ] },
      p([t('Our aggregate liability arising out of or in connection with these terms is limited to the greater of (a) the fees you have paid us in the twelve months preceding the event giving rise to the claim, or (b) £100.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'indemnity', text: 'Indemnity' },
      p([t('You agree to indemnify and hold INSPIRE harmless from claims, damages and costs arising from your breach of these terms, your misuse of the platform, or your violation of any law or third-party right.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'termination', text: 'Suspension & termination' },
      p([t('We may suspend or terminate your access to the platform — with or without notice — if we reasonably believe you have breached these terms, posed a risk to other users, or acted contrary to ethical-recruitment standards. You may stop using the platform at any time; sections relating to intellectual property, liability and governing law survive termination.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'governing-law', text: 'Governing law & disputes' },
      p([t('These terms are governed by the laws of England and Wales. The courts of England and Wales have exclusive jurisdiction over any dispute, except that we may bring proceedings in the courts of the jurisdiction in which you are resident where required by mandatory law. We encourage you to contact us first — most disputes are resolved through dialogue.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'changes', text: 'Changes to these terms' },
      p([t('We may update these terms as our platform and the regulatory landscape evolve. Material changes are flagged on this page and, where appropriate, communicated by email. Continued use of the platform after changes take effect constitutes acceptance of the revised terms.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'contact', text: 'Contact' },
      p([t('Questions about these terms:')]),
      { __component: 'blocks.list', ordered: false, items: [
        'Email: <a href="mailto:{{legalEmail}}">{{legalEmail}}</a>',
        'Post: {{legalName}}, {{addressFull}}',
        'WhatsApp (no calls): <a href="{{whatsappLink}}" target="_blank" rel="noopener">{{whatsapp}}</a>',
      ] },
    ],
  },

  // ─────────────────────────────────────────── COOKIES ───────────────
  cookies: {
    tocAnchors: [
      { label: 'What cookies are', anchorId: 'what-are-cookies' },
      { label: 'Why we use them', anchorId: 'why-we-use' },
      { label: 'Categories we use', anchorId: 'categories' },
      { label: 'Cookies we set', anchorId: 'cookie-list' },
      { label: 'Third-party cookies', anchorId: 'third-party' },
      { label: 'How to manage cookies', anchorId: 'manage' },
      { label: 'Consent & preferences', anchorId: 'consent' },
      { label: 'Changes', anchorId: 'changes' },
      { label: 'Contact', anchorId: 'contact' },
    ],
    body: [
      { __component: 'blocks.lede', text: 'We use cookies and similar technologies to keep the site working, to remember preferences such as your theme choice, and to understand how visitors use the platform so we can improve it. We do not use cookies to build behavioural advertising profiles.' },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'what-are-cookies', text: 'What cookies are' },
      p([t('Cookies are small text files placed on your device when you visit a website. They allow the site to recognise your device on subsequent visits and to remember choices you have made. Similar technologies — such as local storage, pixels and SDKs — perform comparable functions and are covered by this policy.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'why-we-use', text: 'Why we use them' },
      { __component: 'blocks.list', ordered: false, items: [
        'To keep the site secure and operational',
        'To remember your preferences, including theme and language',
        'To understand which content is useful and where the site can be improved',
        'To measure the performance of our community outreach',
      ] },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'categories', text: 'Categories we use' },
      p([t('We group cookies into four standard categories. Only strictly necessary cookies are loaded by default — others run only with your consent.')]),
      { __component: 'blocks.table', headers: ['Category', 'Purpose', 'Consent'], rows: [
        ['<strong>Strictly necessary</strong>', 'Security, load balancing, session integrity, theme preference.', 'Not required'],
        ['<strong>Performance</strong>', 'Aggregate page views, navigation paths and load timings to improve the site.', 'Required'],
        ['<strong>Functional</strong>', 'Remember preferences such as language or accessibility settings.', 'Required'],
        ['<strong>Marketing</strong>', 'Measure campaign performance on third-party platforms (e.g. LinkedIn).', 'Required'],
      ] },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'cookie-list', text: 'Cookies we set' },
      p([t('The list below covers the principal cookies and storage keys set by this website. Names and durations may evolve as the platform changes; the policy version above reflects the most recent review.')]),
      { __component: 'blocks.table', headers: ['Name', 'Purpose', 'Type', 'Duration'], rows: [
        ['<strong>inspire-theme</strong>', 'Stores your light, dark or system theme choice.', 'Functional · localStorage', 'Persistent'],
        ['<strong>ia_session</strong>', 'Maintains your session and protects against cross-site request forgery.', 'Strictly necessary', 'Session'],
        ['<strong>ia_consent</strong>', 'Records your cookie-consent choices.', 'Strictly necessary', '12 months'],
        ['<strong>_ga, _ga_*</strong>', 'Google Analytics 4 — measures usage in aggregate.', 'Performance', '13 months'],
        ['<strong>li_fat_id</strong>', 'LinkedIn Insight Tag — measures campaign attribution.', 'Marketing', '30 days'],
      ] },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'third-party', text: 'Third-party cookies' },
      p([t('Some cookies are placed by third-party providers we use to deliver functionality, measurement or community features:')]),
      { __component: 'blocks.list', ordered: false, items: [
        '<strong>Google LLC</strong> — analytics',
        '<strong>LinkedIn Ireland Unlimited Company</strong> — campaign measurement',
        '<strong>Mighty Networks</strong> — our community platform, which sets its own cookies when you visit the community',
        '<strong>INSPIRE AFRICA signup page</strong> — no cookie. When you click &ldquo;Join the Community&rdquo; we record that click on our own server, not in your browser. That record holds the page you came from and a one-way hash of your IP address; it holds no name, email or phone number unless you go on to complete the form. Because nothing is stored on your device and the record is necessary to operate the signup itself, it does not require cookie consent — see our <a href="/privacy">Privacy Policy</a> for the lawful basis and retention period.',
        '<strong>Wix.com Ltd</strong> — site infrastructure and form handling',
      ] },
      p([t('These providers process limited data on our behalf or as joint controllers. Their own privacy and cookie policies apply when you interact with them directly.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'manage', text: 'How to manage cookies' },
      p([t('You can control cookies in several ways:')]),
      { __component: 'blocks.list', ordered: false, items: [
        '<strong>Browser controls</strong> — most browsers let you block, delete or be alerted to cookies. See your browser\'s help pages for instructions.',
        '<strong>Device-level opt-outs</strong> — operating systems offer ad-tracking controls.',
        '<strong>Provider opt-outs</strong> — for example, Google Analytics offers a browser add-on at <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">tools.google.com/dlpage/gaoptout</a>.',
      ] },
      { __component: 'blocks.callout', title: 'If you block strictly necessary cookies', text: 'Some parts of the site — including security checks and the theme switcher — may not function properly.' },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'consent', text: 'Consent & preferences' },
      p([
        t('When you first visit the site, a cookie banner asks for your consent to non-essential cookies. You may withdraw or change consent at any time by clearing the '),
        t('ia_consent', { bold: true }),
        t(' cookie in your browser, or by emailing us at '),
        link('mailto:{{legalEmail}}', '{{legalEmail}}'),
        t('.'),
      ]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'changes', text: 'Changes to this policy' },
      p([t('We review this policy regularly and whenever we introduce new technologies. The version and last-updated date at the top of this page record the current effective version.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'contact', text: 'Contact' },
      p([t('For any question about cookies on this site, contact:')]),
      { __component: 'blocks.list', ordered: false, items: [
        'Email: <a href="mailto:{{legalEmail}}">{{legalEmail}}</a>',
        'Post: {{legalName}}, {{addressFull}}',
      ] },
      p([
        t('For the full scope of personal-data handling, see our '),
        link('/privacy', 'Privacy Policy'),
        t('.'),
      ]),
    ],
  },

  // ──────────────────────────────────────── MODERN SLAVERY ───────────
  'modern-slavery': {
    tocAnchors: [
      { label: 'Introduction', anchorId: 'introduction' },
      { label: 'Our structure', anchorId: 'structure' },
      { label: 'Supply chain', anchorId: 'supply-chain' },
      { label: 'Policies', anchorId: 'policies' },
      { label: 'Due diligence', anchorId: 'due-diligence' },
      { label: 'Risk assessment', anchorId: 'risk' },
      { label: 'Training', anchorId: 'training' },
      { label: 'KPIs & outcomes', anchorId: 'kpis' },
      { label: 'Reporting concerns', anchorId: 'whistleblowing' },
      { label: 'Looking ahead', anchorId: 'future' },
      { label: 'Board approval', anchorId: 'approval' },
    ],
    body: [
      { __component: 'blocks.lede', text: 'INSPIRE AFRICA exists to make international labour mobility ethical, structured and worker-first. Preventing modern slavery and human trafficking is not a compliance afterthought — it is the operating thesis of the business.' },
      { __component: 'blocks.callout', title: 'Zero-tolerance commitment', text: 'We do not tolerate modern slavery, forced labour, debt bondage, child labour or human trafficking in any form, anywhere in our operations or supply chains. Workers do not pay recruitment fees through this platform — employers do.' },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'introduction', text: 'Introduction' },
      p([t('This statement is published by {{legalName}} (company no. {{companyNumber}}) on behalf of itself and other companies in the group. It covers the financial year ended 31 March 2026 and is made in accordance with section 54 of the UK Modern Slavery Act 2026.')]),
      p([t('Modern slavery — including human trafficking, forced labour and debt bondage — is a structural risk in international labour mobility. We treat that risk as central to platform design, not as a tick-box exercise.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'structure', text: 'Our structure' },
      p([t('INSPIRE AFRICA is a labour-mobility infrastructure business connecting African workers to ethical employers through government-recognised pathways. We operate across the UK, EU, USA, Canada, Australia, Saudi Arabia and African corridor countries. Our key functions include:')]),
      { __component: 'blocks.list', ordered: false, items: [
        'Worker readiness, screening and pre-departure support',
        'Employer matching and compliant deployment',
        'Salary-linked migration finance',
        'Government partnership and pathway design',
      ] },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'supply-chain', text: 'Our supply chain' },
      p([t('Our supply chain is concentrated in services rather than physical goods. The main categories are:')]),
      { __component: 'blocks.table', headers: ['Category', 'Examples', 'Risk profile'], rows: [
        ['<strong>Recruitment partners</strong>', 'In-country sourcing and training organisations', 'Elevated — direct contact with candidates'],
        ['<strong>Employers</strong>', 'Care groups, hospitality, agriculture, construction', 'Sector-dependent — monitored continuously'],
        ['<strong>Professional services</strong>', 'Legal, audit, immigration advisory', 'Low'],
        ['<strong>Technology suppliers</strong>', 'Cloud hosting, identity verification, payments', 'Low'],
        ['<strong>Operations</strong>', 'Office facilities, travel, communications', 'Low'],
      ] },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'policies', text: 'Our policies' },
      p([t('The following policies underpin our anti-slavery commitment. They apply across the group and to all partners who deliver services under our brand:')]),
      { __component: 'blocks.list', ordered: false, items: [
        'Ethical Recruitment Policy — aligned with IRIS Standard and ILO Fair Recruitment Initiative',
        'Worker-Pays-Nothing Policy — workers never pay recruitment fees; employers do',
        'Supplier Code of Conduct — pre-contract due diligence and ongoing audits',
        'Whistleblowing and Speak-Up Policy',
        'Anti-Bribery and Corruption Policy',
        'Data Protection and Worker Privacy Policy — see our <a href="/privacy">Privacy Policy</a>',
      ] },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'due-diligence', text: 'Due diligence' },
      p([t('Our due-diligence programme is operational, not paperwork. It runs across three stages:')]),
      { __component: 'blocks.list', ordered: true, items: [
        '<strong>Onboarding.</strong> Every employer and recruitment partner is screened against sanctions, ethical-recruitment standards and labour-rights track records before they can transact on the platform.',
        '<strong>In-pathway monitoring.</strong> Worker check-ins at pre-departure, arrival and post-placement points generate signals that are reviewed by our integrity team. Patterns trigger investigations.',
        '<strong>Independent audit.</strong> Annual audits of priority corridors, performed by an external firm specialising in fair-recruitment due diligence.',
      ] },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'risk', text: 'Risk assessment' },
      p([t('We assess modern-slavery risk by corridor, sector and partner. Our current heat map identifies the following as priority watch-points:')]),
      { __component: 'blocks.list', ordered: false, items: [
        'Sectors with historically high informal-labour reliance (agriculture, hospitality, construction)',
        'Corridors with documented recruitment-fee abuse',
        'Sub-tier partners introduced by primary suppliers',
        'Worker financial pressure that can be exploited by bad actors',
      ] },
      p([t('Risk is reviewed quarterly and after any material incident. Findings shape pathway design, partner selection and training priorities.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'training', text: 'Training' },
      p([t('All staff complete an annual modern-slavery and ethical-recruitment training module. Targeted training is provided to roles in direct candidate contact, compliance and partner management. Recruitment partners are required to evidence equivalent training within their own organisations.')]),

      { __component: 'blocks.heading', level: 'h2', anchorId: 'kpis', text: 'KPIs & outcomes' },
      p([t('We measure progress through a small number of operational indicators. The figures below reflect the statement period:')]),
      { __component: 'blocks.table', headers: ['Indicator', 'Target', 'Outcome'], rows: [
        ['<strong>Workers paying recruitment fees</strong>', '0', '0'],
        ['<strong>Partner audits completed</strong>', '100%', '100%'],
        ['<strong>Staff anti-slavery training completion</strong>', '100%', '100%'],
        ['<strong>Substantiated grievances</strong>', '—', '0'],
        ['<strong>Speak-Up channel reports investigated within 30 days</strong>', '100%', '100%'],
      ] },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'whistleblowing', text: 'Reporting concerns' },
      p([t('Workers, employers, partners and members of the public can report concerns confidentially via our Speak-Up channel. Concerns can be raised in any of our operating languages, and we do not tolerate retaliation against anyone reporting in good faith.')]),
      { __component: 'blocks.list', ordered: false, items: [
        'Email: <a href="mailto:{{speakupEmail}}">{{speakupEmail}}</a>',
        'Post: Compliance Officer, {{legalName}}, {{addressFull}}',
      ] },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'future', text: 'Looking ahead' },
      p([t('In the next financial year we plan to:')]),
      { __component: 'blocks.list', ordered: false, items: [
        'Extend independent audits to all active corridors',
        'Publish a worker-voice index drawn from anonymous candidate feedback',
        'Strengthen sub-tier partner mapping using structured data from primary suppliers',
        'Co-develop corridor-level anti-trafficking protocols with our government partners',
      ] },

      { __component: 'blocks.heading', level: 'h2', anchorId: 'approval', text: 'Board approval' },
      p([t('This statement was reviewed and approved by the Board of Directors of {{legalName}} on 12 May 2026. It will be reviewed annually and updated as required by law and by changes to our operations.')]),
      p([
        t('Signed —', { bold: true }),
        t(' on behalf of the Board\n{{legalName}}\n12 May 2026'),
      ]),
    ],
  },
};
