// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';
import { sendSupportMessage } from '@/app/api/utils/support';

// POST: Submit a report/support request that routes to admin inbox
export async function POST(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, subject, message, targetUserId, targetContentId, targetContentType } = body;

    if (!type || !subject || !message) {
      return Response.json({ error: 'Type, subject, and message are required' }, { status: 400 });
    }

    // Valid report types
    const validTypes = [
      'content_violation',
      'user_behavior',
      'technical_issue',
      'payment_dispute',
      'general_support',
    ];
    if (!validTypes.includes(type)) {
      return Response.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // Look up reporter info for the admin message
    const [reporter] = await sql`
      SELECT username, email FROM auth_users WHERE id = ${userId}
    `;

    // Build comprehensive report message for admin
    let adminMessage = `🚨 ${subject}\n\n`;

    // Add report type and details
    const typeLabels = {
      content_violation: 'Content Policy Violation',
      user_behavior: 'User Behavior Report',
      technical_issue: 'Technical Issue',
      payment_dispute: 'Payment Dispute',
      general_support: 'General Support Request',
    };

    adminMessage += `Type: ${typeLabels[type]}\n`;
    adminMessage += `Reporter: @${reporter?.username || 'User'} (${reporter?.email || userId})\n`;

    // Add target information if provided
    if (targetUserId) {
      adminMessage += `Reported User: ${targetUserId}\n`;
    }

    if (targetContentId && targetContentType) {
      adminMessage += `Content: ${targetContentType} ${targetContentId}\n`;
    }

    adminMessage += `\nDetails:\n${message}\n`;
    adminMessage += `\nReported at: ${new Date().toISOString()}`;

    // Route the report into the user's @Crestar support thread. This used to
    // write to a literal 'admin' user id, which doesn't exist — so the thread
    // was orphaned and nobody could ever reply to it.
    await sendSupportMessage({
      userId,
      text: adminMessage,
      direction: 'inbound',
    });

    // Log the report in admin logs
    try {
      await sql`
        INSERT INTO admin_logs (admin_id, action_type, target_user_id, target_entity_type, target_entity_id, details)
        VALUES (
          NULL,
          'user_report',
          ${userId},
          ${targetContentType || 'user'},
          ${targetContentId || targetUserId || null},
          ${JSON.stringify({
            report_type: type,
            subject: subject,
            message: message,
            reporter_id: userId,
            target_user_id: targetUserId,
            target_content_id: targetContentId,
            target_content_type: targetContentType,
            reported_at: new Date().toISOString(),
          })}
        )
      `;
    } catch (logError) {
      console.error('Failed to log report:', logError);
    }

    // Send auto-reply to user confirming receipt
    const autoReplyMessage = `Thank you for your report. We've received your ${typeLabels[type].toLowerCase()} and will review it within 24 hours. 

Report ID: RPT${Date.now()}

Our team takes all reports seriously and will investigate promptly. You'll receive a response once we've completed our review.

- Crestar Support`;

    await sendSupportMessage({
      userId,
      text: autoReplyMessage,
      direction: 'outbound',
    });

    return Response.json({
      success: true,
      message: 'Report submitted successfully',
      reportId: `RPT${Date.now()}`,
      type: typeLabels[type],
    });
  } catch (error) {
    console.error('Support report error:', error);
    return Response.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}
