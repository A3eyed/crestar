# Crestar Payment Refactoring - Deployment Checklist

## Pre-Deployment

### 1. Environment Variables
Ensure these are set in production:

```bash
# Existing (should already be set)
PAYSTACK_SECRET_KEY=sk_live_xxx
DATABASE_URL=postgresql://...
NEXT_PUBLIC_CREATE_APP_URL=https://crestarhq.com
BETTER_AUTH_SECRET=xxx

# New (required for auto-payout)
CRON_SECRET=<generate-strong-random-secret>
```

Generate CRON_SECRET:
```bash
openssl rand -base64 32
```

### 2. Database Verification
Run these queries to verify schema:

```sql
-- Check wallet_accounts has metadata column
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'wallet_accounts' AND column_name = 'metadata';

-- Check orders has all required columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name IN ('status', 'payment_status', 'seller_payout');

-- Check crestar_wallet_transactions exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'crestar_wallet_transactions';
```

### 3. Code Review
- [ ] All `ensureSellerSubaccount` references removed from payment routes
- [ ] No `split` objects in Paystack initialize calls
- [ ] Webhook sets `status = 'paid'` (not just payment_status)
- [ ] All routes import `sql` from `@/app/api/utils/sql`

## Deployment Steps

### 1. Deploy Code Changes
```bash
# From project root
git add .
git commit -m "Refactor payment system to TikTok-inspired escrow model"
git push origin main
```

### 2. Set Environment Variables
In your hosting platform (Vercel, Railway, etc.):
- Add `CRON_SECRET` to environment variables
- Verify `PAYSTACK_SECRET_KEY` is still set

### 3. Setup Cron Job

**Option A: Vercel (Recommended)**

Create `/apps/web/vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/crestar-wallet/process-scheduled-payouts",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Vercel automatically adds the `Authorization: Bearer <CRON_SECRET>` header.

**Option B: External Cron Service**

Setup a POST request to:
```
https://crestarhq.com/api/crestar-wallet/process-scheduled-payouts
```

Headers:
```
Authorization: Bearer <CRON_SECRET>
Content-Type: application/json
```

Schedule: `0 2 * * *` (Daily at 2 AM UTC)

### 4. Verify Deployment
Run these checks immediately after deployment:

#### Check 1: Create Test Order
```bash
# Create order via mobile/web app
# Pay with test Paystack card: 4084084084084081
```

#### Check 2: Verify Order Visibility
```bash
curl https://crestarhq.com/api/test/verify-payment-flow?orderId=<order-uuid>
```

Expected response:
```json
{
  "success": true,
  "order": { "status": "paid", ... },
  "visibility": {
    "appearsInSellerDashboard": true,
    "wouldBeVisible": true
  },
  "notifications": { "count": 1, ... }
}
```

#### Check 3: Test Webhook
Trigger a test payment and check logs for:
```
✅ Order {id} marked as PAID — visible to seller
📧 Seller {id} notified about order {number}
```

#### Check 4: Test Delivery Confirmation
```bash
# As buyer, confirm delivery with PIN
POST /api/orders/confirm-delivery-pin
{
  "orderId": "...",
  "pin": "1234"
}
```

Check seller's wallet:
```bash
# Check seller's available balance increased
GET /api/crestar-wallet/balance
```

#### Check 5: Test Manual Withdrawal
```bash
# As seller, withdraw funds
POST /api/crestar-wallet/withdraw
{
  "amount": 10,
  "withdrawal_method": "momo",
  "account_number": "0244123456",
  "momo_provider": "MTN"
}
```

#### Check 6: Test Cron Job
```bash
# Manually trigger (use actual CRON_SECRET)
curl -X POST https://crestarhq.com/api/crestar-wallet/process-scheduled-payouts \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "processed": 0,
  "failed": 0
}
```

## Post-Deployment Monitoring

### Day 1: Critical Monitoring
Monitor these for the first 24 hours:

1. **Order Creation Rate**
   - Check orders are being created (`status = 'pending_payment'`)
   
2. **Payment Success Rate**
   - Check orders move to `status = 'paid'` after payment
   
3. **Seller Notifications**
   - Verify sellers receive notifications immediately
   
4. **Seller Dashboard Queries**
   - Check `/api/orders/list?role=seller` returns paid orders

### Week 1: Escrow Flow
Monitor these for the first week:

1. **Delivery Confirmations**
   - Check PINs are validated correctly
   - Verify escrow releases (pending → available)
   
2. **Manual Withdrawals**
   - Monitor successful Paystack transfers
   - Check wallet balance accuracy

3. **Auto-Payouts**
   - Verify cron job runs daily
   - Check processed payout count

### Ongoing: Key Metrics

Track these metrics weekly:

```sql
-- Orders created vs paid
SELECT 
  COUNT(*) FILTER (WHERE status = 'pending_payment') as pending,
  COUNT(*) FILTER (WHERE status = 'paid') as paid,
  COUNT(*) FILTER (WHERE status = 'completed') as completed
FROM orders
WHERE created_at > NOW() - INTERVAL '7 days';

-- Average time to delivery confirmation
SELECT AVG(completed_at - created_at) as avg_completion_time
FROM orders
WHERE completed_at IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days';

-- Wallet balance health
SELECT 
  COUNT(*) as wallet_count,
  SUM(actual_balance) as total_available,
  SUM(pending_balance) as total_pending
FROM wallet_accounts;

-- Auto-payout adoption
SELECT 
  COUNT(*) FILTER (WHERE metadata->'payout_schedule'->>'enabled' = 'true') as enabled,
  COUNT(*) as total
FROM wallet_accounts;
```

## Rollback Plan (Emergency Only)

If critical issues arise, you can rollback payments to old split model:

### Emergency Rollback Steps

1. **Revert Code:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Database:**
   - No database changes were made
   - Existing data compatible with both models
   
3. **In-Flight Orders:**
   - Already-paid orders under new model remain valid
   - Escrow/ledger still tracks correctly
   - Manual intervention may be needed for affected sellers

**Note:** Rollback should only be used if the entire payment system is non-functional. For specific bugs, fix forward instead.

## Support Contacts

- **Paystack Support:** https://paystack.com/support
- **Technical Issues:** Check `/api/test/verify-payment-flow` output
- **Logs:** Monitor server logs for webhook/payment errors

## Success Criteria

Deployment is successful when:

- [ ] Orders appear immediately in seller dashboard after payment
- [ ] Sellers receive in-app + email notification
- [ ] Delivery PIN confirmation releases escrow
- [ ] Manual withdrawals complete successfully via Paystack Transfer API
- [ ] Auto-payout cron job processes scheduled payouts
- [ ] No errors in webhook/payment logs
- [ ] Buyer → Seller → Delivery → Payout flow works end-to-end

## Documentation

- Payment flow: `/apps/PAYMENT_REFACTORING.md`
- Cron setup: `/apps/web/public/cron-setup-instructions.md`
- Test endpoint: `/api/test/verify-payment-flow`
