// @ts-nocheck
import { POST as confirmDelivery } from '@/app/api/orders/confirm-delivery/route';

/**
 * Legacy alias for /api/orders/confirm-delivery.
 *
 * This route used to carry its own copy of the escrow-release logic, which
 * only ever released the SELLER's share — creator commissions and delivery
 * fees stayed stuck in Pending forever if a client happened to call this URL
 * instead of the canonical one. Rather than keep two implementations of the
 * money path in sync, it now forwards to the single source of truth.
 */
export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  const forwarded = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({
      orderId: body.orderId,
      deliveryPin: body.pin ?? body.deliveryPin,
      method: 'pin',
    }),
  });

  return confirmDelivery(forwarded);
}
