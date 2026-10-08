// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

/**
 * Resolve (and auto-provision) the user's wallet account id.
 * Users who signed up before wallets existed may have no identity or
 * wallet row — create them on demand instead of failing.
 */
async function ensureWalletAccount(userId) {
  // Get or create identity
  let [row] = await sql`
    SELECT identity_id FROM auth_users WHERE id = ${userId}
  `;

  let identityId = row?.identity_id;

  if (!identityId) {
    const [identity] = await sql`INSERT INTO identities DEFAULT VALUES RETURNING id`;
    identityId = identity.id;
    await sql`UPDATE auth_users SET identity_id = ${identityId} WHERE id = ${userId}`;
  }

  // Get or create wallet account
  let [wallet] = await sql`
    SELECT id FROM wallet_accounts WHERE identity_id = ${identityId}
  `;

  if (!wallet) {
    [wallet] = await sql`
      INSERT INTO wallet_accounts (identity_id, account_type, actual_balance, pending_balance, currency)
      VALUES (${identityId}, 'personal', 0, 0, 'GHS')
      RETURNING id
    `;
  }

  return { identityId, walletAccountId: wallet.id };
}

// Set or update payout method for user's wallet
export async function POST(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      method_type, // 'mobile_money', 'bank_transfer', 'ewallet'
      method_code, // 'mtn_momo', 'gcb_bank', 'opay', etc.
      method_name, // Human readable name
      details, // Object with method-specific fields
    } = body;

    if (!method_type || !method_code || !method_name || !details) {
      return Response.json(
        { error: 'Method type, code, name, and details are required' },
        { status: 400 }
      );
    }

    const { walletAccountId: wallet_account_id } = await ensureWalletAccount(userId);

    // Check if user already has a payout method
    const existingMethod = await sql`
      SELECT id FROM wallet_payout_methods 
      WHERE wallet_account_id = ${wallet_account_id}
    `;

    if (existingMethod.length > 0) {
      // Update existing payout method
      await sql`
        UPDATE wallet_payout_methods 
        SET 
          method_type = ${method_type},
          method_code = ${method_code}, 
          method_name = ${method_name},
          details = ${JSON.stringify(details)},
          updated_at = now()
        WHERE wallet_account_id = ${wallet_account_id}
      `;
    } else {
      // Create new payout method
      await sql`
        INSERT INTO wallet_payout_methods (
          wallet_account_id,
          method_type,
          method_code,
          method_name, 
          details,
          is_active
        ) VALUES (
          ${wallet_account_id},
          ${method_type},
          ${method_code},
          ${method_name},
          ${JSON.stringify(details)},
          true
        )
      `;
    }

    return Response.json({
      success: true,
      message: 'Payout method saved successfully',
    });
  } catch (error) {
    console.error('Payout method setup error:', error);
    return Response.json({ error: 'Failed to save payout method' }, { status: 500 });
  }
}

// Get current payout method
export async function GET(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { identityId: identity_id } = await ensureWalletAccount(userId);

    // Get user's payout method(s)
    const payoutMethods = await sql`
      SELECT 
        wpm.id,
        wpm.method_type,
        wpm.method_code,
        wpm.method_name,
        wpm.details,
        wpm.is_active,
        wpm.created_at,
        wpm.updated_at
      FROM wallet_payout_methods wpm
      JOIN wallet_accounts wa ON wa.id = wpm.wallet_account_id  
      WHERE wa.identity_id = ${identity_id} AND wpm.is_active = true
      ORDER BY wpm.updated_at DESC
    `;

    // Return both shapes for compatibility
    return Response.json({
      payout_method: payoutMethods.length > 0 ? payoutMethods[0] : null,
      payoutMethod: payoutMethods.length > 0 ? payoutMethods[0] : null,
      methods: payoutMethods,
    });
  } catch (error) {
    console.error('Get payout method error:', error);
    return Response.json({ error: 'Failed to get payout method' }, { status: 500 });
  }
}
