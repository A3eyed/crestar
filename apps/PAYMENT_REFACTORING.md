# Crestar Payment Architecture Refactoring

## Executive Summary

Successfully refactored Crestar's payment system from a potentially non-compliant direct subaccount routing model to a **TikTok-inspired escrow model** that is fully compliant with Paystack policies and marketplace best practices.

## Critical Bug Fixed

### Issue: Sellers Not Seeing Paid Orders

**Root Cause:**
- Orders were being created with `status = 'pending_payment'`
- Seller dashboard query filters: `WHERE seller_id = $1 AND status != 'pending_payment'`
- Even after successful payment, if the order status wasn't properly updated to `'paid'`, it remained invisible to sellers

**Fix:**
- Enhanced webhook handler to explicitly set `status = 'paid'` (not just `payment_status`)
- Added comprehensive logging to track order visibility
- Ensured `notifyNewOrderOnce` is called immediately after marking order as paid
- Added test endpoint `/api/test/verify-payment-flow` to validate order visibility

## Payment Model Changes

### Before (Risky Model)
```
Buyer pays → Paystack charges → Direct split to seller subaccount
                               → Seller receives money immediately
                               → Platform tracks in ledger as "pending"
                               → Delivery confirmation releases from ledger
                               
Problem: Money already in seller's Paystack subaccount before delivery!
```

### After (TikTok-Compliant Model)
```
Buyer pays → Paystack charges → ALL funds to Crestar main balance
                               → Order marked as PAID (visible to seller)
                               → Seller pending balance increased (internal ledger)
                               → Delivery PIN confirmation by buyer
                               → Pending → Available balance (internal ledger)
                               → Seller manually withdraws OR auto-payout triggers
                               → Paystack Transfer API → Seller receives funds
```

## Code Changes

### 1. Payment Initialization Routes
**Files Modified:**
- `/apps/web/src/app/api/payments/initialize/route.ts`
- `/apps/web/src/app/api/orders/create/route.ts`
- `/apps/web/src/app/api/orders/create-v2/route.ts`
- `/apps/web/src/app/api/orders/checkout/route.ts`

**Changes:**
- ❌ Removed all `ensureSellerSubaccount()` calls
- ❌ Removed Paystack `split` object from payment payloads
- ✅ All payments now collect to main Crestar balance
- ✅ Updated metadata to track `direct_split: false`

### 2. Payment Webhook Handler
**File:** `/apps/web/src/app/api/webhooks/paystack/route.ts`

**Critical Changes:**
```typescript
// OLD: Only set payment_status
await sql`UPDATE orders SET payment_status = 'paid' WHERE id = ${orderId}`;

// NEW: Set BOTH status AND payment_status
await sql`UPDATE orders 
          SET status = 'paid', payment_status = 'paid', 
              payment_method = COALESCE(payment_method, $2)
          WHERE id = $1`;
```

**Why This Matters:**
- Seller dashboard filters: `status != 'pending_payment'`
- Setting `status = 'paid'` makes orders immediately visible
- `notifyNewOrderOnce` creates in-app + email notification
- Seller sees order in dashboard instantly after payment

### 3. Escrow Release Flow
**File:** `/apps/web/src/app/api/orders/confirm-delivery-pin/route.ts`

**Flow:**
1. Buyer enters delivery PIN
2. System validates PIN against order
3. Order status updated to `'completed'`
4. **Pending → Available balance transfer:**
   ```typescript
   newActualBalance = currentActualBalance + sellerPayout
   newPendingBalance = currentPendingBalance - sellerPayout
   ```
5. Transaction recorded: `transaction_type = 'escrow_release'`

### 4. Withdrawal System
**File:** `/apps/web/src/app/api/crestar-wallet/withdraw/route.ts`

**Features:**
- Creates Paystack Transfer Recipients
- Validates available balance
- Atomic balance deduction (prevents double-spend)
- Supports both MoMo and bank transfers
- Records withdrawal transaction

### 5. Auto-Payout Scheduling (NEW)
**Files Created:**
- `/apps/web/src/app/api/crestar-wallet/payout-schedule/route.ts`
- `/apps/web/src/app/api/crestar-wallet/process-scheduled-payouts/route.ts`

**Features:**
- Sellers can enable auto-payout (daily/weekly/biweekly/monthly)
- Set minimum threshold (e.g., only payout if balance > GH₵50)
- Cron job processes all due payouts automatically
- Uses Paystack Transfer API
- Idempotent and fault-tolerant

## Database Schema

### Orders Table
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending_payment',  -- Critical for visibility!
  payment_status TEXT DEFAULT 'unpaid',
  payment_reference TEXT,
  total_amount NUMERIC(14,2),
  seller_payout NUMERIC(14,2),
  delivery_pin TEXT,
  metadata JSONB,
  -- ... other fields
);
```

**Status Flow:**
1. `pending_payment` - Order created, awaiting payment
2. `paid` - Payment successful (visible to seller)
3. `processing` - Seller preparing order
4. `shipped` - Order shipped/in transit
5. `delivered` - Deliverer marked as delivered
6. `completed` - Buyer confirmed with PIN (funds released)

### Wallet Accounts
```sql
CREATE TABLE wallet_accounts (
  id UUID PRIMARY KEY,
  identity_id UUID NOT NULL UNIQUE,
  actual_balance NUMERIC(14,2) DEFAULT 0,    -- Withdrawable balance
  pending_balance NUMERIC(14,2) DEFAULT 0,   -- Escrowed (awaiting delivery)
  metadata JSONB,  -- Stores payout_schedule settings
  -- ... other fields
);
```

### Crestar Wallet Transactions
```sql
CREATE TABLE crestar_wallet_transactions (
  id UUID PRIMARY KEY,
  wallet_account_id UUID NOT NULL,
  transaction_type TEXT NOT NULL,  -- 'purchase', 'escrow_hold', 'escrow_release', 'withdrawal', etc.
  amount NUMERIC(14,2) NOT NULL,
  actual_balance_before NUMERIC(14,2),
  actual_balance_after NUMERIC(14,2),
  pending_balance_before NUMERIC(14,2),
  pending_balance_after NUMERIC(14,2),
  reference TEXT,
  description TEXT,
  related_order_id UUID,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

## Paystack API Usage

### Collecting Payments
```
POST https://api.paystack.co/transaction/initialize
- email, amount, reference
- NO split object (all funds to main balance)
```

### Paying Out to Sellers
```
POST https://api.paystack.co/transferrecipient
- Create transfer recipient (bank/MoMo details)

POST https://api.paystack.co/transfer
- source: "balance"
- recipient: recipient_code
- amount: (in pesewas)
- Transfers from main balance to seller
```

## Compliance & Best Practices

✅ **Compliant with Paystack Policies:**
- Funds held until service delivery confirmed
- No automatic pre-delivery settlements
- Transparent hold periods
- Audit trail for all transactions

✅ **Marketplace Best Practices:**
- Buyer protection (delivery confirmation required)
- Seller protection (funds escrowed, not lost)
- Platform protection (fees deducted before payout)
- Commission tracking (creator/affiliate cuts supported)

✅ **Security:**
- Webhook signature verification (HMAC SHA512)
- Idempotent transaction processing
- Atomic balance updates (no race conditions)
- Cron endpoint protected by secret token

## Testing & Verification

### Test Order Visibility
```bash
GET /api/test/verify-payment-flow?orderId=<order-uuid>
```

Returns:
- Order details
- Visibility in seller dashboard
- Notification status
- Wallet entry status

### Test Auto-Payout
```bash
POST /api/crestar-wallet/process-scheduled-payouts
Authorization: Bearer <CRON_SECRET>
```

### Manual Test Flow
1. Create order via `/api/orders/create`
2. Pay via Paystack (triggers webhook)
3. Check order appears in seller dashboard (`/api/orders/list?role=seller`)
4. Seller sees notification
5. Confirm delivery via `/api/orders/confirm-delivery-pin`
6. Check seller's available balance increased
7. Withdraw via `/api/crestar-wallet/withdraw`

## Migration Notes

### Existing Orders
- Orders with `metadata.direct_split = true` were paid under old model
- Money already in seller subaccounts
- Ledger still tracks as "pending" for consistency
- PIN confirmation still releases in ledger (double-entry accounting intact)

### Seller Subaccounts
- Existing subaccounts remain in Paystack
- No longer used for automatic splits
- Still used as Transfer Recipients for payouts
- `professional_profiles.paystack_subaccount_code` preserved

## Future Enhancements

1. **Dispute Resolution:** Add dispute flow for problematic deliveries
2. **Partial Refunds:** Support partial refunds before delivery
3. **Auto-Release:** Release escrow after N days if no PIN entered
4. **Payout Analytics:** Dashboard showing payout history/patterns
5. **Multi-Currency:** Support for USD, EUR payouts via Paystack

## Support & Monitoring

### Key Logs to Monitor
```
✅ Order {id} marked as PAID — visible to seller
📧 Seller {id} notified about order {number}
💳 Creating order {id} — GH₵{amount} to main balance
✅ Auto-payout processed: wallet {id}, GH₵{amount}
```

### Common Issues

**Issue:** Seller says order not appearing
**Check:** `status = 'paid'` (not just `payment_status = 'paid'`)
**Fix:** Webhook/verify route should set both fields

**Issue:** Auto-payout not working
**Check:** Cron job running? `CRON_SECRET` set? Payout method configured?

**Issue:** Balance not released after delivery
**Check:** Delivery PIN correct? Escrow release transaction created?

## Summary

This refactoring:
1. ✅ Fixed critical order visibility bug
2. ✅ Moved to fully compliant escrow model
3. ✅ Added auto-payout scheduling
4. ✅ Maintained backward compatibility
5. ✅ Improved audit trail and monitoring

All sellers now see their orders immediately after payment, funds are properly escrowed until delivery, and payouts happen via Transfer API (manual or scheduled).
