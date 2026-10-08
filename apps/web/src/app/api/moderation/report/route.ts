// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { auth } from '@/auth';

// Submit a report
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const reporterUserId = session.user.id.toString();
    const body = await request.json();
    const {
      reportType, // 'user' or 'video'
      targetUserId, // User ID being reported
      targetVideoId, // Video ID being reported (if reportType = 'video')
      category, // 'fraud', 'harassment', 'inappropriate', 'illegal_goods'
      description, // Additional details
      username, // Target username for reference
    } = body;

    // Validate inputs
    if (!reportType || !['user', 'video'].includes(reportType)) {
      return Response.json(
        { error: "Invalid report type. Must be 'user' or 'video'" },
        { status: 400 }
      );
    }

    if (
      !category ||
      !['fraud', 'harassment', 'inappropriate', 'illegal_goods'].includes(category)
    ) {
      return Response.json(
        {
          error:
            'Invalid category. Must be one of: fraud, harassment, inappropriate, illegal_goods',
        },
        { status: 400 }
      );
    }

    if (reportType === 'user' && !targetUserId) {
      return Response.json(
        { error: 'Target user ID is required for user reports' },
        { status: 400 }
      );
    }

    if (reportType === 'video' && !targetVideoId) {
      return Response.json(
        { error: 'Target video ID is required for video reports' },
        { status: 400 }
      );
    }

    // Prevent self-reporting
    if (reportType === 'user' && targetUserId === reporterUserId) {
      return Response.json({ error: 'You cannot report yourself' }, { status: 400 });
    }

    // Create reports table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS user_reports (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        reporter_user_id TEXT NOT NULL,
        report_type TEXT NOT NULL CHECK (report_type IN ('user', 'video')),
        target_user_id TEXT,
        target_video_id TEXT,
        target_username TEXT,
        category TEXT NOT NULL CHECK (category IN ('fraud', 'harassment', 'inappropriate', 'illegal_goods')),
        description TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
        admin_notes TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      )
    `;

    // Check for duplicate reports (same reporter, same target, same category, within 24 hours)
    // NOTE: nested sql fragments are not supported — use two separate queries
    let duplicateCheck;
    if (reportType === 'user') {
      duplicateCheck = await sql`
        SELECT id FROM user_reports 
        WHERE reporter_user_id = ${reporterUserId} 
          AND report_type = ${reportType}
          AND target_user_id = ${targetUserId}
          AND category = ${category}
          AND created_at > NOW() - INTERVAL '24 hours'
        LIMIT 1
      `;
    } else {
      duplicateCheck = await sql`
        SELECT id FROM user_reports 
        WHERE reporter_user_id = ${reporterUserId} 
          AND report_type = ${reportType}
          AND target_video_id = ${targetVideoId}
          AND category = ${category}
          AND created_at > NOW() - INTERVAL '24 hours'
        LIMIT 1
      `;
    }

    if (duplicateCheck.length > 0) {
      return Response.json(
        {
          error: 'You have already reported this content for this reason in the last 24 hours',
        },
        { status: 400 }
      );
    }

    // Submit the report
    const reportResult = await sql`
      INSERT INTO user_reports (
        reporter_user_id,
        report_type,
        target_user_id,
        target_video_id,
        target_username,
        category,
        description,
        status
      ) VALUES (
        ${reporterUserId},
        ${reportType},
        ${targetUserId || null},
        ${targetVideoId || null},
        ${username || null},
        ${category},
        ${description || null},
        'pending'
      )
      RETURNING id, created_at
    `;

    const report = reportResult[0];

    // Get category display name
    const categoryNames = {
      fraud: 'Fraud',
      harassment: 'Harassment',
      inappropriate: 'Inappropriate Content',
      illegal_goods: 'Illegal Goods',
    };

    return Response.json({
      success: true,
      message: `Report submitted successfully. Our team will review it shortly.`,
      report: {
        id: report.id,
        type: reportType,
        category: categoryNames[category],
        submitted_at: report.created_at,
      },
    });
  } catch (error) {
    console.error('Submit report error:', error);
    return Response.json({ error: 'Failed to submit report. Please try again.' }, { status: 500 });
  }
}

// Get user's submitted reports
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const userId = session.user.id.toString();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user's submitted reports
    const reports = await sql`
      SELECT 
        ur.*,
        au.username as target_username_resolved,
        au.display_name as target_display_name,
        au.profile_image as target_profile_image
      FROM user_reports ur
      LEFT JOIN auth_users au ON ur.target_user_id = au.id::text
      WHERE ur.reporter_user_id = ${userId}
      ORDER BY ur.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const categoryNames = {
      fraud: 'Fraud',
      harassment: 'Harassment',
      inappropriate: 'Inappropriate Content',
      illegal_goods: 'Illegal Goods',
    };

    const statusNames = {
      pending: 'Under Review',
      reviewed: 'Reviewed',
      resolved: 'Resolved',
      dismissed: 'Dismissed',
    };

    const formattedReports = reports.map((report) => ({
      id: report.id,
      type: report.report_type,
      category: categoryNames[report.category],
      category_code: report.category,
      description: report.description,
      status: statusNames[report.status],
      status_code: report.status,
      target: {
        type: report.report_type,
        user_id: report.target_user_id,
        video_id: report.target_video_id,
        username: report.target_username_resolved || report.target_username,
        display_name: report.target_display_name,
        profile_image: report.target_profile_image,
      },
      admin_notes: report.admin_notes,
      submitted_at: report.created_at,
      updated_at: report.updated_at,
    }));

    return Response.json({ reports: formattedReports });
  } catch (error) {
    console.error('Get reports error:', error);
    return Response.json({ error: 'Failed to get reports' }, { status: 500 });
  }
}
