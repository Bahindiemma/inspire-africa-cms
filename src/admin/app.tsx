/**
 * Strapi v5 admin-panel customization for INSPIRE AFRICA.
 *
 * Customizes:
 *   - login page logo + welcome copy
 *   - left-menu logo + workspace name
 *   - browser tab title + favicon
 *   - color theme (brand yellow #F8BD26, Madimi One)
 *   - locale (en-GB only)
 *   - disables Strapi marketing UI: tutorials, release notifications,
 *     "Boost your productivity" video links
 *
 * Drop-in asset paths are resolved at build time by Strapi's admin
 * webpack — `src/admin/extensions/*.png` are valid imports.
 */
import * as React from 'react';
import type { StrapiApp } from '@strapi/strapi/admin';
import AuthLogo from './extensions/auth-logo.png';
import MenuLogo from './extensions/menu-logo.png';
import Favicon from './extensions/favicon.png';

/** Simple bar-chart glyph for the Analytics menu link. */
const AnalyticsIcon = () =>
  React.createElement(
    'svg',
    { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    React.createElement('rect', { x: 3, y: 12, width: 4, height: 9, rx: 1, fill: 'currentColor' }),
    React.createElement('rect', { x: 10, y: 7, width: 4, height: 14, rx: 1, fill: 'currentColor' }),
    React.createElement('rect', { x: 17, y: 3, width: 4, height: 18, rx: 1, fill: 'currentColor' })
  );

// Brand palette mapped to Strapi's design tokens. Only swap the colors
// that change brand perception — leave Strapi's neutrals alone so the
// admin stays readable.
const BRAND_YELLOW = '#F8BD26';
const BRAND_YELLOW_DARK = '#D6A11C';
const BRAND_BLACK = '#0A0A0A';
const BRAND_CREAM = '#FAFAF7';

export default {
  config: {
    // ---------- Branding assets ----------
    auth: {
      logo: AuthLogo,
    },
    menu: {
      logo: MenuLogo,
    },
    head: {
      favicon: Favicon,
      title: 'INSPIRE AFRICA — CMS',
    },

    // ---------- Locales ----------
    locales: ['en'],

    // ---------- Translations: overrides Strapi default strings ----------
    translations: {
      en: {
        // Auth screens — the brand wordmark is already in the logo
        // (auth-logo.png), so we blank every welcome-heading key on
        // both the login form and the register / first-admin forms.
        // CSS in bootstrap() also hides the heading element so any
        // future key Strapi adds is suppressed too.
        'Auth.form.welcome.title': ' ',
        'Auth.form.welcome.subtitle': 'Sign in to the labour-mobility CMS',
        'Auth.form.welcome.register.title': ' ',
        'Auth.form.welcome.register.subtitle': 'Create your administrator account',
        'Auth.form.register.subtitle.skipped': ' ',
        'Auth.form.firstAdmin.title': ' ',
        'Auth.form.firstAdmin.subtitle': 'Create your first administrator account',
        'Auth.form.register-admin.title': ' ',
        'Auth.form.register-admin.subtitle': 'Set up the first administrator',
        'app.components.Login.welcome': ' ',
        'app.components.Login.subTitle': 'Sign in to the labour-mobility CMS',

        // Field labels — kept readable
        'Auth.form.button.login': 'Sign in',
        'Auth.form.password.label': 'Password',
        'Auth.form.email.label': 'Email',
        'Auth.form.rememberMe.label': 'Keep me signed in',
        'Auth.link.forgot-password': 'Forgot your password?',

        // Left-menu header (the bit above the navigation)
        'app.components.LeftMenu.navbrand.title': 'INSPIRE AFRICA',
        'app.components.LeftMenu.navbrand.workplace': 'Labour Mobility CMS',

        // Welcome / home page
        'app.components.HomePage.welcome': 'Welcome to INSPIRE AFRICA',
        'app.components.HomePage.welcome.again': 'Welcome back to INSPIRE AFRICA',
        'app.components.HomePage.welcomeBlock.content':
          'Manage every piece of content on the public site from here — pages, blog posts, corridors, legal documents, site settings and design tokens. The Next.js front-end revalidates automatically on every publish.',
        'app.components.HomePage.welcomeBlock.content.again':
          'Pick up where you left off. The public site reflects every publish within seconds via the revalidation webhook.',
        'app.components.HomePage.welcomeBlock.button.blog':
          'Open the API contract',
        'app.components.HomePage.welcomeBlock.button.documentation':
          'Read the docs',

        // Browser tab
        'HomePage.head.title': 'Dashboard — INSPIRE AFRICA CMS',
        'app.components.LeftMenu.collection-types': 'Content',
        'app.components.LeftMenu.single-types': 'Site-wide',

        // Hide the "Boost your productivity" copy block on the home page
        // (Strapi shows links to YouTube + tutorials we don't need).
        'app.components.HomePage.productivity':
          'Need help? See the project README, deployment runbook, and API contract under /docs in the repo.',
      },
    },

    // ---------- Theme (light + dark) ----------
    theme: {
      light: {
        colors: {
          // Primary action (CTA buttons, links)
          primary100: '#FFF8E1',
          primary200: '#FFE48A',
          primary500: BRAND_YELLOW,
          primary600: BRAND_YELLOW_DARK,
          primary700: '#A07410',

          // Buttons
          buttonPrimary500: BRAND_YELLOW,
          buttonPrimary600: BRAND_YELLOW_DARK,

          // Surfaces
          neutral0: '#FFFFFF',
          neutral100: BRAND_CREAM,
          neutral150: '#F4F2EC',

          // Text — keep Strapi's dark text on yellow buttons readable
          neutral800: BRAND_BLACK,
          neutral900: BRAND_BLACK,
        },
      },
      dark: {
        colors: {
          primary100: '#2A2200',
          primary200: '#5A4900',
          primary500: BRAND_YELLOW,
          primary600: BRAND_YELLOW_DARK,
          primary700: '#A07410',

          buttonPrimary500: BRAND_YELLOW,
          buttonPrimary600: BRAND_YELLOW_DARK,
        },
      },
    },

    // ---------- Marketing UI: off ----------
    tutorials: false,
    notifications: {
      releases: false,
    },
  },

  /**
   * register() runs before the admin app mounts. Add the Visitor
   * Analytics dashboard as a top-level left-menu link.
   */
  register(app: StrapiApp) {
    app.addMenuLink({
      to: '/analytics',
      icon: AnalyticsIcon,
      intlLabel: { id: 'analytics.menu.label', defaultMessage: 'Analytics' },
      Component: async () => {
        const page = await import('./pages/Analytics');
        return page;
      },
      // No menu-level gate: the dashboard fetches via the content-manager
      // API, which already enforces per-role read access to analytics types.
      permissions: [],
      position: 6,
    });
  },

  /**
   * bootstrap() runs once when the admin app boots. We use it to:
   *   1. Inject brand CSS (Madimi One font import + a few targeted overrides)
   *   2. Set the document title eagerly so the browser tab is right
   *      even before the React app has hydrated.
   */
  bootstrap(app: StrapiApp) {
    if (typeof document === 'undefined') return;

    // Madimi One via Google Fonts CDN + custom CSS overrides.
    const head = document.head;

    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    head.appendChild(preconnect1);

    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';
    head.appendChild(preconnect2);

    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href =
      'https://fonts.googleapis.com/css2?family=Madimi+One&display=swap';
    head.appendChild(fontLink);

    // Targeted overrides. We use very specific selectors so we don't
    // wreck Strapi's internal layout. The brand font is applied to
    // headings + brand text only — the rest of the admin keeps its
    // tuned default (Inter) for tabular legibility.
    const style = document.createElement('style');
    style.id = 'inspire-africa-admin-overrides';
    style.textContent = `
      :root {
        --inspire-yellow: ${BRAND_YELLOW};
        --inspire-black:  ${BRAND_BLACK};
        --inspire-cream:  ${BRAND_CREAM};
        --inspire-font-display: 'Madimi One', 'Impact', sans-serif;
      }

      /* Login + register pages — hide the welcome heading entirely
         because the brand wordmark is already shown via auth-logo.png.
         The Strapi <h1> on these screens is typographically large and
         duplicates the logo's "INSPIRE AFRICA" text. Hiding it both
         here AND blanking the i18n key is defence in depth. */
      [class*="AuthLayout"] h1,
      [class*="LoginForm"] h1,
      [class*="Register"] h1,
      [class*="ForgotPassword"] h1,
      [class*="ResetPassword"] h1,
      [class*="UnauthenticatedLayout"] h1,
      [data-strapi-header] h1,
      h1[data-testid="welcome-title"] {
        display: none !important;
      }
      /* Give the auth logo a touch more breathing room now the H1 is gone. */
      [class*="AuthLayout"] img[alt*="logo" i],
      [class*="UnauthenticatedLayout"] img[alt*="logo" i] {
        margin-bottom: 24px;
      }

      /* Login page background — subtle yellow tint */
      [class*="AuthLayout__Wrapper"],
      [class*="UnauthenticatedLayout"] {
        background: linear-gradient(180deg, var(--inspire-cream) 0%, #FFFFFF 100%);
      }

      /* Login logo — give it room to breathe (the brand mark is wide) */
      img[alt*="logo" i],
      img[alt*="application" i] {
        max-height: 56px !important;
        width: auto !important;
        object-fit: contain;
      }

      /* Left-menu logo (sidebar) — wider wordmark needs more height */
      nav[aria-label="Main menu"] img,
      [class*="LeftMenuHeader"] img,
      [class*="MainNav"] img {
        max-height: 38px !important;
        width: auto !important;
        object-fit: contain;
      }

      /* Home page welcome card — brand the headline */
      h1[class*="welcome"], h2[class*="welcome"],
      [class*="HomePage"] h1, [class*="HomePage"] h2 {
        font-family: var(--inspire-font-display) !important;
      }

      /* Yellow CTA buttons render the arrow + label in dark for contrast */
      button[class*="Primary"] {
        color: var(--inspire-black) !important;
      }

      /* Hide Strapi marketing widgets we don't need */
      [data-strapi-promo],
      [class*="StrapiBlog"],
      [aria-label*="Strapi Blog" i],
      [aria-label*="release notes" i] {
        display: none !important;
      }
    `;
    head.appendChild(style);

    // Force the document title in case Strapi's i18n string isn't applied
    // before the first paint.
    document.title = 'INSPIRE AFRICA — CMS';
  },
};
