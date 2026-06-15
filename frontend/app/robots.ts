import type { MetadataRoute } from 'next';
import { SITE_URL, PRIVATE_ROUTE_PREFIXES } from './lib/site-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Keep authenticated app routes and API calls out of the index.
      disallow: [...PRIVATE_ROUTE_PREFIXES.map((p) => `${p}/`), '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
