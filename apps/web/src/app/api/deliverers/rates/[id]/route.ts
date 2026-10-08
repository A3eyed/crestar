// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';
import { validateRateCard } from '@/app/api/utils/fulfillment';

async function loadOwnedCard(id, userId) {
  const [card] = await sql`
    SELECT * FROM deliverer_rate_cards WHERE id = ${id} AND deliverer_user_id = ${userId}
  `;
  return card || null;
}

export async function GET(request, { params }) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const card = await loadOwnedCard(id, userId);
    if (!card) return Response.json({ error: 'Rate not found' }, { status: 404 });

    return Response.json({ rateCard: card });
  } catch (error) {
    console.error('Get deliverer rate error:', error);
    return Response.json({ error: 'Failed to load this rate' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await loadOwnedCard(id, userId);
    if (!existing) return Response.json({ error: 'Rate not found' }, { status: 404 });

    const body = await request.json();

    // Only re-run pricing validation when pricing actually changed — a simple
    // on/off toggle shouldn't be blocked by an unrelated field.
    const pricingTouched = [
      'name',
      'pricingModel',
      'flatFee',
      'baseFee',
      'perKmFee',
      'originScope',
      'destinationScope',
    ].some((key) => key in body);

    if (pricingTouched) {
      const merged = {
        name: body.name ?? existing.name,
        pricingModel: body.pricingModel ?? existing.pricing_model,
        flatFee: body.flatFee ?? existing.flat_fee,
        baseFee: body.baseFee ?? existing.base_fee,
        perKmFee: body.perKmFee ?? existing.per_km_fee,
        originScope: body.originScope ?? existing.origin_scope,
        destinationScope: body.destinationScope ?? existing.destination_scope,
      };
      const { valid, errors } = validateRateCard(merged);
      if (!valid) return Response.json({ error: errors[0], errors }, { status: 400 });
    }

    const pricingModel = body.pricingModel ?? existing.pricing_model;
    const usesPerKm = pricingModel === 'BASE_PLUS_PER_KM';

    const [updated] = await sql`
      UPDATE deliverer_rate_cards SET
        name = ${body.name ?? existing.name},
        currency = ${body.currency ?? existing.currency},
        pricing_model = ${pricingModel},
        flat_fee = ${usesPerKm ? null : Number(body.flatFee ?? existing.flat_fee) || 0},
        base_fee = ${usesPerKm ? Number(body.baseFee ?? existing.base_fee) || 0 : null},
        per_km_fee = ${usesPerKm ? Number(body.perKmFee ?? existing.per_km_fee) || 0 : null},
        minimum_fee = ${
          body.minimumFee === undefined
            ? existing.minimum_fee
            : body.minimumFee === null || body.minimumFee === ''
              ? null
              : Number(body.minimumFee)
        },
        origin_scope = ${JSON.stringify(body.originScope ?? existing.origin_scope ?? {})},
        destination_scope = ${JSON.stringify(body.destinationScope ?? existing.destination_scope ?? {})},
        eta_text = ${body.etaText === undefined ? existing.eta_text : body.etaText || null},
        is_active = ${body.isActive === undefined ? existing.is_active : Boolean(body.isActive)},
        sort_order = ${body.sortOrder === undefined ? existing.sort_order : Number(body.sortOrder) || 0},
        updated_at = NOW()
      WHERE id = ${id} AND deliverer_user_id = ${userId}
      RETURNING *
    `;

    return Response.json({ success: true, rateCard: updated });
  } catch (error) {
    console.error('Update deliverer rate error:', error);
    return Response.json({ error: 'Failed to update this rate' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await loadOwnedCard(id, userId);
    if (!existing) return Response.json({ error: 'Rate not found' }, { status: 404 });

    await sql`
      DELETE FROM deliverer_rate_cards WHERE id = ${id} AND deliverer_user_id = ${userId}
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete deliverer rate error:', error);
    return Response.json({ error: 'Failed to delete this rate' }, { status: 500 });
  }
}
