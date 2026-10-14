// @ts-nocheck
import type { MetadataRoute } from 'next';

const SITE_URL = 'https://crestarhq.com';

/**
 * Next.js robots route — works alongside public/robots.txt.
 * Admin and private areas must never be indexed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api/admin',
          '/api/admin/',
          '/account/',
          '/wallet',
          '/orders',
          '/seller/',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
