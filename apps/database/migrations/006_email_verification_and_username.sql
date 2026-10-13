-- Optional 6-digit email verification (Crestar app flow; does not block app use)
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS email_verification_code text,
  ADD COLUMN IF NOT EXISTS email_verification_expires timestamptz,
  ADD COLUMN IF NOT EXISTS email_verification_attempts int DEFAULT 0;

-- Username uniqueness (case-insensitive) on Crestar profile table
CREATE UNIQUE INDEX IF NOT EXISTS auth_users_username_lower_uidx
  ON auth_users (lower(username))
  WHERE username IS NOT NULL AND username <> '';

CREATE INDEX IF NOT EXISTS auth_users_username_idx ON auth_users (username);
