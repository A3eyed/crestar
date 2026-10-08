// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { auth } from '@/auth';

export async function GET(_request) {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id.toString();

    // Check all monetization profiles
    const [sellerProfile] = await sql`
      SELECT 
        id, 
        seller_type, 
        verification_status,
        features_unlocked,
        created_at
      FROM professional_profiles 
      WHERE user_id = ${userId}
    `;

    const [delivererProfile] = await sql`
      SELECT 
        id, 
        verification_status,
        features_unlocked,
        created_at
      FROM deliverer_profiles 
      WHERE user_id = ${userId}
    `;

    // Check for creator business center via identity
    // ✅ FIX: identity_accounts.user_id is TEXT — do not parseInt (Better Auth IDs are strings)
    let creatorCenter = null;
    const creatorResults = await sql`
      SELECT 
        bc.id,
        bc.verification_status,
        bc.created_at
      FROM business_centers bc
      JOIN identity_accounts ia ON bc.identity_id = ia.identity_id
      WHERE ia.user_id = ${userId}
        AND bc.center_type = 'creator'
      LIMIT 1
    `;
    if (creatorResults.length > 0) {
      creatorCenter = creatorResults[0];
    }

    return Response.json({
      seller: sellerProfile || null,
      deliverer: delivererProfile || null,
      affiliate: creatorCenter || null,
      hasAnyMonetization: !!sellerProfile || !!delivererProfile || !!creatorCenter,
    });
  } catch (error) {
    console.error('Get monetization status error:', error);
    return Response.json({ error: 'Failed to get monetization status' }, { status: 500 });
  }
}
