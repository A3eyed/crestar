// @ts-nocheck
/**
 * Idempotent core schema bootstrap + column upgrades for Crestar on Neon.
 * CREATE TABLE IF NOT EXISTS is not enough when a stub table already exists.
 */
import sql from '@/app/api/utils/sql';

let _done = false;
let _promise = null;

async function run(label, fn, steps) {
  try {
    await fn();
    steps.push({ label, ok: true });
  } catch (e) {
    steps.push({ label, ok: false, error: String(e?.message || e) });
    console.error(`[ensureCoreSchema] ${label}:`, e?.message || e);
  }
}

export async function ensureCoreSchema() {
  if (_done) return { ok: true, cached: true };
  if (_promise) return _promise;

  _promise = (async () => {
    const steps = [];

    await run(
      'identities',
      () => sql`
      CREATE TABLE IF NOT EXISTS public.identities (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        created_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `,
      steps,
    );

    await run(
      'auth_users',
      () => sql`
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
        email_verified boolean DEFAULT false,
        email_verification_code text,
        email_verification_expires timestamp without time zone,
        email_verification_attempts integer DEFAULT 0,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now(),
        business_name text
      )
    `,
      steps,
    );

    await run(
      'identity_accounts',
      () => sql`
      CREATE TABLE IF NOT EXISTS public.identity_accounts (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        identity_id uuid NOT NULL,
        user_id text NOT NULL,
        is_primary boolean DEFAULT false,
        created_at timestamp without time zone DEFAULT now()
      )
    `,
      steps,
    );

    await run(
      'business_centers',
      () => sql`
      CREATE TABLE IF NOT EXISTS public.business_centers (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        identity_id uuid,
        business_name text,
        center_type text,
        status text DEFAULT 'active',
        verification_status text DEFAULT 'pending',
        full_name text,
        phone_number text,
        momo_number text,
        country text,
        region text,
        city text,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now()
      )
    `,
      steps,
    );

    const bcCols = [
      ['status', `text DEFAULT 'active'`],
      ['full_name', 'text'],
      ['phone_number', 'text'],
      ['momo_number', 'text'],
      ['delivery_method', 'text'],
      ['delivery_regions', `jsonb DEFAULT '[]'::jsonb`],
      ['delivery_cities', `jsonb DEFAULT '[]'::jsonb`],
      ['country', 'text'],
      ['region', 'text'],
      ['city', 'text'],
      ['village', 'text'],
      ['vehicle_type', 'text'],
      ['vehicle_photo', 'text'],
      ['is_available', 'boolean DEFAULT true'],
      ['operating_regions', `jsonb DEFAULT '[]'::jsonb`],
      ['intercity_routes', `jsonb DEFAULT '[]'::jsonb`],
      ['portfolio_media', `jsonb DEFAULT '[]'::jsonb`],
      ['ghana_card_photo', 'text'],
      ['business_permit_photo', 'text'],
      ['paystack_subaccount_code', 'text'],
      ['payment_setup_complete', 'boolean DEFAULT false'],
      ['total_sales', 'numeric(14,2) DEFAULT 0'],
      ['total_deliveries', 'integer DEFAULT 0'],
      ['successful_deliveries', 'integer DEFAULT 0'],
      ['rating', 'numeric(3,2) DEFAULT 0'],
      ['commission_rate', 'numeric(5,4) DEFAULT 0.0300'],
      ['default_currency', `text DEFAULT 'GHS'`],
      ['owner_user_id', 'text'],
    ];

    for (const [col, typ] of bcCols) {
      await run(
        `bc.${col}`,
        () => sql.query(`ALTER TABLE public.business_centers ADD COLUMN IF NOT EXISTS ${col} ${typ}`),
        steps,
      );
    }

    // Critical: stub auth_users may exist without profile fields — edits would 500
    const auCols = [
      ['identity_id', 'uuid'],
      ['email', 'text'],
      ['name', 'text'],
      ['username', 'text'],
      ['display_name', 'text'],
      ['profile_image', 'text'],
      ['bio', 'text'],
      ['phone', 'text'],
      ['role', `text DEFAULT 'user'`],
      ['is_admin', 'boolean DEFAULT false'],
      ['is_verified', 'boolean DEFAULT false'],
      ['is_system_account', 'boolean DEFAULT false'],
      ['followers_count', 'integer DEFAULT 0'],
      ['following_count', 'integer DEFAULT 0'],
      ['email_verified', 'boolean DEFAULT false'],
      ['email_verification_code', 'text'],
      ['email_verification_expires', 'timestamp without time zone'],
      ['email_verification_attempts', 'integer DEFAULT 0'],
      ['username_last_changed', 'timestamp without time zone'],
      ['username_change_count', 'integer DEFAULT 0'],
      ['business_name', 'text'],
      ['created_at', 'timestamp without time zone DEFAULT now()'],
      ['updated_at', 'timestamp without time zone DEFAULT now()'],
    ];
    for (const [col, typ] of auCols) {
      await run(
        `au.${col}`,
        () => sql.query(`ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS ${col} ${typ}`),
        steps,
      );
    }

    await run(
      'idx_auth_users_username_lower',
      () =>
        sql.query(
          `CREATE UNIQUE INDEX IF NOT EXISTS auth_users_username_lower_uidx ON public.auth_users (LOWER(username)) WHERE username IS NOT NULL AND username <> ''`,
        ),
      steps,
    );

    await run(
      'wallet_accounts',
      () => sql`
      CREATE TABLE IF NOT EXISTS public.wallet_accounts (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        identity_id uuid NOT NULL,
        account_type text DEFAULT 'personal',
        actual_balance numeric(14,2) DEFAULT 0 NOT NULL,
        pending_balance numeric(14,2) DEFAULT 0 NOT NULL,
        currency text DEFAULT 'GHS',
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now(),
        metadata jsonb DEFAULT '{}'::jsonb
      )
    `,
      steps,
    );

    await run(
      'messages',
      () => sql`
      CREATE TABLE IF NOT EXISTS public.messages (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        sender_id text NOT NULL,
        receiver_id text NOT NULL,
        content text,
        is_read boolean DEFAULT false,
        created_at timestamp without time zone DEFAULT now()
      )
    `,
      steps,
    );

    await run(
      'follows',
      () => sql`
      CREATE TABLE IF NOT EXISTS public.follows (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        follower_id text NOT NULL,
        following_id text NOT NULL,
        created_at timestamp without time zone DEFAULT now()
      )
    `,
      steps,
    );

    await run(
      'professional_profiles',
      () => sql`
      CREATE TABLE IF NOT EXISTS public.professional_profiles (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id text UNIQUE,
        seller_type text,
        full_name text,
        business_name text,
        momo_number text,
        verification_status text DEFAULT 'pending',
        country text,
        region text,
        city text,
        default_currency text DEFAULT 'GHS',
        paystack_subaccount_code text,
        payment_setup_complete boolean DEFAULT false,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now()
      )
    `,
      steps,
    );

    await run(
      'idx_identity_accounts_user',
      () => sql`CREATE INDEX IF NOT EXISTS identity_accounts_user_id_idx ON public.identity_accounts (user_id)`,
      steps,
    );
    await run(
      'idx_business_centers_identity',
      () => sql`CREATE INDEX IF NOT EXISTS business_centers_identity_id_idx ON public.business_centers (identity_id)`,
      steps,
    );

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
