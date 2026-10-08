// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

/**
 * The shop address buyers see on a seller's profile — town, region, country
 * and a nearby landmark, the same way TikTok Shop surfaces where a shop is.
 *
 * GET /api/sellers/store-location            → mine (auth)
 * GET /api/sellers/store-location?sellerId=X → public
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const sellerIdParam = url.searchParams.get('sellerId');

    let sellerId = sellerIdParam;
    if (!sellerId) {
      sellerId = await resolveUserId(request);
      if (!sellerId) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const [row] = await sql`
      SELECT
        user_id,
        country,
        region,
        city,
        village,
        store_landmark,
        store_latitude,
        store_longitude
      FROM professional_profiles
      WHERE user_id = ${sellerId}
    `;

    return Response.json({ location: row || null });
  } catch (error) {
    console.error('Get store location error:', error);
    return Response.json({ error: 'Failed to load store location' }, { status: 500 });
  }
}

/** POST /api/sellers/store-location — seller sets where their shop actually is. */
export async function POST(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { country, region, city, village, storeLandmark, latitude, longitude } = body;

    if (!country || !String(country).trim()) {
      return Response.json({ error: 'Country is required' }, { status: 400 });
    }
    if (!city || !String(city).trim()) {
      return Response.json({ error: 'Town or city is required' }, { status: 400 });
    }

    const lat =
      latitude === null || latitude === undefined || latitude === '' ? null : Number(latitude);
    const lng =
      longitude === null || longitude === undefined || longitude === '' ? null : Number(longitude);

    if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
      return Response.json({ error: 'Invalid latitude' }, { status: 400 });
    }
    if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
      return Response.json({ error: 'Invalid longitude' }, { status: 400 });
    }

    const [existing] = await sql`
      SELECT id FROM professional_profiles WHERE user_id = ${userId}
    `;

    if (!existing) {
      return Response.json(
        { error: 'Open a Seller Center before setting your store location' },
        { status: 400 }
      );
    }

    const [updated] = await sql`
      UPDATE professional_profiles SET
        country = ${String(country).trim()},
        region = ${region ? String(region).trim() : null},
        city = ${String(city).trim()},
        village = ${village ? String(village).trim() : null},
        store_landmark = ${storeLandmark ? String(storeLandmark).trim() : null},
        store_latitude = ${lat},
        store_longitude = ${lng},
        updated_at = NOW()
      WHERE user_id = ${userId}
      RETURNING user_id, country, region, city, village, store_landmark, store_latitude, store_longitude
    `;

    return Response.json({ success: true, location: updated });
  } catch (error) {
    console.error('Save store location error:', error);
    return Response.json({ error: 'Failed to save store location' }, { status: 500 });
  }
}
