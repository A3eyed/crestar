// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

/**
 * GET /api/notifications
 *   ?counts=1  → badge counts only (TikTok-style dots)
 *   default    → recent activity + counts
 *
 * POST /api/notifications { action: 'mark_read' | 'mark_all_read', id? }
 */
export async function GET(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const me = String(userId);
    const url = new URL(request.url);
    const countsOnly = url.searchParams.get('counts') === '1';

    // Unread messages
    let unreadMessages = 0;
    try {
      const [m] = await sql`
        SELECT COUNT(*)::int AS c
        FROM messages
        WHERE receiver_user_id = ${me} AND is_read = false
      `;
      unreadMessages = m?.c || 0;
    } catch {
      unreadMessages = 0;
    }

    // Unread in-app notifications (activity: likes, follows, sales, etc.)
    let unreadActivity = 0;
    let unreadSales = 0;
    try {
      const [a] = await sql`
        SELECT
          COUNT(*) FILTER (WHERE COALESCE(is_read, false) = false)::int AS unread,
          COUNT(*) FILTER (
            WHERE COALESCE(is_read, false) = false
              AND type IN ('new_order', 'order', 'sale', 'payout')
          )::int AS sales
        FROM notifications
        WHERE user_id = ${me}
      `;
      unreadActivity = a?.unread || 0;
      unreadSales = a?.sales || 0;
    } catch {
      // Table may use read_at instead of is_read
      try {
        const [a] = await sql`
          SELECT
            COUNT(*) FILTER (WHERE read_at IS NULL)::int AS unread,
            COUNT(*) FILTER (
              WHERE read_at IS NULL
                AND type IN ('new_order', 'order', 'sale', 'payout')
            )::int AS sales
          FROM notifications
          WHERE user_id = ${me}
        `;
        unreadActivity = a?.unread || 0;
        unreadSales = a?.sales || 0;
      } catch {
        unreadActivity = 0;
        unreadSales = 0;
      }
    }

    // New seller orders waiting action (paid / preparing)
    let pendingOrders = 0;
    try {
      const [o] = await sql`
        SELECT COUNT(*)::int AS c FROM orders
        WHERE seller_id = ${me}
          AND status IN ('paid', 'preparing', 'ready_for_pickup')
      `;
      pendingOrders = o?.c || 0;
    } catch {
      pendingOrders = 0;
    }

    const counts = {
      unreadMessages,
      unreadActivity,
      unreadSales,
      pendingOrders,
      // Profile / bottom-nav total (messages + activity)
      total: unreadMessages + unreadActivity,
      // Seller / program centers
      center: pendingOrders + unreadSales,
    };

    if (countsOnly) {
      return Response.json({ counts });
    }

    let notifications = [];
    try {
      notifications = await sql`
        SELECT id, type, title, body, data, created_at,
               COALESCE(is_read, false) AS is_read
        FROM notifications
        WHERE user_id = ${me}
        ORDER BY created_at DESC
        LIMIT 50
      `;
    } catch {
      try {
        notifications = await sql`
          SELECT id, type, title, body, data, created_at,
                 (read_at IS NOT NULL) AS is_read
          FROM notifications
          WHERE user_id = ${me}
          ORDER BY created_at DESC
          LIMIT 50
        `;
      } catch {
        notifications = [];
      }
    }

    return Response.json({ counts, notifications });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return Response.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const me = String(userId);
    const body = await request.json().catch(() => ({}));
    const { action, id } = body;

    if (action === 'mark_all_read') {
      try {
        await sql`
          UPDATE notifications SET is_read = true
          WHERE user_id = ${me} AND COALESCE(is_read, false) = false
        `;
      } catch {
        try {
          await sql`
            UPDATE notifications SET read_at = NOW()
            WHERE user_id = ${me} AND read_at IS NULL
          `;
        } catch {}
      }
      return Response.json({ success: true });
    }

    if (action === 'mark_read' && id) {
      try {
        await sql`
          UPDATE notifications SET is_read = true
          WHERE id = ${id} AND user_id = ${me}
        `;
      } catch {
        try {
          await sql`
            UPDATE notifications SET read_at = NOW()
            WHERE id = ${id} AND user_id = ${me}
          `;
        } catch {}
      }
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Notifications POST error:', error);
    return Response.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
