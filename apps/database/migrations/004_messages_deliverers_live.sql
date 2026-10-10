-- 004_messages_deliverers_live.sql
-- Messaging, deliverers, live shopping sessions
BEGIN;

ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS seller_type text DEFAULT 'individual';
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending';
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE business_centers ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending';
ALTER TABLE business_centers ADD COLUMN IF NOT EXISTS owner_user_id text;
ALTER TABLE business_centers ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE business_centers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL,
  sender_user_id text NOT NULL,
  receiver_user_id text NOT NULL,
  message_text text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON messages(receiver_user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_user_id);

CREATE TABLE IF NOT EXISTS deliverer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  full_name text,
  phone_number text,
  vehicle_type text,
  ghana_card_photo text,
  vehicle_photo text,
  verification_status text DEFAULT 'pending',
  is_available boolean DEFAULT false,
  operating_regions jsonb DEFAULT '[]',
  intercity_routes jsonb DEFAULT '[]',
  current_latitude numeric,
  current_longitude numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deliverer_user ON deliverer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_deliverer_available ON deliverer_profiles(is_available) WHERE is_available = true;

CREATE TABLE IF NOT EXISTS delivery_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  deliverer_id text NOT NULL,
  status text DEFAULT 'assigned',
  assigned_at timestamptz DEFAULT now(),
  picked_up_at timestamptz,
  delivered_at timestamptz,
  notes text,
  UNIQUE (order_id)
);
CREATE INDEX IF NOT EXISTS idx_da_deliverer ON delivery_assignments(deliverer_id);
CREATE INDEX IF NOT EXISTS idx_da_status ON delivery_assignments(status);

CREATE TABLE IF NOT EXISTS live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id text NOT NULL,
  title text NOT NULL DEFAULT 'Live Shopping',
  description text,
  thumbnail text,
  status text NOT NULL DEFAULT 'live',
  stream_key text,
  stream_url text,
  viewer_count int DEFAULT 0,
  peak_viewer_count int DEFAULT 0,
  total_orders int DEFAULT 0,
  total_gmv numeric DEFAULT 0,
  pinned_product_id uuid,
  pinned_service_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  scheduled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_live_host ON live_sessions(host_user_id);
CREATE INDEX IF NOT EXISTS idx_live_status ON live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_started ON live_sessions(started_at DESC);

CREATE TABLE IF NOT EXISTS live_session_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  is_featured boolean DEFAULT false,
  flash_price numeric,
  flash_stock int,
  sold_count int DEFAULT 0,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lsp_session ON live_session_products(session_id);
CREATE INDEX IF NOT EXISTS idx_lsp_featured ON live_session_products(session_id, is_featured) WHERE is_featured = true;

CREATE TABLE IF NOT EXISTS live_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  message_text text NOT NULL,
  message_type text DEFAULT 'chat',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lcm_session ON live_chat_messages(session_id, created_at);

CREATE TABLE IF NOT EXISTS live_session_viewers (
  session_id uuid NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  joined_at timestamptz DEFAULT now(),
  last_heartbeat timestamptz DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_lsv_heartbeat ON live_session_viewers(last_heartbeat);

COMMIT;
