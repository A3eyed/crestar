// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Admin-only endpoint - Get all reports for moderation
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

    // Check admin privileges via role
    const adminCheck = await sql`
      SELECT id, role FROM auth_users 
      WHERE id = ${userId} AND role IN ('admin', 'owner', 'moderator')
      LIMIT 1
    `;

    if (!adminCheck.length) {
      return Response.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending"; // pending, reviewed, resolved, dismissed
    const reportType = searchParams.get("type"); // user, video
    const category = searchParams.get("category"); // fraud, harassment, etc.
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query conditions
    let whereConditions = [];
    let params = [];

    if (status && status !== "all") {
      whereConditions.push(`ur.status = $${params.length + 1}`);
      params.push(status);
    }

    if (reportType) {
      whereConditions.push(`ur.report_type = $${params.length + 1}`);
      params.push(reportType);
    }

    if (category) {
      whereConditions.push(`ur.category = $${params.length + 1}`);
      params.push(category);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Get reports with detailed information
    const reportsQuery = `
      SELECT 
        ur.*,
        reporter.username as reporter_username,
        reporter.display_name as reporter_display_name,
        reporter.profile_image as reporter_profile_image,
        reporter.email as reporter_email,
        target.username as target_username,
        target.display_name as target_display_name,
        target.profile_image as target_profile_image,
        target.email as target_email,
        target.is_admin as target_is_admin,
        target.is_verified as target_is_verified
      FROM user_reports ur
      JOIN auth_users reporter ON ur.reporter_user_id = reporter.id::text
      LEFT JOIN auth_users target ON ur.target_user_id = target.id::text
      ${whereClause}
      ORDER BY 
        CASE WHEN ur.status = 'pending' THEN 1 ELSE 2 END,
        ur.created_at DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const reports = await sql(reportsQuery, params);

    const categoryNames = {
      fraud: "Fraud",
      harassment: "Harassment",
      inappropriate: "Inappropriate Content",
      illegal_goods: "Illegal Goods",
    };

    const statusNames = {
      pending: "Pending Review",
      reviewed: "Under Review",
      resolved: "Resolved",
      dismissed: "Dismissed",
    };

    const formattedReports = reports.map((report) => ({
      id: report.id,
      type: report.report_type,
      category: categoryNames[report.category],
      category_code: report.category,
      description: report.description,
      status: statusNames[report.status],
      status_code: report.status,
      admin_notes: report.admin_notes,
      reporter: {
        user_id: report.reporter_user_id,
        username: report.reporter_username,
        display_name: report.reporter_display_name,
        profile_image: report.reporter_profile_image,
        email: report.reporter_email,
      },
      target: {
        type: report.report_type,
        user_id: report.target_user_id,
        video_id: report.target_video_id,
        username: report.target_username,
        display_name: report.target_display_name,
        profile_image: report.target_profile_image,
        email: report.target_email,
        is_admin: report.target_is_admin,
        is_verified: report.target_is_verified,
      },
      submitted_at: report.created_at,
      updated_at: report.updated_at,
    }));

    // Get summary stats
    const stats = await sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM user_reports
      GROUP BY status
    `;

    const summaryStats = {
      pending: 0,
      reviewed: 0,
      resolved: 0,
      dismissed: 0,
    };

    stats.forEach((stat) => {
      summaryStats[stat.status] = parseInt(stat.count);
    });

    return Response.json({
      reports: formattedReports,
      stats: summaryStats,
      total: formattedReports.length,
    });
  } catch (error) {
    console.error("Admin get reports error:", error);
    return Response.json({ error: "Failed to get reports" }, { status: 500 });
  }
}

// Admin action on reports
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    const userId = session.user.id.toString();

    // Check admin privileges via role
    const adminCheck = await sql`
      SELECT id, role FROM auth_users 
      WHERE id = ${userId} AND role IN ('admin', 'owner', 'moderator')
      LIMIT 1
    `;

    if (!adminCheck.length) {
      return Response.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      reportId,
      action, // 'update_status', 'shadow_ban', 'deactivate_account'
      newStatus, // 'reviewed', 'resolved', 'dismissed'
      adminNotes,
      targetUserId, // Required for shadow_ban and deactivate_account actions
    } = body;

    if (!reportId) {
      return Response.json({ error: "Report ID is required" }, { status: 400 });
    }

    if (
      !action ||
      !["update_status", "shadow_ban", "deactivate_account"].includes(action)
    ) {
      return Response.json(
        {
          error:
            "Invalid action. Must be: update_status, shadow_ban, or deactivate_account",
        },
        { status: 400 },
      );
    }

    // Get the report details
    const report = await sql`
      SELECT * FROM user_reports WHERE id = ${reportId} LIMIT 1
    `;

    if (!report.length) {
      return Response.json({ error: "Report not found" }, { status: 404 });
    }

    const reportData = report[0];

    if (action === "update_status") {
      if (
        !newStatus ||
        !["reviewed", "resolved", "dismissed"].includes(newStatus)
      ) {
        return Response.json(
          {
            error: "Invalid status. Must be: reviewed, resolved, or dismissed",
          },
          { status: 400 },
        );
      }

      // Update report status
      await sql`
        UPDATE user_reports 
        SET 
          status = ${newStatus},
          admin_notes = ${adminNotes || null},
          updated_at = NOW()
        WHERE id = ${reportId}
      `;

      return Response.json({
        success: true,
        message: `Report status updated to ${newStatus}`,
        action: "status_updated",
      });
    } else if (action === "shadow_ban" || action === "deactivate_account") {
      const userIdToAction = targetUserId || reportData.target_user_id;

      if (!userIdToAction) {
        return Response.json(
          { error: "Target user ID is required for this action" },
          { status: 400 },
        );
      }

      // Create admin actions table if it doesn't exist
      await sql`
        CREATE TABLE IF NOT EXISTS admin_actions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          admin_user_id TEXT NOT NULL,
          action_type TEXT NOT NULL CHECK (action_type IN ('shadow_ban', 'deactivate_account', 'restore_account')),
          target_user_id TEXT NOT NULL,
          reason TEXT,
          related_report_id UUID,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )
      `;

      if (action === "shadow_ban") {
        // Add shadow_banned field to user
        await sql`
          UPDATE auth_users 
          SET 
            is_system_account = true,
            bio = COALESCE(bio, '') || ' [Shadow Banned]'
          WHERE id = ${userIdToAction}
        `;

        // Log admin action
        await sql`
          INSERT INTO admin_actions (
            admin_user_id, action_type, target_user_id, reason, related_report_id
          ) VALUES (
            ${userId}, 'shadow_ban', ${userIdToAction}, ${adminNotes || "Shadow banned based on report"}, ${reportId}
          )
        `;

        // Update report
        await sql`
          UPDATE user_reports 
          SET 
            status = 'resolved',
            admin_notes = ${`Shadow banned user. ${adminNotes || ""}`},
            updated_at = NOW()
          WHERE id = ${reportId}
        `;

        return Response.json({
          success: true,
          message: "User has been shadow banned",
          action: "shadow_banned",
        });
      } else if (action === "deactivate_account") {
        // Deactivate user account
        await sql`
          UPDATE auth_users 
          SET 
            email = email || '.deactivated',
            username = username || '.deactivated',
            is_system_account = true,
            bio = 'Account deactivated by admin'
          WHERE id = ${userIdToAction}
        `;

        // Log admin action
        await sql`
          INSERT INTO admin_actions (
            admin_user_id, action_type, target_user_id, reason, related_report_id
          ) VALUES (
            ${userId}, 'deactivate_account', ${userIdToAction}, ${adminNotes || "Account deactivated based on report"}, ${reportId}
          )
        `;

        // Update report
        await sql`
          UPDATE user_reports 
          SET 
            status = 'resolved',
            admin_notes = ${`Account deactivated. ${adminNotes || ""}`},
            updated_at = NOW()
          WHERE id = ${reportId}
        `;

        return Response.json({
          success: true,
          message: "User account has been deactivated",
          action: "account_deactivated",
        });
      }
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Admin action error:", error);
    return Response.json(
      { error: "Failed to process admin action" },
      { status: 500 },
    );
  }
}
