import type { MetadataRoute } from 'next';
import sql from '@/app/api/utils/sql';

const BASE_URL = 'https://crestar.created.app';

// Sitemap for search engines — includes static pages plus live product,
// seller, and video pages so Crestar content is fully indexable.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: 'hourly', priority: 1 },
    { url: `${BASE_URL}/shop`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/foodhub`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/account/signup`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/account/signin`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  let productPages: MetadataRoute.Sitemap = [];
  let videoPages: MetadataRoute.Sitemap = [];
  let sellerPages: MetadataRoute.Sitemap = [];

  try {
    const products = await sql`
      SELECT id, updated_at FROM products
      WHERE status = 'active'
      ORDER BY updated_at DESC
      LIMIT 1000
    `;
    productPages = products.map((p: { id: string; updated_at: string }) => ({
      url: `${BASE_URL}/product/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));
  } catch (e) {
    console.error('[sitemap] products query failed:', e);
  }

  try {
    const videos = await sql`
      SELECT id, updated_at FROM videos
      WHERE status = 'active' AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1000
    `;
    videoPages = videos.map((v: { id: string; updated_at: string }) => ({
      url: `${BASE_URL}/video/${v.id}`,
      lastModified: v.updated_at ? new Date(v.updated_at) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch (e) {
    console.error('[sitemap] videos query failed:', e);
  }

  try {
    const sellers = await sql`
      SELECT DISTINCT au.id, au.updated_at
      FROM auth_users au
      JOIN products p ON p.seller_id = au.id::text AND p.status = 'active'
      LIMIT 500
    `;
    sellerPages = sellers.map((s: { id: string; updated_at: string }) => ({
      url: `${BASE_URL}/seller/${s.id}`,
      lastModified: s.updated_at ? new Date(s.updated_at) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (e) {
    console.error('[sitemap] sellers query failed:', e);
  }

  return [...staticPages, ...productPages, ...sellerPages, ...videoPages];
}
