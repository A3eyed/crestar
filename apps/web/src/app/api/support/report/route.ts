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

    const [reporter] = await sql`
      SELECT username, email FROM auth_users WHERE id = ${userId}
    `;

    const typeLabels = {
      content_violation: 'Content Policy Violation',
      user_behavior: 'User Behavior Report',
      technical_issue: 'Technical Issue',
      payment_dispute: 'Payment Dispute',
      general_support: 'General Support Request',
    };

    let adminMessage = `🚨 ${subject}\n\n`;
    adminMessage += `Type: ${typeLabels[type]}\n`;
    adminMessage += `Reporter: @${reporter?.username || 'User'} (${reporter?.email || userId})\n`;

    if (targetUserId) {
      adminMessage += `Reported User: ${targetUserId}\n`;
    }
    if (targetContentId && targetContentType) {
      adminMessage += `Content: ${targetContentType} ${targetContentId}\n`;
    }

    adminMessage += `\nDetails:\n${message}\n`;
    adminMessage += `\nReported at: ${new Date().toISOString()}`;

    const reportId = `RPT${Date.now()}`;

    // Primary path: support inbox thread with @Crestar
    try {
      await sendSupportMessage({
        userId,
        text: adminMessage,
        direction: 'inbound',
      });
    } catch (threadErr) {
      console.error('Support thread write failed:', threadErr);
      // Fallback: still accept the report via admin_logs so the user is not blocked
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
              subject,
              message,
              reporter_id: userId,
              target_user_id: targetUserId,
              target_content_id: targetContentId,
              target_content_type: targetContentType,
              report_id: reportId,
              thread_error: String(threadErr?.message || threadErr),
              reported_at: new Date().toISOString(),
            })}
          )
        `;
      } catch (logFail) {
        console.error('admin_logs fallback also failed:', logFail);
        return Response.json(
          {
            error:
              threadErr?.message?.includes('not configured')
                ? 'Support is temporarily unavailable. Please contact us on WhatsApp at +233 54 379 9308.'
                : 'Failed to submit report. Please try WhatsApp support at +233 54 379 9308.',
          },
          { status: 500 },
        );
      }

      return Response.json({
        success: true,
        message: 'Report submitted successfully',
        reportId,
        type: typeLabels[type],
        via: 'admin_log_fallback',
      });
    }

    // Best-effort audit log (non-fatal)
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
            subject,
            message,
            reporter_id: userId,
            target_user_id: targetUserId,
            target_content_id: targetContentId,
            target_content_type: targetContentType,
            report_id: reportId,
            reported_at: new Date().toISOString(),
          })}
        )
      `;
    } catch (logError) {
      console.error('Failed to log report:', logError);
    }

    // Best-effort auto-reply (non-fatal)
    try {
      const autoReplyMessage = `Thank you for your report. We've received your ${typeLabels[type].toLowerCase()} and will review it within 24 hours.

Report ID: ${reportId}

Our team takes all reports seriously and will investigate promptly. You'll receive a response once we've completed our review. For faster help, WhatsApp us at +233 54 379 9308.

- Crestar Support`;

      await sendSupportMessage({
        userId,
        text: autoReplyMessage,
        direction: 'outbound',
      });
    } catch (replyErr) {
      console.error('Support auto-reply failed:', replyErr);
    }

    return Response.json({
      success: true,
      message: 'Report submitted successfully',
      reportId,
      type: typeLabels[type],
    });
  } catch (error) {
    console.error('Support report error:', error);
    return Response.json(
      {
        error:
          error?.message ||
          'Failed to submit report. Please try WhatsApp support at +233 54 379 9308.',
      },
      { status: 500 },
    );
  }
}
