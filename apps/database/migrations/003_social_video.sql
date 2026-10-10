-- 003_social_video.sql
-- Videos, tags, services, identity helper, notifications foundation
BEGIN;

-- ─── Identity accounts (referenced by feed join) ────────────────────────────
CREATE TABLE IF NOT EXISTS identity_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  identity_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, identity_id)
);
CREATE INDEX IF NOT EXISTS idx_identity_accounts_user ON identity_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_accounts_identity ON identity_accounts(identity_id);

-- Ensure auth_users.identity_id is usable (already present in core, but index)
CREATE INDEX IF NOT EXISTS idx_auth_users_identity ON auth_users(identity_id);

-- ─── Services (shoppable services, parallel to products) ────────────────────
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id text,
  title text,
  description text,
  basic_price numeric DEFAULT 0,
  media jsonb DEFAULT '[]',
  status text DEFAULT 'active',
  category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_services_seller ON services(seller_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);

-- ─── Videos ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id text NOT NULL,
  video_url text NOT NULL,
  thumbnail_url text,
  caption text DEFAULT '',
  duration_seconds numeric,
  views_count int DEFAULT 0,
  likes_count int DEFAULT 0,
  comments_count int DEFAULT 0,
  shares_count int DEFAULT 0,
  status text DEFAULT 'active',          -- active | trash | deleted
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_videos_creator ON videos(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_created ON videos(created_at DESC);

-- ─── Video ↔ product/service tags ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_product_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vpt_video ON video_product_tags(video_id);
CREATE INDEX IF NOT EXISTS idx_vpt_product ON video_product_tags(product_id);

-- ─── Video likes ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (video_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_video_likes_user ON video_likes(user_id);

-- ─── Video comments ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  body text NOT NULL,
  parent_id uuid REFERENCES video_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_video_comments_video ON video_comments(video_id);

-- ─── Follows ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id text NOT NULL,
  following_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- ─── Notifications ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type text NOT NULL,
  title text,
  body text,
  data jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

COMMIT;
