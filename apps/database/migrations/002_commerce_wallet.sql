-- 002_commerce_wallet.sql
-- Crestar commerce, escrow wallet, and order extensions
-- Idempotent. Safe to re-run.

BEGIN;

-- ─── Orders: missing columns required by settlement / payouts ───────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency text DEFAULT 'GHS';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deliverer_fee numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deliverer_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS inventory_applied boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ledger_applied boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS escrow_released_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'not_applicable';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_ref ON orders(payment_reference);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at);

-- ─── Order line items (multi-item carts) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  title text,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ─── Wallet accounts ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id text NOT NULL UNIQUE,
  account_type text NOT NULL DEFAULT 'personal',
  actual_balance numeric NOT NULL DEFAULT 0,
  pending_balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GHS',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_accounts_identity ON wallet_accounts(identity_id);

-- ─── Wallet ledger ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crestar_wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_account_id uuid NOT NULL REFERENCES wallet_accounts(id) ON DELETE CASCADE,
  transaction_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GHS',
  actual_balance_before numeric,
  actual_balance_after numeric,
  pending_balance_before numeric,
  pending_balance_after numeric,
  reference text,
  description text,
  status text NOT NULL DEFAULT 'pending',
  related_user_id text,
  related_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cwt_wallet ON crestar_wallet_transactions(wallet_account_id);
CREATE INDEX IF NOT EXISTS idx_cwt_order ON crestar_wallet_transactions(related_order_id);
CREATE INDEX IF NOT EXISTS idx_cwt_type ON crestar_wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_cwt_ref ON crestar_wallet_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_cwt_created ON crestar_wallet_transactions(created_at DESC);

-- ─── Saved payout methods ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_payout_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_account_id uuid NOT NULL REFERENCES wallet_accounts(id) ON DELETE CASCADE,
  method_type text NOT NULL,          -- mobile_money | bank_transfer
  method_code text,
  method_name text,
  details jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wpm_wallet ON wallet_payout_methods(wallet_account_id);

-- ─── Per-leg payout tracking ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_payout_legs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  leg text NOT NULL,                   -- seller | creator | deliverer
  recipient_user_id text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'GHS',
  reference text,
  status text NOT NULL DEFAULT 'pending', -- pending | processing | paid | failed | retained
  attempts int DEFAULT 0,
  last_error text,
  paystack_transfer_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (order_id, leg)
);
CREATE INDEX IF NOT EXISTS idx_opl_order ON order_payout_legs(order_id);
CREATE INDEX IF NOT EXISTS idx_opl_status ON order_payout_legs(status);

-- ─── Admin audit log (fixed types to match auth_users.id = text) ────────────
CREATE TABLE IF NOT EXISTS admin_logs (
  id bigserial PRIMARY KEY,
  admin_id text REFERENCES auth_users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  target_user_id text REFERENCES auth_users(id) ON DELETE SET NULL,
  target_entity_type text,
  target_entity_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON admin_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);

COMMIT;
