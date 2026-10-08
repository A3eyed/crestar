// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';
import { createNotification } from '@/app/api/utils/notify';
import { netOfPlatformFee } from '@/app/api/utils/platformFee';

export async function POST(request) {
  try {
    const body = await request.json();
    const { assignmentId, deliveryPin } = body;

    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    if (!assignmentId) {
      return Response.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    // Get assignment and order
    const [assignment] = await sql`
      SELECT
        da.*,
        o.id AS order_id,
        o.order_number,
        o.delivery_pin,
        o.buyer_id,
        o.seller_id,
        o.status AS order_status,
        o.deliverer_fee
      FROM delivery_assignments da
      JOIN orders o ON da.order_id = o.id
      WHERE da.id = ${assignmentId}
        AND da.deliverer_user_id = ${userId}
        AND da.status IN ('accepted', 'picked_up', 'in_transit')
    `;

    if (!assignment) {
      return Response.json({ error: 'Assignment not found or already completed' }, { status: 404 });
    }

    // Verify PIN
    if (String(deliveryPin || '').trim() !== String(assignment.delivery_pin || '').trim()) {
      return Response.json({ error: 'Invalid delivery PIN' }, { status: 400 });
    }

    // Mark delivery as complete
    const [updatedAssignment] = await sql`
      UPDATE delivery_assignments
      SET
        status = 'delivered',
        delivered_at = NOW(),
        updated_at = NOW()
      WHERE id = ${assignmentId}
      RETURNING *
    `;

    // Update order — funds stay in escrow until the buyer confirms,
    // with an automatic release window as a fallback.
    await sql`
      UPDATE orders
      SET
        status = 'delivered',
        delivered_at = NOW(),
        updated_at = NOW(),
        escrow_release_at = COALESCE(escrow_release_at, NOW() + INTERVAL '3 days')
      WHERE id = ${assignment.order_id}
        AND status NOT IN ('completed', 'cancelled', 'refunded')
    `;

    // ── Pay the deliverer through the Crestar ledger (idempotent) ──
    // Crestar's flat 3% platform fee applies to the delivery leg too.
    // orders.deliverer_fee is already net (the DB trigger nets it once);
    // the raw assignment fee is gross, so net it here before crediting.
    const delivererFee =
      assignment.deliverer_fee != null && parseFloat(assignment.deliverer_fee) > 0
        ? parseFloat(assignment.deliverer_fee)
        : netOfPlatformFee(parseFloat(assignment.delivery_fee ?? 0) || 0);
    let paidAmount = 0;
    let heldInEscrow = false;

    try {
      if (delivererFee > 0) {
        const alreadyPaid = await sql`
          SELECT id FROM crestar_wallet_transactions
          WHERE related_order_id = ${assignment.order_id}
            AND transaction_type = 'delivery_fee'
            AND status = 'completed'
          LIMIT 1
        `;

        if (alreadyPaid.length > 0) {
          console.log(
            `ℹ️ Order ${assignment.order_id}: delivery fee already paid — skipping duplicate payout`
          );
        } else {
          const [delivererUser] = await sql`
            SELECT identity_id FROM auth_users WHERE id = ${userId} LIMIT 1
          `;

          if (delivererUser?.identity_id) {
            // If the delivery fee is already held in escrow for this deliverer,
            // do NOT credit it again here — it will move Pending → Available
            // when the buyer confirms delivery (or at the 3-day auto-release).
            const existingHold = await sql`
              SELECT cwt.id
              FROM crestar_wallet_transactions cwt
              JOIN wallet_accounts wa ON wa.id = cwt.wallet_account_id
              WHERE cwt.related_order_id = ${assignment.order_id}
                AND cwt.transaction_type = 'escrow_hold'
                AND wa.identity_id = ${delivererUser.identity_id}
              LIMIT 1
            `;

            if (existingHold.length > 0) {
              heldInEscrow = true;
              console.log(
                `ℹ️ Order ${assignment.order_id}: delivery fee is escrowed — released on buyer confirmation`
              );
            } else {
              // Make sure the deliverer has a wallet
              await sql`
                INSERT INTO wallet_accounts (identity_id, account_type, currency, actual_balance, pending_balance)
                VALUES (${delivererUser.identity_id}, 'personal', 'GHS', 0, 0)
                ON CONFLICT (identity_id) DO NOTHING
              `;

              const [dw] = await sql`
                SELECT id, actual_balance, pending_balance
                FROM wallet_accounts
                WHERE identity_id = ${delivererUser.identity_id}
                LIMIT 1
              `;

              if (dw) {
                const actualBefore = parseFloat(dw.actual_balance) || 0;
                const actualAfter = actualBefore + delivererFee;
                const pendingBalance = parseFloat(dw.pending_balance) || 0;

                await sql`
                  UPDATE wallet_accounts
                  SET actual_balance = ${actualAfter}, updated_at = NOW()
                  WHERE id = ${dw.id}
                `;

                await sql`
                  INSERT INTO crestar_wallet_transactions (
                    wallet_account_id,
                    transaction_type,
                    amount,
                    currency,
                    actual_balance_before,
                    actual_balance_after,
                    pending_balance_before,
                    pending_balance_after,
                    reference,
                    description,
                    related_order_id,
                    related_user_id,
                    status,
                    created_at,
                    completed_at
                  ) VALUES (
                    ${dw.id},
                    'delivery_fee',
                    ${delivererFee},
                    'GHS',
                    ${actualBefore},
                    ${actualAfter},
                    ${pendingBalance},
                    ${pendingBalance},
                    ${`DELFEE-${assignment.order_number}`},
                    ${`Delivery fee - Order #${assignment.order_number} delivered`},
                    ${assignment.order_id},
                    ${userId},
                    'completed',
                    NOW(),
                    NOW()
                  )
                `;

                paidAmount = delivererFee;
                console.log(
                  `✅ Deliverer ${userId} paid GH₵${delivererFee} for order ${assignment.order_number}`
                );
              }
            }
          } else {
            console.error(`❌ Deliverer ${userId} has no identity_id — cannot pay delivery fee`);
          }
        }
      }
    } catch (feeError) {
      // Never fail the delivery confirmation because of a payout problem
      console.error('❌ Deliverer fee payout failed:', feeError);
    }

    // Update deliverer stats
    await sql`
      UPDATE deliverer_profiles
      SET
        total_deliveries = COALESCE(total_deliveries, 0) + 1,
        successful_deliveries = COALESCE(successful_deliveries, 0) + 1,
        updated_at = NOW()
      WHERE user_id = ${userId}
    `;

    // Let the buyer and seller know (best-effort)
    await createNotification({
      userId: assignment.buyer_id,
      type: 'order_delivered',
      title: '📦 Your order was delivered',
      body: `Order #${assignment.order_number} has been marked as delivered. Confirm receipt in the app to release payment to the seller.`,
      data: { order_id: assignment.order_id, order_number: assignment.order_number },
    });

    await createNotification({
      userId: assignment.seller_id,
      type: 'order_delivered',
      title: '🚚 Order delivered',
      body: `Order #${assignment.order_number} was delivered. Funds will be released once the buyer confirms.`,
      data: { order_id: assignment.order_id, order_number: assignment.order_number },
    });

    return Response.json({
      success: true,
      message:
        paidAmount > 0
          ? `Delivery confirmed! GH₵${paidAmount.toFixed(2)} added to your wallet.`
          : heldInEscrow
            ? `Delivery confirmed! GH₵${delivererFee.toFixed(2)} will be released to your wallet once the buyer confirms receipt.`
            : 'Delivery confirmed!',
      assignment: updatedAssignment,
      earnedAmount: paidAmount,
    });
  } catch (error) {
    console.error('Confirm delivery error:', error);
    return Response.json({ error: 'Failed to confirm delivery' }, { status: 500 });
  }
}
