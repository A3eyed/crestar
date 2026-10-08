// @ts-nocheck
import { resolveUserId } from '@/app/api/utils/auth';
import {
  getSupportAccount,
  getSupportThread,
  isSupportAgent,
  sendSupportMessage,
} from '@/app/api/utils/support';

/**
 * In-app support chat — a single thread per user, always with @Crestar.
 *
 * GET  /api/support/chat                 — my own thread
 * GET  /api/support/chat?userId=…        — an agent reading someone's thread
 * POST /api/support/chat { text }        — user writes in
 * POST /api/support/chat { userId, text} — @Crestar or @Abdallah replies
 *
 * Only @Crestar and @Abdallah can reply. Everyone else can only write into
 * their own thread, and replies always appear as coming from @Crestar.
 */

export async function GET(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const requestedUserId = url.searchParams.get('userId');

    let threadOwner = userId;
    if (requestedUserId && requestedUserId !== userId) {
      if (!(await isSupportAgent(userId))) {
        return Response.json({ error: 'Access denied' }, { status: 403 });
      }
      threadOwner = requestedUserId;
    }

    const [messages, support] = await Promise.all([
      getSupportThread(threadOwner),
      getSupportAccount(),
    ]);

    return Response.json({
      messages,
      support: support
        ? {
            id: support.id,
            handle: support.username,
            name: support.business_name || support.display_name || 'Crestar Support',
            avatar: support.profile_image || null,
          }
        : null,
      isAgent: await isSupportAgent(userId),
    });
  } catch (error) {
    console.error('Support chat read error:', error);
    return Response.json({ error: 'Could not load support chat' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { text, userId: targetUserId = null } = await request.json();
    if (!text || !String(text).trim()) {
      return Response.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    // Replying on someone else's behalf is strictly @Crestar / @Abdallah only.
    if (targetUserId && String(targetUserId) !== String(userId)) {
      if (!(await isSupportAgent(userId))) {
        return Response.json(
          { error: 'Only Crestar support can reply to support threads' },
          { status: 403 }
        );
      }

      const { message } = await sendSupportMessage({
        userId: targetUserId,
        text: String(text).trim(),
        direction: 'outbound',
        agentId: userId,
      });

      return Response.json({ success: true, message });
    }

    const { message } = await sendSupportMessage({
      userId,
      text: String(text).trim(),
      direction: 'inbound',
    });

    return Response.json({ success: true, message });
  } catch (error) {
    console.error('Support chat write error:', error);
    return Response.json({ error: error.message || 'Could not send message' }, { status: 500 });
  }
}
