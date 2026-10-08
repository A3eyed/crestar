// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Block a user
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    const blockerUserId = session.user.id.toString();
    const body = await request.json();
    const { username } = body;

    if (!username || !username.trim()) {
      return Response.json(
        { error: "Please provide a username to block" },
        { status: 400 },
      );
    }

    // Clean username (remove @ if present)
    const cleanUsername = username.replace(/^@/, "").toLowerCase();

    // Get blocker's info
    const blockerResult = await sql`
      SELECT username FROM auth_users WHERE id = ${blockerUserId} LIMIT 1
    `;

    if (!blockerResult.length) {
      return Response.json(
        { error: "Blocker account not found" },
        { status: 404 },
      );
    }

    const blockerUsername = blockerResult[0].username;

    // Prevent self-blocking
    if (blockerUsername?.toLowerCase() === cleanUsername) {
      return Response.json(
        { error: "You cannot block yourself" },
        { status: 400 },
      );
    }

    // Get target user info
    const targetResult = await sql`
      SELECT id, username FROM auth_users 
      WHERE LOWER(username) = ${cleanUsername} 
      LIMIT 1
    `;

    if (!targetResult.length) {
      return Response.json(
        { error: `User @${cleanUsername} not found` },
        { status: 404 },
      );
    }

    const targetUserId = targetResult[0].id.toString();

    // Create blocks table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS user_blocks (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        blocker_user_id TEXT NOT NULL,
        blocked_user_id TEXT NOT NULL,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        UNIQUE(blocker_user_id, blocked_user_id)
      )
    `;

    // Check if already blocked
    const existingBlock = await sql`
      SELECT id FROM user_blocks 
      WHERE blocker_user_id = ${blockerUserId} AND blocked_user_id = ${targetUserId}
      LIMIT 1
    `;

    if (existingBlock.length > 0) {
      return Response.json(
        { error: `You have already blocked @${cleanUsername}` },
        { status: 400 },
      );
    }

    // Block the user
    await sql`
      INSERT INTO user_blocks (blocker_user_id, blocked_user_id)
      VALUES (${blockerUserId}, ${targetUserId})
    `;

    return Response.json({
      success: true,
      message: `Successfully blocked @${cleanUsername}`,
      blocked_username: cleanUsername,
    });
  } catch (error) {
    if (error.message?.includes("unique")) {
      return Response.json(
        { error: "User is already blocked" },
        { status: 400 },
      );
    }
    console.error("Block user error:", error);
    return Response.json(
      { error: "Failed to block user. Please try again." },
      { status: 500 },
    );
  }
}

// Unblock a user
export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    const blockerUserId = session.user.id.toString();
    const body = await request.json();
    const { username } = body;

    if (!username || !username.trim()) {
      return Response.json(
        { error: "Please provide a username to unblock" },
        { status: 400 },
      );
    }

    // Clean username (remove @ if present)
    const cleanUsername = username.replace(/^@/, "").toLowerCase();

    // Get target user info
    const targetResult = await sql`
      SELECT id FROM auth_users 
      WHERE LOWER(username) = ${cleanUsername} 
      LIMIT 1
    `;

    if (!targetResult.length) {
      return Response.json(
        { error: `User @${cleanUsername} not found` },
        { status: 404 },
      );
    }

    const targetUserId = targetResult[0].id.toString();

    // Remove the block
    const deleteResult = await sql`
      DELETE FROM user_blocks 
      WHERE blocker_user_id = ${blockerUserId} AND blocked_user_id = ${targetUserId}
      RETURNING id
    `;

    if (!deleteResult.length) {
      return Response.json(
        { error: `@${cleanUsername} is not blocked` },
        { status: 404 },
      );
    }

    return Response.json({
      success: true,
      message: `Successfully unblocked @${cleanUsername}`,
      unblocked_username: cleanUsername,
    });
  } catch (error) {
    console.error("Unblock user error:", error);
    return Response.json(
      { error: "Failed to unblock user. Please try again." },
      { status: 500 },
    );
  }
}

// Get blocked users list
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    const userId = session.user.id.toString();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get blocked users
    const blockedUsers = await sql`
      SELECT 
        ub.*,
        au.username,
        au.display_name,
        au.profile_image
      FROM user_blocks ub
      JOIN auth_users au ON ub.blocked_user_id = au.id::text
      WHERE ub.blocker_user_id = ${userId}
      ORDER BY ub.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const formattedBlocks = blockedUsers.map((block) => ({
      id: block.id,
      username: block.username,
      display_name: block.display_name,
      profile_image: block.profile_image,
      blocked_at: block.created_at,
    }));

    return Response.json({ blocked_users: formattedBlocks });
  } catch (error) {
    console.error("Get blocked users error:", error);
    return Response.json(
      { error: "Failed to get blocked users" },
      { status: 500 },
    );
  }
}
