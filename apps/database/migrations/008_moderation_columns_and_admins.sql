-- 008_moderation_columns_and_admins.sql
-- Adds moderation fields to auth_users, promotes @Abdallah and @Support,
-- and ensures verified badge is never auto-granted by email verification.

BEGIN;

-- 1. Moderation columns on auth_users (idempotent)
ALTER TABLE auth_users
  ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS account_warning integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monetization_revoked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text;

-- Helpful index for suspended / warned lists
CREATE INDEX IF NOT EXISTS idx_auth_users_account_status
  ON auth_users (account_status)
  WHERE account_status IS DISTINCT FROM 'active';

CREATE INDEX IF NOT EXISTS idx_auth_users_account_warning
  ON auth_users (account_warning)
  WHERE account_warning > 0;

-- 2. Promote @Abdallah and @Support to full admin (role + is_admin)
UPDATE auth_users
SET
  role = 'admin',
  is_admin = true,
  updated_at = NOW()
WHERE lower(username) IN ('abdallah', 'support');

-- 3. Revoke any accidental verified badges that came from email verification
UPDATE auth_users
SET is_verified = false, updated_at = NOW()
WHERE lower(username) = 'lofakrecords'
  AND is_verified = true;

-- 4. Ensure notifications table can hold broadcasts (user_id nullable)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL;
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

COMMIT;
