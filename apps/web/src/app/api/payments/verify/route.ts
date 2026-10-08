// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { sendOrderConfirmation } from '@/app/api/utils/notification-service';
import { notifyNewOrderOnce } from '@/app/api/utils/notify';
import { settleOrderPaid } from '@/app/api/utils/orderSettlement';

// Verify Paystack payment and update order
export async function POST(request) {
  try {
    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return Response.json({ error: 'Payment reference is required' }, { status: 400 });
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      console.error('❌ PAYSTACK_SECRET_KEY is not configured');
      return Response.json(
        { error: 'Payment service is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Verify payment with Paystack
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    if (!verifyResponse.ok) {
      throw new Error('Failed to verify payment');
    }

    const verifyData = await verifyResponse.json();

    if (verifyData.data.status !== 'success') {
      return Response.json({ error: 'Payment was not successful' }, { status: 400 });
    }

    // Get all orders with this payment reference (multi-seller checkout creates multiple)
    const orders = await sql(`SELECT * FROM orders WHERE payment_reference = $1`, [reference]);

    if (!orders || orders.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update all orders to paid
    const updatedOrders = [];
    for (const order of orders) {
      // ONE guarded settlement path. It flips pending_payment → paid with an
      // atomic compare-and-set, decrements stock, records the escrow holds and
      // alerts the seller — each step individually idempotent. Safe to call
      // repeatedly, and safe to race against the Paystack webhook.
      const settlement = await settleOrderPaid(order.id, {
        channel: verifyData.data.channel || 'paystack',
        reference,
      });

      const updated = settlement.order || order;
      updatedOrders.push(updated);

      // `order` is the pre-settlement snapshot, so this still tells us whether
      // THIS request is the one that newly paid the order.
      if (order.status !== 'pending_payment') {
        await notifyNewOrderOnce(updated);
        continue;
      }

      // ─── Buyer Ledger — record a debit (-) for the purchase ───────
      // Mirrors the webhook. Balances stay unchanged (paid via Paystack);
      // this makes the purchase show as a debit in the buyer's history.
      try {
        const purchaseAmount = parseFloat(order.total_amount) || 0;
        if (purchaseAmount > 0) {
          const buyerDebitExists = await sql(
            `SELECT id FROM crestar_wallet_transactions
             WHERE related_order_id = $1 AND transaction_type = 'purchase' AND status = 'completed'
             LIMIT 1`,
            [order.id]
          );

          if (buyerDebitExists.length === 0) {
            const buyerUser = await sql(
              `SELECT identity_id FROM auth_users WHERE id = $1 LIMIT 1`,
              [order.buyer_id]
            );

            if (buyerUser.length > 0 && buyerUser[0].identity_id) {
              await sql(
                `INSERT INTO wallet_accounts (identity_id, account_type, currency, actual_balance, pending_balance)
                 VALUES ($1, 'personal', 'GHS', 0, 0)
                 ON CONFLICT (identity_id) DO NOTHING`,
                [buyerUser[0].identity_id]
              );

              const buyerWallet = await sql(
                `SELECT id, actual_balance, pending_balance FROM wallet_accounts WHERE identity_id = $1 LIMIT 1`,
                [buyerUser[0].identity_id]
              );

              if (buyerWallet.length > 0) {
                const bw = buyerWallet[0];
                await sql(
                  `INSERT INTO crestar_wallet_transactions (
                    wallet_account_id, transaction_type, amount, currency,
                    actual_balance_before, actual_balance_after,
                    pending_balance_before, pending_balance_after,
                    reference, external_reference, description, metadata,
                    related_order_id, related_user_id, status, created_at, completed_at
                  ) VALUES ($1, 'purchase', $2, 'GHS', $3, $3, $4, $4,
                    $5, $6, $7, $8, $9, $10, 'completed', now(), now())`,
                  [
                    bw.id,
                    purchaseAmount,
                    bw.actual_balance,
                    bw.pending_balance,
                    `PURCHASE-${String(order.id).substring(0, 8)}`,
                    reference,
                    `Order payment - Paid via Paystack`,
                    JSON.stringify({ order_id: order.id, order_reference: reference }),
                    order.id,
                    order.seller_id,
                  ]
                );
              }
            }

            // Legacy ledger (backward compatibility)
            await sql(
              `INSERT INTO wallet_transactions (user_id, recipient_user_id, transaction_type, amount, reference, status)
               VALUES ($1, $2, 'purchase', $3, $4, 'completed')`,
              [order.buyer_id, order.seller_id, purchaseAmount, reference]
            );
          }
        }
      } catch (buyerLedgerErr) {
        console.error('Buyer ledger entry error:', buyerLedgerErr);
        // Non-critical
      }

      // Send order confirmation email to buyer
      try {
        await sendOrderConfirmation(order.id);
        console.log(`[payment-verify] Order confirmation email sent for order ${order.id}`);
      } catch (emailError) {
        // Don't fail payment if email fails — just log it
        console.error('[payment-verify] Order confirmation email failed:', emailError);
      }

      // ─── Seller Payout — HELD IN ESCROW (Dim Balance) ─────────────
      // The wallet is the in-app ledger view of the seller's Paystack
      // subaccount allocation. EVERY paid order records a pending (dim)
      // hold here — including direct-split orders — so the seller sees the
      // money as "pending until delivery". It becomes withdrawable only
      // after the buyer confirms delivery with their PIN.
      // The 'escrow_hold' idempotency guard prevents double-counting when
      // both this route and the webhook run.
      try {
        const sellerPayout = parseFloat(order.seller_payout) || 0;
        if (sellerPayout > 0) {
          const escrowExists = await sql(
            `SELECT id FROM crestar_wallet_transactions
             WHERE related_order_id = $1 AND transaction_type = 'escrow_hold' AND status = 'completed'
             LIMIT 1`,
            [order.id]
          );

          if (escrowExists.length === 0) {
            const sellerUser = await sql(
              `SELECT identity_id FROM auth_users WHERE id = $1 LIMIT 1`,
              [order.seller_id]
            );

            if (sellerUser.length > 0 && sellerUser[0].identity_id) {
              const sellerIdentityId = sellerUser[0].identity_id;

              // Ensure seller wallet exists
              await sql(
                `INSERT INTO wallet_accounts (identity_id, account_type, currency, actual_balance, pending_balance)
                 VALUES ($1, 'personal', 'GHS', 0, 0)
                 ON CONFLICT (identity_id) DO NOTHING`,
                [sellerIdentityId]
              );

              const sellerWallet = await sql(
                `SELECT id, actual_balance, pending_balance FROM wallet_accounts WHERE identity_id = $1 LIMIT 1`,
                [sellerIdentityId]
              );

              if (sellerWallet.length > 0) {
                const sw = sellerWallet[0];
                const newPendingBalance = parseFloat(sw.pending_balance) + sellerPayout;

                await sql(
                  `UPDATE wallet_accounts SET pending_balance = $1, updated_at = now() WHERE id = $2`,
                  [newPendingBalance, sw.id]
                );

                await sql(
                  `INSERT INTO crestar_wallet_transactions (
                    wallet_account_id, transaction_type, amount, currency,
                    actual_balance_before, actual_balance_after,
                    pending_balance_before, pending_balance_after,
                    reference, external_reference, description, metadata,
                    related_order_id, status, created_at, completed_at
                  ) VALUES ($1, 'escrow_hold', $2, 'GHS', $3, $3, $4, $5,
                    $6, $7, $8, $9, $10, 'completed', now(), now())`,
                  [
                    sw.id,
                    sellerPayout,
                    sw.actual_balance,
                    sw.pending_balance,
                    newPendingBalance,
                    `ESCROW-${String(order.id).substring(0, 8)}`,
                    reference,
                    `Order payment received - Funds in escrow until delivery`,
                    JSON.stringify({ order_id: order.id, order_reference: reference }),
                    order.id,
                  ]
                );

                console.log(
                  `✅ Seller ${order.seller_id} — GH₵${sellerPayout} placed in escrow (pending)`
                );
              }
            }
          }
        }
      } catch (escrowErr) {
        console.error('Seller escrow hold error:', escrowErr);
        // Non-critical — the Paystack webhook will also attempt the hold
      }

      // ─── Creator Commission — HELD IN ESCROW (Dim Balance) ────────
      // The commission goes to the creator's pending_balance and is only
      // released to their actual balance when the buyer confirms delivery.
      if (order.origin_creator_id && parseFloat(order.creator_commission || 0) > 0) {
        try {
          const commission = parseFloat(order.creator_commission);
          const creatorId = order.origin_creator_id.toString();

          // Idempotency: skip if commission already held or released for this order
          const [alreadyPaid] = await sql(
            `SELECT id FROM crestar_wallet_transactions 
             WHERE related_order_id = $1 AND transaction_type IN ('creator_commission', 'creator_commission_hold') AND status = 'completed'
             LIMIT 1`,
            [order.id]
          );
          if (alreadyPaid) {
            console.log(`Commission already recorded for order ${order.id}, skipping`);
            continue;
          }

          // Get creator's identity and wallet
          const creatorUser = await sql(`SELECT identity_id FROM auth_users WHERE id = $1`, [
            creatorId,
          ]);

          if (creatorUser.length > 0 && creatorUser[0].identity_id) {
            // Ensure creator wallet exists
            await sql(
              `INSERT INTO wallet_accounts (identity_id, account_type, currency, actual_balance, pending_balance)
               VALUES ($1, 'personal', 'GHS', 0, 0)
               ON CONFLICT (identity_id) DO NOTHING`,
              [creatorUser[0].identity_id]
            );

            const wallet = await sql(
              `SELECT id, actual_balance, pending_balance FROM wallet_accounts WHERE identity_id = $1`,
              [creatorUser[0].identity_id]
            );

            if (wallet.length > 0) {
              const w = wallet[0];
              const pendingBefore = parseFloat(w.pending_balance);
              const pendingAfter = pendingBefore + commission;

              // Hold commission in the creator's PENDING (dim) balance
              await sql(
                `UPDATE wallet_accounts SET pending_balance = $1, updated_at = NOW() WHERE id = $2`,
                [pendingAfter, w.id]
              );

              // Log the escrow hold transaction
              await sql(
                `INSERT INTO crestar_wallet_transactions (
                  wallet_account_id, transaction_type, amount, currency,
                  actual_balance_before, actual_balance_after,
                  pending_balance_before, pending_balance_after,
                  description, related_order_id, related_user_id, status, completed_at
                ) VALUES ($1, 'creator_commission_hold', $2, 'GHS', $3, $3, $4, $5, $6, $7, $8, 'completed', NOW())`,
                [
                  w.id,
                  commission,
                  parseFloat(w.actual_balance),
                  pendingBefore,
                  pendingAfter,
                  `Affiliate commission (pending delivery) from order #${order.order_number}`,
                  order.id,
                  order.buyer_id,
                ]
              );

              // In-app notification: message from system to creator
              try {
                const notifText =
                  `🎉 You just earned a commission!\n\n` +
                  `Someone bought "${order.item_title}" through your shoppable video.\n\n` +
                  `💸 Commission: GHS ${commission.toFixed(2)}\n` +
                  `📦 Order: #${order.order_number}\n\n` +
                  `It's in your pending balance and will be released once the buyer confirms delivery. Keep creating! 🚀`;

                const systemAccount = await sql(
                  `SELECT id FROM auth_users WHERE username = 'crestar' AND is_system_account = true LIMIT 1`
                );

                const senderId = systemAccount.length > 0 ? systemAccount[0].id.toString() : '1';

                await sql(
                  `INSERT INTO messages (conversation_id, sender_user_id, receiver_user_id, message_text, is_read)
                   VALUES ($1, $2, $3, $4, false)`,
                  [`system-${creatorId}`, senderId, creatorId, notifText]
                );
              } catch (notifErr) {
                console.error('Failed to send creator notification:', notifErr);
              }
            }
          }
        } catch (commissionErr) {
          console.error('Creator commission hold error:', commissionErr);
          // Non-critical — don't fail the payment verify
        }
      }
    }

    return Response.json({
      success: true,
      order: updatedOrders[0],
      orders: updatedOrders,
      transaction: verifyData.data,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return Response.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}
