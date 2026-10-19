// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';
import { releaseOrderEscrow } from '@/app/api/utils/orderSettlement';
import { notifyWithEmail } from '@/app/api/utils/notify';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DELIVERY CONFIRMATION — funds become withdrawable (no auto bank/MoMo send)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   charge   → full amount sits in Crestar's Paystack balance (no charge-time
 *              split).
 *   webhook  → each party's share recorded as PENDING in the internal ledger.
 *   HERE     → buyer confirms with their 4-digit PIN:
 *                a) order → completed              (atomic compare-and-set)
 *                b) ledger Pending → Available     (releaseOrderEscrow)
 *              Crestar retains only `orders.platform_fee`.
 *
 * Money is NOT transferred to bank/MoMo at confirmation time. Recipients cash
 * out manually from Available balance, or receive funds later only if they
 * enabled a payout schedule (processed by the scheduled-payouts cron).
 */

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // metres
}

// GET /api/orders/confirm-delivery?orderId=XX — order details for the buyer
export async function GET(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');
    if (!orderId) {
      return Response.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const [order] = await sql`
      SELECT o.*,
             pp.full_name AS seller_full_name,
             COALESCE(
               NULLIF(TRIM(au.business_name), ''),
               NULLIF(TRIM(pp.business_name), ''),
               au.display_name,
               au.username,
               au.name
             ) AS seller_business_name,
             au.username AS seller_handle
      FROM orders o
      LEFT JOIN auth_users au ON au.id = o.seller_id
      LEFT JOIN professional_profiles pp ON pp.user_id = o.seller_id
      WHERE o.id = ${orderId} AND (o.buyer_id = ${userId} OR o.seller_id = ${userId})
    `;

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    return Response.json({
      order: {
        ...order,
        sellerName: order.seller_business_name || order.seller_full_name || 'Seller',
        sellerHandle: order.seller_handle || null,
      },
    });
  } catch (error) {
    console.error('Get order error:', error);
    return Response.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const body = await request.json();
    const {
      orderId,
      deliveryPin,
      pin,
      delivererLatitude,
      delivererLongitude,
      method = 'pin',
    } = body;

    const submittedPin = deliveryPin ?? pin;

    if (method !== 'pin' && method !== 'buyer_confirm') {
      return Response.json({ error: 'Invalid confirmation method' }, { status: 400 });
    }
    if (!orderId) {
      return Response.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const [order] = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only the buyer releases their own funds.
    if (String(order.buyer_id) !== String(userId)) {
      return Response.json(
        { error: 'Only the buyer can confirm delivery for this order' },
        { status: 403 }
      );
    }

    // ── Status guards ──────────────────────────────────────────────────────
    if (order.status === 'pending_payment') {
      return Response.json(
        { error: 'Payment has not been completed for this order yet' },
        { status: 400 }
      );
    }
    if (order.status === 'completed') {
      return Response.json({ error: 'This order has already been confirmed' }, { status: 400 });
    }
    if (order.status === 'cancelled' || order.status === 'refunded') {
      return Response.json({ error: 'This order can no longer be confirmed' }, { status: 400 });
    }

    // ── PIN verification ───────────────────────────────────────────────────
    if (method === 'pin') {
      if (!submittedPin) {
        return Response.json({ error: 'Delivery PIN is required' }, { status: 400 });
      }
      if (String(submittedPin).trim() !== String(order.delivery_pin || '').trim()) {
        return Response.json({ error: 'Invalid delivery PIN' }, { status: 400 });
      }

      // Optional proximity sanity check — only when the deliverer supplies
      // coordinates. Drop-offs at lorry stations (Tamale, Tolon and similar)
      // mean strict proximity can't be mandatory.
      if (
        delivererLatitude &&
        delivererLongitude &&
        order.delivery_latitude &&
        order.delivery_longitude
      ) {
        const metres = calculateDistance(
          parseFloat(delivererLatitude),
          parseFloat(delivererLongitude),
          parseFloat(order.delivery_latitude),
          parseFloat(order.delivery_longitude)
        );
        if (metres > 5000) {
          console.warn(
            `⚠️ Order ${order.order_number}: confirmation ${Math.round(metres)}m from delivery point`
          );
        }
      }
    }

    // ── 1. Close the order. Compare-and-set so a double-tap can't double-pay ─
    const now = new Date().toISOString();
    const [claimed] = await sql`
      UPDATE orders
      SET status = 'completed',
          payment_status = 'paid',
          payout_status = 'retained',
          delivered_at = COALESCE(delivered_at, ${now}),
          completed_at = ${now},
          updated_at = ${now}
      WHERE id = ${orderId} AND status <> 'completed'
      RETURNING *
    `;

    if (!claimed) {
      return Response.json({ error: 'This order has already been confirmed' }, { status: 400 });
    }

    const updatedOrder = claimed;

    // Close out the delivery assignment, if there is one.
    await sql`
      UPDATE delivery_assignments
      SET status = 'delivered', delivered_at = COALESCE(delivered_at, ${now}), updated_at = ${now}
      WHERE order_id = ${orderId} AND status <> 'delivered'
    `;

    // ── 2. Ledger: Pending → Available for every party on this order ───────
    // No Paystack transfer here. Users withdraw manually, or via payout schedule.
    const release = await releaseOrderEscrow(updatedOrder);
    console.log(
      `🔓 Order ${updatedOrder.order_number} escrow release (wallet only, no auto-transfer):`,
      release.released ? release.moved : release.reason || release.error
    );

    // ── 3. Notify seller — funds are in wallet Available for cashout ───────
    try {
      const amount = parseFloat(updatedOrder.seller_payout || 0).toFixed(2);
      const currency = updatedOrder.currency || 'GHS';
      await notifyWithEmail({
        userId: updatedOrder.seller_id,
        type: 'payment_released',
        title: '💰 Funds available in your wallet',
        body: `Order ${updatedOrder.order_number} was confirmed by the buyer. ${currency} ${amount} is now in your Available balance. Cash out anytime, or use a payout schedule if you have one enabled.`,
        data: { order_id: updatedOrder.id, amount, currency },
        emailSubject: `Funds available for order ${updatedOrder.order_number}`,
      });
    } catch (notifyErr) {
      console.error('Release notification failed:', notifyErr);
    }

    return Response.json({
      success: true,
      order: updatedOrder,
      message:
        'Delivery confirmed. Payment is available in the wallet for manual cashout (or scheduled payout if enabled).',
      escrow: release,
      payout: {
        payoutStatus: 'retained',
        results: [],
        legs: [],
        note: 'No automatic bank/MoMo transfer on delivery confirm. Withdraw from Available balance or enable a payout schedule.',
      },
    });
  } catch (error) {
    console.error('Confirm delivery error:', error);
    return Response.json({ error: 'Failed to confirm delivery' }, { status: 500 });
  }
}
