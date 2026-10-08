// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

/**
 * Grant admin/moderator access to a user by email.
 * Only accessible by the platform owner.
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only owners can grant admin/moderator access
    const [requester] = await sql`
      SELECT role FROM auth_users WHERE id = ${session.user.id}
    `;

    if (!requester || requester.role !== "owner") {
      return Response.json({ error: "Owner access required" }, { status: 403 });
    }

    const { email, role } = await request.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const grantRole = role || "admin";
    const validRoles = ["admin", "moderator", "user"];
    if (!validRoles.includes(grantRole)) {
      return Response.json(
        { error: "Invalid role. Must be: admin, moderator, or user" },
        { status: 400 },
      );
    }

    // Find user by email
    const [user] = await sql`
      SELECT id, username, email, role FROM auth_users 
      WHERE LOWER(email) = LOWER(${email})
    `;

    if (!user) {
      return Response.json(
        { error: `No user found with email: ${email}` },
        { status: 404 },
      );
    }

    if (user.role === "owner") {
      return Response.json(
        { error: "Cannot change owner role" },
        { status: 403 },
      );
    }

    // Grant the role
    const [updated] = await sql`
      UPDATE auth_users 
      SET 
        role = ${grantRole},
        is_admin = ${grantRole === "admin"},
        is_verified = true
      WHERE id = ${user.id}
      RETURNING id, email, username, role
    `;

    return Response.json({
      success: true,
      message: `${email} has been granted ${grantRole} access`,
      user: updated,
    });
  } catch (error) {
    console.error("Grant admin access error:", error);
    return Response.json({ error: "Failed to grant access" }, { status: 500 });
  }
}
