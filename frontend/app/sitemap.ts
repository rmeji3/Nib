import type { MetadataRoute } from 'next';
import { SITE_URL, PUBLIC_ROUTES } from './lib/site-config';

/** Per-route crawl hints. The homepage is the priority; legal pages change rarely. */
const ROUTE_META: Record<
  string,
  { changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }
> = {
  '/': { changeFrequency: 'weekly', priority: 1 },
  '/about': { changeFrequency: 'monthly', priority: 0.7 },
  '/contact': { changeFrequency: 'monthly', priority: 0.6 },
  '/signin': { changeFrequency: 'yearly', priority: 0.5 },
  '/signup': { changeFrequency: 'yearly', priority: 0.5 },
  '/privacy': { changeFrequency: 'yearly', priority: 0.3 },
  '/security': { changeFrequency: 'yearly', priority: 0.3 },
  '/data-handling': { changeFrequency: 'yearly', priority: 0.3 },
};

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map((route) => {
    const meta = ROUTE_META[route] ?? { changeFrequency: 'monthly', priority: 0.5 };
    return {
      url: `${SITE_URL}${route === '/' ? '' : route}`,
      lastModified,
      changeFrequency: meta.changeFrequency,
      priority: meta.priority,
    };
  });
}
