// @ts-nocheck
import type { MetadataRoute } from 'next';

const SITE_URL = 'https://crestarhq.com';

/**
 * Public sitemap only — admin, account, wallet, and API routes are intentionally excluded.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const publicRoutes: { path: string; changeFrequency: MetadataRoute.Sitemap[0]['changeFrequency']; priority: number }[] = [
    { path: '/', changeFrequency: 'hourly', priority: 1 },
    { path: '/shop', changeFrequency: 'hourly', priority: 0.95 },
    { path: '/live/watch', changeFrequency: 'hourly', priority: 0.9 },
    { path: '/search', changeFrequency: 'daily', priority: 0.8 },
    { path: '/account/signup', changeFrequency: 'monthly', priority: 0.85 },
    { path: '/account/signin', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/terms', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/privacy', changeFrequency: 'monthly', priority: 0.5 },
  ];

  return publicRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
