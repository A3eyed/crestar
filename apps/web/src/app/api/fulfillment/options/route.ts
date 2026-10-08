// @ts-nocheck
import sql from '@/app/api/utils/sql';
import {
  DEFAULT_FULFILLMENT_SETTINGS,
  computeRateCardFee,
  estimateEta,
  haversineKm,
  matchDeliveryZone,
  routeCovers,
  scopeCovers,
} from '@/app/api/utils/fulfillment';

/**
 * POST /api/fulfillment/options
 * Body: { sellerId, buyerLocation: { country, region, city, latitude?, longitude? } }
 *
 * Returns every way this seller can get the order to this buyer, priced.
 * The buyer picks one at checkout and the fee lands in the order total.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { sellerId, buyerLocation } = body;

    if (!sellerId) {
      return Response.json({ error: 'sellerId is required' }, { status: 400 });
    }

    const location = {
      country: buyerLocation?.country || null,
      region: buyerLocation?.region || null,
      city: buyerLocation?.city || null,
      latitude: buyerLocation?.latitude ?? null,
      longitude: buyerLocation?.longitude ?? null,
    };

    const [seller] = await sql`
      SELECT
        pp.user_id,
        pp.business_name,
        pp.country,
        pp.region,
        pp.city,
        pp.village,
        pp.store_landmark,
        pp.store_latitude,
        pp.store_longitude,
        pp.default_currency
      FROM professional_profiles pp
      WHERE pp.user_id = ${sellerId}
    `;

    const sellerLocation = {
      country: seller?.country || null,
      region: seller?.region || null,
      city: seller?.city || null,
      latitude: seller?.store_latitude ?? null,
      longitude: seller?.store_longitude ?? null,
    };

    const currency = seller?.default_currency || 'GHS';

    const [settingsRow] = await sql`
      SELECT * FROM seller_fulfillment_settings WHERE seller_user_id = ${sellerId}
    `;
    const settings = settingsRow || DEFAULT_FULFILLMENT_SETTINGS;

    const options = [];

    // ── 1. Store pickup — always free ──────────────────────────────────────
    if (settings.enable_store_pickup && seller?.city) {
      options.push({
        id: `pickup:${sellerId}`,
        type: 'pickup',
        label: 'Pick up from store',
        fee: 0,
        currency,
        isFree: true,
        eta: settings.pickup_hours || 'Ready when you are',
        storeLocation: {
          country: seller.country,
          region: seller.region,
          city: seller.city,
          village: seller.village,
          landmark: seller.store_landmark,
        },
        instructions: settings.pickup_instructions || null,
        recommended: false,
      });
    }

    // ── 2. The seller's own delivery, priced town by town ──────────────────
    let matchedZoneId = null;
    if (settings.enable_own_delivery_zones) {
      const zones = await sql`
        SELECT id, country, region_name, city_name, delivery_fee, is_free_delivery,
               estimated_time, currency
        FROM seller_delivery_zones
        WHERE seller_user_id = ${sellerId} AND is_active = true
        ORDER BY country, region_name, city_name
      `;

      const { matched } = matchDeliveryZone(zones, location);
      matchedZoneId = matched?.id || null;

      for (const zone of zones) {
        const isMatch = matched && zone.id === matched.id;
        const placeParts = [zone.city_name, zone.region_name, zone.country].filter(Boolean);
        options.push({
          id: `zone:${zone.id}`,
          type: 'seller_delivery',
          label: zone.is_free_delivery ? 'Free delivery' : 'Seller delivery',
          place: placeParts.join(', '),
          fee: zone.is_free_delivery ? 0 : Number(zone.delivery_fee) || 0,
          currency: zone.currency || currency,
          isFree: Boolean(zone.is_free_delivery),
          eta: zone.estimated_time || null,
          zoneId: zone.id,
          recommended: Boolean(isMatch),
          international: Boolean(
            zone.country &&
            seller?.country &&
            String(zone.country).trim().toLowerCase() !==
              String(seller.country).trim().toLowerCase()
          ),
        });
      }
    }

    // ── 3. Delivery Center riders who set their own price ──────────────────
    if (settings.allow_on_demand_deliverers) {
      const cards = await sql`
        SELECT
          rc.*,
          dp.user_id        AS deliverer_user_id,
          dp.full_name      AS deliverer_name,
          dp.vehicle_type,
          dp.rating,
          dp.total_deliveries,
          u.username        AS deliverer_username,
          u.profile_image   AS deliverer_image
        FROM deliverer_rate_cards rc
        JOIN deliverer_profiles dp ON dp.user_id = rc.deliverer_user_id
        JOIN deliverer_seller_requests dsr
          ON dsr.deliverer_user_id = rc.deliverer_user_id
         AND dsr.seller_user_id = ${sellerId}
         AND dsr.status = 'accepted'
        LEFT JOIN auth_users u ON u.id = rc.deliverer_user_id
        WHERE rc.is_active = true
          AND dp.is_available = true
          AND dp.verification_status = 'approved'
        ORDER BY rc.sort_order ASC
      `;

      const distanceKm = haversineKm(sellerLocation, location);

      const priced = [];
      for (const card of cards) {
        if (card.currency && currency && card.currency !== currency) continue;

        const covered =
          card.pricing_model === 'ROUTE'
            ? routeCovers(card, sellerLocation, location)
            : scopeCovers(card.origin_scope, sellerLocation) &&
              scopeCovers(card.destination_scope, location);

        if (!covered) continue;

        const fee = computeRateCardFee(card, distanceKm);
        if (fee === null) continue;

        priced.push({
          id: `rate:${card.id}`,
          type: 'on_demand',
          label: card.name,
          fee,
          currency: card.currency || currency,
          isFree: fee === 0,
          eta: estimateEta(card, sellerLocation, location),
          rateCardId: card.id,
          delivererId: card.deliverer_user_id,
          delivererName: card.deliverer_name || card.deliverer_username || 'Crestar deliverer',
          delivererImage: card.deliverer_image || null,
          vehicleType: card.vehicle_type || null,
          rating: card.rating !== null && card.rating !== undefined ? Number(card.rating) : null,
          totalDeliveries: card.total_deliveries || 0,
          pricingModel: card.pricing_model,
          distanceKm,
          recommended: false,
        });
      }

      priced.sort((a, b) => a.fee - b.fee);
      options.push(...priced.slice(0, 10));
    }

    // Nothing matched the buyer's town? Recommend the cheapest thing we have
    // so the buyer is never stuck staring at an unselected list.
    if (options.length > 0 && !options.some((o) => o.recommended)) {
      const cheapest = [...options].sort((a, b) => a.fee - b.fee)[0];
      if (cheapest) cheapest.recommended = true;
    }

    return Response.json({
      sellerId,
      seller: {
        businessName: seller?.business_name || null,
        location: sellerLocation,
        landmark: seller?.store_landmark || null,
      },
      settings: {
        pickup: Boolean(settings.enable_store_pickup),
        sellerDelivery: Boolean(settings.enable_own_delivery_zones),
        onDemand: Boolean(settings.allow_on_demand_deliverers),
      },
      currency,
      matchedZoneId,
      options,
    });
  } catch (error) {
    console.error('Fulfillment options error:', error);
    return Response.json({ error: 'Failed to load delivery options' }, { status: 500 });
  }
}
