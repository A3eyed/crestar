-- Missing tables and columns Crestar needs after the core migration.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS identity_id text;
ALTER TABLE identity_accounts ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS identities (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  base_currency text NOT NULL,
  target_currency text NOT NULL,
  rate numeric NOT NULL,
  last_updated timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (base_currency, target_currency)
);

CREATE TABLE IF NOT EXISTS seller_fulfillment_settings (
  seller_user_id text PRIMARY KEY,
  enable_store_pickup boolean DEFAULT false,
  pickup_instructions text,
  pickup_hours text,
  enable_own_delivery_zones boolean DEFAULT false,
  allow_on_demand_deliverers boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seller_delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_user_id text,
  name text,
  fee numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id text,
  reported_user_id text,
  reason text,
  details text,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id text,
  blocked_id text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS video_saves (
  user_id text,
  video_id text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

CREATE TABLE IF NOT EXISTS payout_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  type text,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
