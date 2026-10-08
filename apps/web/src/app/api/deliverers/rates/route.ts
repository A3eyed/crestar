// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';
import { validateRateCard } from '@/app/api/utils/fulfillment';

/** GET /api/deliverers/rates — the signed-in deliverer's own price list. */
export async function GET(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const activeOnly = url.searchParams.get('active') === 'true';

    const rateCards = activeOnly
      ? await sql`
          SELECT * FROM deliverer_rate_cards
          WHERE deliverer_user_id = ${userId} AND is_active = true
          ORDER BY sort_order ASC, created_at ASC
        `
      : await sql`
          SELECT * FROM deliverer_rate_cards
          WHERE deliverer_user_id = ${userId}
          ORDER BY sort_order ASC, created_at ASC
        `;

    return Response.json({ rateCards });
  } catch (error) {
    console.error('Get deliverer rates error:', error);
    return Response.json({ error: 'Failed to load your rates' }, { status: 500 });
  }
}

/** POST /api/deliverers/rates — deliverer sets their own price for a trip. */
export async function POST(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [profile] = await sql`
      SELECT id FROM deliverer_profiles WHERE user_id = ${userId}
    `;
    if (!profile) {
      return Response.json(
        { error: 'Open a Delivery Center before setting your rates' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { valid, errors } = validateRateCard(body);
    if (!valid) {
      return Response.json({ error: errors[0], errors }, { status: 400 });
    }

    const {
      name,
      currency,
      pricingModel,
      flatFee,
      baseFee,
      perKmFee,
      minimumFee,
      originScope,
      destinationScope,
      etaText,
      isActive,
      sortOrder,
    } = body;

    const usesPerKm = pricingModel === 'BASE_PLUS_PER_KM';

    const [card] = await sql`
      INSERT INTO deliverer_rate_cards (
        deliverer_user_id,
        name,
        currency,
        pricing_model,
        flat_fee,
        base_fee,
        per_km_fee,
        minimum_fee,
        origin_scope,
        destination_scope,
        eta_text,
        is_active,
        sort_order
      ) VALUES (
        ${userId},
        ${String(name).trim()},
        ${currency || 'GHS'},
        ${pricingModel},
        ${usesPerKm ? null : Number(flatFee) || 0},
        ${usesPerKm ? Number(baseFee) || 0 : null},
        ${usesPerKm ? Number(perKmFee) || 0 : null},
        ${minimumFee === undefined || minimumFee === null || minimumFee === '' ? null : Number(minimumFee)},
        ${JSON.stringify(originScope || {})},
        ${JSON.stringify(destinationScope || {})},
        ${etaText || null},
        ${isActive === undefined ? true : Boolean(isActive)},
        ${Number(sortOrder) || 0}
      )
      RETURNING *
    `;

    return Response.json({ success: true, rateCard: card });
  } catch (error) {
    console.error('Create deliverer rate error:', error);
    return Response.json({ error: 'Failed to save this rate' }, { status: 500 });
  }
}
