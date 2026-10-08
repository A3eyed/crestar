// @ts-nocheck
import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = session.user;
    const currentRole = currentUser.role || "user";

    // Only admin and owner can access this endpoint
    if (currentRole !== "admin" && currentRole !== "owner") {
      return Response.json(
        {
          error: "Access denied. Only admins and owners can manage user roles.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { userId, newRole } = body;

    // Validate input
    if (!userId || typeof userId !== "number") {
      return Response.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const validRoles = ["user", "moderator", "admin", "owner"];
    if (!newRole || !validRoles.includes(newRole)) {
      return Response.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 },
      );
    }

    // Get target user
    const targetUserResult = await sql`
      SELECT id, email, username, role, name
      FROM auth_users
      WHERE id = ${userId}
    `;

    if (targetUserResult.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const targetUser = targetUserResult[0];
    const targetCurrentRole = targetUser.role || "user";

    // Cannot modify yourself
    if (currentUser.id === userId) {
      return Response.json(
        { error: "You cannot change your own role" },
        { status: 400 },
      );
    }

    // Role transition validation rules
    if (newRole === "owner") {
      if (currentRole !== "owner") {
        return Response.json(
          { error: "Only the current owner can promote someone to owner" },
          { status: 403 },
        );
      }
      // Warning: promoting to owner should be done very carefully
      // Consider adding additional confirmation steps in production
    }

    if (newRole === "admin") {
      if (currentRole !== "owner") {
        return Response.json(
          { error: "Only the owner can promote users to admin" },
          { status: 403 },
        );
      }
    }

    if (newRole === "moderator") {
      if (currentRole !== "admin" && currentRole !== "owner") {
        return Response.json(
          { error: "Only admins and owners can promote users to moderator" },
          { status: 403 },
        );
      }
    }

    // Cannot demote the owner
    if (targetCurrentRole === "owner" && newRole !== "owner") {
      return Response.json(
        { error: "Cannot demote the owner. Please transfer ownership first." },
        { status: 403 },
      );
    }

    // Cannot demote an admin unless you're the owner
    if (
      targetCurrentRole === "admin" &&
      newRole !== "admin" &&
      currentRole !== "owner"
    ) {
      return Response.json(
        { error: "Only the owner can change an admin's role" },
        { status: 403 },
      );
    }

    // Update the user's role
    const updateResult = await sql`
      UPDATE auth_users
      SET role = ${newRole}
      WHERE id = ${userId}
      RETURNING id, email, username, role, name
    `;

    const updatedUser = updateResult[0];

    // Log the role change in admin_logs
    await sql`
      INSERT INTO admin_logs (
        admin_id,
        action_type,
        target_user_id,
        target_entity_type,
        details
      ) VALUES (
        ${currentUser.id},
        'role_change',
        ${userId},
        'user',
        ${JSON.stringify({
          previous_role: targetCurrentRole,
          new_role: newRole,
          target_email: targetUser.email,
          target_username: targetUser.username,
          changed_by: currentUser.email,
        })}
      )
    `;

    return Response.json({
      success: true,
      message: `User role updated from ${targetCurrentRole} to ${newRole}`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
        name: updatedUser.name,
      },
    });
  } catch (error) {
    console.error("Error promoting user:", error);
    return Response.json(
      { error: "Failed to update user role" },
      { status: 500 },
    );
  }
}
