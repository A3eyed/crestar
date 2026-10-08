// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';
import { DEFAULT_FULFILLMENT_SETTINGS } from '@/app/api/utils/fulfillment';

/**
 * GET /api/sellers/fulfillment-settings            → my own settings (auth)
 * GET /api/sellers/fulfillment-settings?sellerId=X → public read for checkout
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
      SELECT * FROM seller_fulfillment_settings WHERE seller_user_id = ${sellerId}
    `;

    return Response.json({
      settings: row || { seller_user_id: sellerId, ...DEFAULT_FULFILLMENT_SETTINGS },
    });
  } catch (error) {
    console.error('Get fulfillment settings error:', error);
    return Response.json({ error: 'Failed to load fulfillment settings' }, { status: 500 });
  }
}

/** POST /api/sellers/fulfillment-settings — seller picks which methods they offer. */
export async function POST(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      enableStorePickup,
      pickupInstructions,
      pickupHours,
      enableOwnDeliveryZones,
      allowOnDemandDeliverers,
    } = body;

    const pickup = Boolean(enableStorePickup);
    const ownZones = Boolean(enableOwnDeliveryZones);
    const onDemand = Boolean(allowOnDemandDeliverers);

    if (!pickup && !ownZones && !onDemand) {
      return Response.json(
        { error: 'Turn on at least one way for buyers to get their order' },
        { status: 400 }
      );
    }

    // Pickup needs a findable store — the buyer has to know where to go.
    if (pickup) {
      const [profile] = await sql`
        SELECT country, region, city FROM professional_profiles WHERE user_id = ${userId}
      `;
      if (!profile?.country || !profile?.city) {
        return Response.json(
          {
            error: 'Add your store location before turning on store pickup',
            code: 'STORE_LOCATION_REQUIRED',
          },
          { status: 400 }
        );
      }
    }

    const [saved] = await sql`
      INSERT INTO seller_fulfillment_settings (
        seller_user_id,
        enable_store_pickup,
        pickup_instructions,
        pickup_hours,
        enable_own_delivery_zones,
        allow_on_demand_deliverers,
        updated_at
      ) VALUES (
        ${userId},
        ${pickup},
        ${pickupInstructions || null},
        ${pickupHours || null},
        ${ownZones},
        ${onDemand},
        NOW()
      )
      ON CONFLICT (seller_user_id) DO UPDATE SET
        enable_store_pickup = EXCLUDED.enable_store_pickup,
        pickup_instructions = EXCLUDED.pickup_instructions,
        pickup_hours = EXCLUDED.pickup_hours,
        enable_own_delivery_zones = EXCLUDED.enable_own_delivery_zones,
        allow_on_demand_deliverers = EXCLUDED.allow_on_demand_deliverers,
        updated_at = NOW()
      RETURNING *
    `;

    return Response.json({ success: true, settings: saved });
  } catch (error) {
    console.error('Save fulfillment settings error:', error);
    return Response.json({ error: 'Failed to save fulfillment settings' }, { status: 500 });
  }
}
