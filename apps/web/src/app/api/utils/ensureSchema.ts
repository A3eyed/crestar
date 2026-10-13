// @ts-nocheck
/**
 * Idempotent core schema bootstrap for Crestar on Neon.
 * Tables match the Anything AI production export (public schema).
 * Safe to run on every request path that needs them — uses IF NOT EXISTS.
 */
import sql from '@/app/api/utils/sql';

let _done = false;
let _promise = null;

export async function ensureCoreSchema() {
  if (_done) return { ok: true, cached: true };
  if (_promise) return _promise;

  _promise = (async () => {
    const steps = [];

    const run = async (label, queryFn) => {
      try {
        await queryFn();
        steps.push({ label, ok: true });
      } catch (e) {
        steps.push({ label, ok: false, error: String(e?.message || e) });
        console.error(`[ensureCoreSchema] ${label}:`, e?.message || e);
      }
    };

    await run('identities', () => sql`
      CREATE TABLE IF NOT EXISTS public.identities (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        created_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await run('auth_users', () => sql`
      CREATE TABLE IF NOT EXISTS public.auth_users (
        id text NOT NULL PRIMARY KEY,
        identity_id uuid,
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
        followers_count integer DEFAULT 0,
        following_count integer DEFAULT 0,
        username_last_changed timestamp without time zone,
        username_change_count integer DEFAULT 0,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now(),
        business_name text,
        email_verified boolean DEFAULT false
      )
    `);

    await run('identity_accounts', () => sql`
      CREATE TABLE IF NOT EXISTS public.identity_accounts (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE CASCADE,
        user_id text NOT NULL,
        is_primary boolean DEFAULT false,
        created_at timestamp without time zone DEFAULT now(),
        UNIQUE (identity_id, user_id)
      )
    `);

    await run('business_centers', () => sql`
      CREATE TABLE IF NOT EXISTS public.business_centers (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        identity_id uuid REFERENCES public.identities(id) ON DELETE CASCADE,
        business_name text,
        center_type text,
        status text DEFAULT 'active',
        verification_status text DEFAULT 'pending',
        full_name text,
        phone_number text,
        momo_number text,
        delivery_method text,
        delivery_regions jsonb DEFAULT '[]'::jsonb,
        delivery_cities jsonb DEFAULT '[]'::jsonb,
        country text,
        region text,
        city text,
        village text,
        vehicle_type text,
        vehicle_photo text,
        is_available boolean DEFAULT true,
        operating_regions jsonb DEFAULT '[]'::jsonb,
        intercity_routes jsonb DEFAULT '[]'::jsonb,
        portfolio_media jsonb DEFAULT '[]'::jsonb,
        ghana_card_photo text,
        business_permit_photo text,
        paystack_subaccount_code text,
        payment_setup_complete boolean DEFAULT false,
        total_sales numeric(14,2) DEFAULT 0,
        total_deliveries integer DEFAULT 0,
        successful_deliveries integer DEFAULT 0,
        rating numeric(3,2) DEFAULT 0,
        commission_rate numeric(5,4) DEFAULT 0.0300,
        default_currency text DEFAULT 'GHS',
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now()
      )
    `);

    await run('wallet_accounts', () => sql`
      CREATE TABLE IF NOT EXISTS public.wallet_accounts (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE CASCADE,
        account_type text DEFAULT 'personal',
        actual_balance numeric(14,2) DEFAULT 0 NOT NULL,
        pending_balance numeric(14,2) DEFAULT 0 NOT NULL,
        currency text DEFAULT 'GHS',
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now(),
        metadata jsonb DEFAULT '{}'::jsonb
      )
    `);

    await run('messages', () => sql`
      CREATE TABLE IF NOT EXISTS public.messages (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        sender_id text NOT NULL,
        receiver_id text NOT NULL,
        content text,
        is_read boolean DEFAULT false,
        created_at timestamp without time zone DEFAULT now()
      )
    `);

    await run('follows', () => sql`
      CREATE TABLE IF NOT EXISTS public.follows (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        follower_id text NOT NULL,
        following_id text NOT NULL,
        created_at timestamp without time zone DEFAULT now(),
        UNIQUE (follower_id, following_id)
      )
    `);

    // Helpful indexes (ignore if exist)
    await run('idx_identity_accounts_user', () => sql`
      CREATE INDEX IF NOT EXISTS identity_accounts_user_id_idx ON public.identity_accounts (user_id)
    `);
    await run('idx_business_centers_identity', () => sql`
      CREATE INDEX IF NOT EXISTS business_centers_identity_id_idx ON public.business_centers (identity_id)
    `);
    await run('idx_auth_users_username', () => sql`
      CREATE INDEX IF NOT EXISTS auth_users_username_lower_idx ON public.auth_users (LOWER(username))
    `);

    const failed = steps.filter((s) => !s.ok);
    _done = failed.length === 0;
    return { ok: failed.length === 0, steps, failed };
  })();

  try {
    return await _promise;
  } catch (e) {
    _promise = null;
    throw e;
  }
}
