/**
 * Single source of truth for SEO/site-level constants, shared by the root metadata,
 * sitemap, robots, and OG image. Override the URL per-environment with
 * NEXT_PUBLIC_SITE_URL (e.g. a preview deployment); defaults to production.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://readnib.com'
).replace(/\/$/, '');

export const SITE_NAME = 'Nib';

export const SITE_TITLE = 'Nib: Read documents with grounded AI';

export const SITE_DESCRIPTION =
  'A calm, professional document reader with a research-grade AI built in. Ask anything about a chart, table, or buried footnote and get grounded answers with citations.';

/** Public, indexable marketing routes. Keep in sync with the sitemap. */
export const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/security',
  '/data-handling',
  '/signin',
  '/signup',
] as const;

/** Authenticated/app routes that crawlers should not index. */
export const PRIVATE_ROUTE_PREFIXES = [
  '/home',
  '/settings',
  '/document',
  '/file',
  '/verify',
  '/reset-password',
  '/forgot-password',
] as const;
