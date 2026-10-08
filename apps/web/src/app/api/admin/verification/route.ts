// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { auth } from '@/auth';

// POST: Toggle verification status for a user
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id; // V2 uses text IDs — do NOT parseInt

    // Check admin privileges via role
    const [admin] = await sql`
      SELECT id, role FROM auth_users
      WHERE id = ${userId} AND role IN ('admin', 'owner', 'moderator')
    `;

    if (!admin) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId: targetUserId, verified, action } = body;

    if (!targetUserId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Determine the verification status
    let verificationStatus;
    if (verified !== undefined) {
      verificationStatus = verified;
    } else if (action === 'verify') {
      verificationStatus = true;
    } else if (action === 'unverify') {
      verificationStatus = false;
    } else {
      return Response.json({ error: 'Invalid verification action' }, { status: 400 });
    }

    // Get current user info before update
    const [currentUser] = await sql`
      SELECT username, is_verified FROM auth_users WHERE id = ${targetUserId}
    `;

    if (!currentUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Update verification status
    const [updatedUser] = await sql`
      UPDATE auth_users
      SET is_verified = ${verificationStatus}
      WHERE id = ${targetUserId}
      RETURNING id, username, is_verified
    `;

    // Log the action in admin logs
    try {
      await sql`
        INSERT INTO admin_logs (admin_id, action_type, target_user_id, target_entity_type, details)
        VALUES (
          ${userId},
          'verification_toggle',
          ${targetUserId},
          'user',
          ${JSON.stringify({
            previous_status: currentUser.is_verified,
            new_status: verificationStatus,
            username: currentUser.username,
          })}
        )
      `;
    } catch (logError) {
      console.error('Failed to log admin action:', logError);
      // Continue execution even if logging fails
    }

    return Response.json({
      success: true,
      message: `User ${verificationStatus ? 'verified' : 'unverified'} successfully`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Admin verification error:', error);
    return Response.json({ error: 'Failed to update verification status' }, { status: 500 });
  }
}
