// @ts-nocheck
import type { MetadataRoute } from 'next';

const SITE_URL = 'https://crestarhq.com';

/**
 * Public sitemap only. Private account, wallet, admin, and API routes excluded.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const publicRoutes: {
    path: string;
    changeFrequency: MetadataRoute.Sitemap[0]['changeFrequency'];
    priority: number;
  }[] = [
    { path: '/', changeFrequency: 'hourly', priority: 1 },
    { path: '/shop', changeFrequency: 'hourly', priority: 0.95 },
    { path: '/foodhub', changeFrequency: 'hourly', priority: 0.9 },
    { path: '/search', changeFrequency: 'daily', priority: 0.85 },
    { path: '/live/watch', changeFrequency: 'hourly', priority: 0.85 },
    { path: '/monetization-center', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/create', changeFrequency: 'weekly', priority: 0.75 },
    { path: '/support', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/account/signup', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/account/signin', changeFrequency: 'monthly', priority: 0.65 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.4 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.4 },
  ];

  return publicRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
