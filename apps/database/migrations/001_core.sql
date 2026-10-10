CREATE TABLE IF NOT EXISTS "user" (
  id text PRIMARY KEY,
  name text,
  email text UNIQUE NOT NULL,
  "emailVerified" boolean NOT NULL DEFAULT false,
  image text,
  username text,
  display_name text,
  profile_image text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS session (
  id text PRIMARY KEY,
  "expiresAt" timestamptz NOT NULL,
  token text UNIQUE NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS account (
  id text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS auth_users (
  id text PRIMARY KEY,
  email text,
  name text,
  username text,
  display_name text,
  profile_image text,
  bio text,
  phone text,
  role text DEFAULT 'user',
  is_admin boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  is_system_account boolean DEFAULT false,
  identity_id text,
  business_name text,
  username_last_changed timestamptz,
  username_change_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS professional_profiles (
  user_id text PRIMARY KEY,
  business_name text,
  city text,
  region text
);
CREATE TABLE IF NOT EXISTS business_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id text,
  business_name text,
  center_type text
);
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id text,
  product_type text,
  title text,
  description text,
  media jsonb DEFAULT '[]',
  price numeric DEFAULT 0,
  stock_quantity numeric,
  weight_kg numeric,
  is_wholesale boolean DEFAULT false,
  wholesale_min_quantity int,
  prep_time_minutes int,
  spicy_level int,
  is_todays_special boolean DEFAULT false,
  category text,
  features jsonb DEFAULT '[]',
  min_order_quantity int DEFAULT 1,
  food_hub_type text,
  food_subcategory text,
  food_attributes jsonb DEFAULT '{}',
  drink_attributes jsonb DEFAULT '{}',
  sizing_category text,
  size_system text,
  size_type text,
  dimensional_specs jsonb,
  creator_promotion_enabled boolean DEFAULT false,
  affiliate_commission_rate numeric DEFAULT 5,
  status text DEFAULT 'active',
  seller_currency text DEFAULT 'GHS',
  sold_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  variant_type text,
  variant_value text,
  variant_image text,
  variant_images jsonb DEFAULT '[]',
  price_adjustment numeric DEFAULT 0,
  stock_quantity numeric DEFAULT 0,
  sizes jsonb DEFAULT '[]',
  regional_standard text,
  body_type text
);
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text,
  buyer_id text,
  seller_id text,
  item_type text,
  item_id uuid,
  item_title text,
  quantity int DEFAULT 1,
  unit_price numeric DEFAULT 0,
  subtotal numeric DEFAULT 0,
  platform_fee numeric DEFAULT 0,
  delivery_fee numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  seller_payout numeric DEFAULT 0,
  delivery_address jsonb,
  delivery_pin text,
  delivery_latitude numeric,
  delivery_longitude numeric,
  status text DEFAULT 'pending_payment',
  creator_commission numeric DEFAULT 0,
  origin_video_id text,
  origin_creator_id text,
  attribution_expires_at timestamptz,
  payment_reference text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
INSERT INTO auth_users (id, email, name, username, display_name, role, is_admin, is_system_account)
VALUES ('crestar-system', 'support@crestarhq.com', 'Crestar', 'crestar', 'Crestar', 'admin', true, true)
ON CONFLICT (id) DO NOTHING;
