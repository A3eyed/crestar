// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { auth } from '@/auth';

// GET: Get pending content for moderation
export async function GET(request) {
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

    const url = new URL(request.url);
    const contentType = url.searchParams.get('type') || 'all'; // all, products, services, videos
    const status = url.searchParams.get('status') || 'pending'; // pending, approved, rejected
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    let content = [];

    // Get products pending review
    if (contentType === 'all' || contentType === 'products') {
      const products = await sql`
        SELECT 
          'product' as content_type,
          p.id,
          p.title,
          p.description,
          p.media,
          p.price,
          p.status,
          p.seller_id,
          p.created_at,
          u.username as seller_username,
          u.email as seller_email
        FROM products p
        LEFT JOIN auth_users u ON p.seller_id = CAST(u.id AS TEXT)
        WHERE p.status = 'draft'
        ORDER BY p.created_at DESC
        LIMIT ${limit}
      `;
      content = [...content, ...products];
    }

    // Get services pending review
    if (contentType === 'all' || contentType === 'services') {
      const services = await sql`
        SELECT 
          'service' as content_type,
          s.id,
          s.title,
          s.description,
          s.media,
          s.basic_price as price,
          s.status,
          s.seller_id,
          s.created_at,
          u.username as seller_username,
          u.email as seller_email
        FROM services s
        LEFT JOIN auth_users u ON s.seller_id = CAST(u.id AS TEXT)
        WHERE s.status = 'draft'
        ORDER BY s.created_at DESC
        LIMIT ${limit}
      `;
      content = [...content, ...services];
    }

    // Note: Videos don't have a specific table in the current schema,
    // but we can add video moderation when the video system is implemented

    // Sort all content by creation date
    content.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Get statistics
    const [productStats] = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'draft') as pending_products,
        COUNT(*) FILTER (WHERE status = 'active') as approved_products,
        COUNT(*) FILTER (WHERE status = 'archived') as rejected_products
      FROM products
    `;

    const [serviceStats] = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'draft') as pending_services,
        COUNT(*) FILTER (WHERE status = 'active') as approved_services,
        COUNT(*) FILTER (WHERE status = 'archived') as rejected_services
      FROM services
    `;

    const stats = {
      total_pending:
        parseInt(productStats.pending_products) + parseInt(serviceStats.pending_services),
      products: {
        pending: parseInt(productStats.pending_products),
        approved: parseInt(productStats.approved_products),
        rejected: parseInt(productStats.rejected_products),
      },
      services: {
        pending: parseInt(serviceStats.pending_services),
        approved: parseInt(serviceStats.approved_services),
        rejected: parseInt(serviceStats.rejected_services),
      },
    };

    return Response.json({
      success: true,
      content: content,
      stats: stats,
      filters: { contentType, status, limit },
    });
  } catch (error) {
    console.error('Admin content moderation GET error:', error);
    return Response.json({ error: 'Failed to fetch content for moderation' }, { status: 500 });
  }
}

// POST: Moderate content (approve, reject, hide)
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id; // ✅ FIXED: V2 uses text IDs

    // Check admin privileges via role
    const [admin] = await sql`
      SELECT id, role FROM "user"
      WHERE id = ${userId} AND role IN ('admin', 'owner', 'moderator')
    `;

    if (!admin) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { contentId, contentType, action, reason } = body;

    if (!contentId || !contentType || !action) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['approve', 'reject', 'hide'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Reject action requires a reason
    if (action === 'reject' && !reason) {
      return Response.json({ error: 'Reason is required for rejection' }, { status: 400 });
    }

    let newStatus;
    let tableName;

    // Determine status and table based on action and content type
    if (contentType === 'product') {
      tableName = 'products';
      newStatus = action === 'approve' ? 'active' : action === 'reject' ? 'archived' : 'sold_out'; // hide
    } else if (contentType === 'service') {
      tableName = 'services';
      newStatus = action === 'approve' ? 'active' : 'archived'; // reject or hide
    } else {
      return Response.json({ error: 'Invalid content type' }, { status: 400 });
    }

    // Update content status - use parameterized queries to prevent SQL injection
    if (contentType === 'product') {
      await sql`
        UPDATE products
        SET status = ${newStatus}, updated_at = NOW()
        WHERE id = ${contentId}::uuid
      `;
    } else if (contentType === 'service') {
      await sql`
        UPDATE services
        SET status = ${newStatus}, updated_at = NOW()
        WHERE id = ${contentId}::uuid
      `;
    }

    // Log the moderation action
    try {
      await sql`
        INSERT INTO admin_logs (admin_id, action_type, target_entity_type, target_entity_id, details)
        VALUES (
          ${userId},
          'content_moderation',
          ${contentType},
          ${contentId},
          ${JSON.stringify({
            action: action,
            previous_status: 'draft',
            new_status: newStatus,
            reason: reason || null,
            moderated_at: new Date().toISOString(),
          })}
        )
      `;
    } catch (logError) {
      console.error('Failed to log moderation action:', logError);
    }

    // Send notification to content owner if rejected
    if (action === 'reject') {
      try {
        // Get content details and owner using parameterized query
        let contentInfo = null;
        if (contentType === 'product') {
          const [info] = await sql`
            SELECT seller_id, title FROM products WHERE id = ${contentId}::uuid
          `;
          contentInfo = info;
        } else {
          const [info] = await sql`
            SELECT seller_id, title FROM services WHERE id = ${contentId}::uuid
          `;
          contentInfo = info;
        }

        if (contentInfo) {
          // Send rejection notification message
          const rejectionMessage = `Your ${contentType} "${contentInfo.title}" was not approved for the following reason: ${reason}. Please review our community guidelines and resubmit with necessary changes.`;

          await sql`
            INSERT INTO messages (
              conversation_id,
              sender_user_id,
              receiver_user_id,
              message_text,
              is_read,
              created_at
            ) VALUES (
              ${'admin_moderation_' + contentInfo.seller_id},
              'admin',
              ${contentInfo.seller_id},
              ${rejectionMessage},
              false,
              NOW()
            )
          `;
        }
      } catch (notificationError) {
        console.error('Failed to send rejection notification:', notificationError);
      }
    }

    return Response.json({
      success: true,
      message: `Content ${action}d successfully`,
      action: action,
      newStatus: newStatus,
    });
  } catch (error) {
    console.error('Admin content moderation POST error:', error);
    return Response.json({ error: 'Failed to moderate content' }, { status: 500 });
  }
}
