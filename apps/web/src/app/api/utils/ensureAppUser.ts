// @ts-nocheck
/**
 * Bridge Neon Managed Better Auth → Crestar app tables.
 *
 * Neon stores identity in neon_auth.user / neon_auth.account.
 * Crestar product tables (auth_users, business_centers, wallets, etc.)
 * live in public. Every authenticated request that touches app data
 * must call ensureAppUser first.
 */
import sql from '@/app/api/utils/sql';

function slugFromEmail(email) {
  const local = String(email || 'user').split('@')[0] || 'user';
  return local
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 24) || 'user';
}

/**
 * Ensure a row exists in public.auth_users for this Neon Auth user id.
 * Source order: existing auth_users → neon_auth.user → public.user → session hints.
 */
export async function ensureAppUser(userId, hints = {}) {
  if (!userId) return null;

  const [existing] = await sql`
    SELECT id, email, name, username, display_name, profile_image, role, is_verified
    FROM auth_users
    WHERE id = ${userId}
  `;
  if (existing) return existing;

  // Preferred source: Neon Managed Auth schema
  let email = hints.email || null;
  let name = hints.name || null;
  let image = hints.image || null;

  try {
    const [nu] = await sql`
      SELECT id, email, name, image, "emailVerified"
      FROM neon_auth."user"
      WHERE id = ${userId}
    `;
    if (nu) {
      email = email || nu.email;
      name = name || nu.name;
      image = image || nu.image;
    }
  } catch (e) {
    // Schema may be neon_auth.user without quotes depending on creation
    try {
      const [nu2] = await sql`
        SELECT id, email, name, image
        FROM neon_auth.user
        WHERE id = ${userId}
      `;
      if (nu2) {
        email = email || nu2.email;
        name = name || nu2.name;
        image = image || nu2.image;
      }
    } catch (e2) {
      console.warn('[ensureAppUser] neon_auth.user read failed:', e2?.message || e?.message);
    }
  }

  // Legacy public.user (pre-Neon-Auth installs)
  try {
    const [pu] = await sql`
      SELECT id, email, name, image FROM "user" WHERE id = ${userId}
    `;
    if (pu) {
      email = email || pu.email;
      name = name || pu.name;
      image = image || pu.image;
    }
  } catch {
    // ignore
  }

  if (!email && !name) {
    // Last resort: still create a shell so FKs work
    email = `user-${userId.slice(0, 8)}@crestar.local`;
    name = 'Crestar User';
  }

  const username = slugFromEmail(email);
  const displayName = name || username;

  try {
    const [row] = await sql`
      INSERT INTO auth_users (
        id, email, name, username, display_name, profile_image, role, is_verified, created_at, updated_at
      ) VALUES (
        ${userId},
        ${email},
        ${displayName},
        ${username},
        ${displayName},
        ${image || null},
        'user',
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, auth_users.email),
        updated_at = NOW()
      RETURNING id, email, name, username, display_name, profile_image, role, is_verified
    `;
    return row;
  } catch (e) {
    // Username unique collision — retry with suffix
    const alt = `${username}${String(userId).replace(/\D/g, '').slice(-4) || '1'}`.slice(0, 24);
    const [row] = await sql`
      INSERT INTO auth_users (
        id, email, name, username, display_name, profile_image, role, is_verified, created_at, updated_at
      ) VALUES (
        ${userId},
        ${email},
        ${displayName},
        ${alt},
        ${displayName},
        ${image || null},
        'user',
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
      RETURNING id, email, name, username, display_name, profile_image, role, is_verified
    `;
    return row;
  }
}

/**
 * Ensure identity + wallet for seller/creator/deliverer features.
 * Does not require a public."user" row.
 */
export async function ensureIdentity(userId) {
  if (!userId) throw new Error('userId required');

  // Existing link?
  try {
    const [link] = await sql`
      SELECT identity_id FROM identity_accounts
      WHERE user_id = ${userId}
      ORDER BY is_primary DESC NULLS LAST
      LIMIT 1
    `;
    if (link?.identity_id) return link.identity_id;
  } catch (e) {
    console.warn('[ensureIdentity] identity_accounts read:', e?.message);
  }

  // Create identity
  const [identity] = await sql`
    INSERT INTO identities DEFAULT VALUES RETURNING id
  `;
  const identityId = identity.id;

  try {
    await sql`
      INSERT INTO identity_accounts (identity_id, user_id, is_primary)
      VALUES (${identityId}, ${userId}, true)
      ON CONFLICT DO NOTHING
    `;
  } catch (e) {
    // Some schemas may not have ON CONFLICT target — retry plain insert
    try {
      await sql`
        INSERT INTO identity_accounts (identity_id, user_id, is_primary)
        VALUES (${identityId}, ${userId}, true)
      `;
    } catch (e2) {
      console.error('[ensureIdentity] identity_accounts insert failed:', e2?.message);
      throw e2;
    }
  }

  // Best-effort: attach identity_id on public.user if that column/row exists
  try {
    await sql`UPDATE "user" SET identity_id = ${identityId} WHERE id = ${userId}`;
  } catch {
    // public.user may not exist or lack identity_id
  }

  try {
    await sql`
      INSERT INTO wallet_accounts (identity_id, account_type, actual_balance, pending_balance)
      VALUES (${identityId}, 'personal', 0, 0)
    `;
  } catch (e) {
    console.warn('[ensureIdentity] wallet create:', e?.message);
  }

  return identityId;
}
