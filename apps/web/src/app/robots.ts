import type { MetadataRoute } from 'next';

const BASE_URL = 'https://crestar.created.app';

// robots.txt — allow full crawling of public content, block private/user
// areas and API routes, and point crawlers at the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/admin/',
          '/wallet',
          '/orders',
          '/inbox',
          '/cart',
          '/checkout',
          '/settings',
          '/settings/',
          '/edit-profile',
          '/monetization-center',
          '/seller/dashboard',
          '/seller/analytics',
          '/account/logout',
          '/account/reset-password',
          '/account/change-password',
          '/test-signup',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
