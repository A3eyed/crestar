// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// GET - List active live sessions (for viewers) or get a specific session
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("id");

    if (sessionId) {
      // Get specific session
      const rows = await sql`
        SELECT ls.*, 
          au.username, au.display_name, au.profile_image, au.is_verified,
          pp.business_name, pp.seller_type
        FROM live_sessions ls
        LEFT JOIN auth_users au ON au.id::text = ls.host_user_id
        LEFT JOIN professional_profiles pp ON pp.user_id = ls.host_user_id
        WHERE ls.id = ${sessionId}
      `;

      if (rows.length === 0) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }

      // Get featured products for this session
      const products = await sql`
        SELECT lp.*, 
          COALESCE(p.title, s.title) as product_title,
          COALESCE(p.price, s.basic_price) as product_price,
          COALESCE(p.media, s.media) as product_media,
          COALESCE(p.description, s.description) as product_description,
          COALESCE(p.stock_quantity, 999) as stock_quantity,
          CASE WHEN lp.product_id IS NOT NULL THEN 'product' ELSE 'service' END as item_type
        FROM live_session_products lp
        LEFT JOIN products p ON p.id = lp.product_id
        LEFT JOIN services s ON s.id = lp.service_id
        WHERE lp.session_id = ${sessionId}
        ORDER BY lp.is_featured DESC, lp.created_at DESC
      `;

      return Response.json({ session: rows[0], products });
    }

    // List active sessions
    const sessions = await sql`
      SELECT ls.*, 
        au.username, au.display_name, au.profile_image, au.is_verified,
        pp.business_name, pp.seller_type
      FROM live_sessions ls
      LEFT JOIN auth_users au ON au.id::text = ls.host_user_id
      LEFT JOIN professional_profiles pp ON pp.user_id = ls.host_user_id
      WHERE ls.status = 'live'
      ORDER BY ls.viewer_count DESC, ls.started_at DESC
      LIMIT 50
    `;

    return Response.json({ sessions });
  } catch (error) {
    console.error("Get live sessions error:", error);
    return Response.json(
      { error: "Failed to get sessions", details: error.message },
      { status: 500 },
    );
  }
}

// POST - Create a new live session (sellers only)
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id.toString();
    const body = await request.json();
    const { title, description, thumbnail } = body;

    // Check if user is a seller
    const sellerProfile = await sql(
      `SELECT id, seller_type, verification_status FROM professional_profiles WHERE user_id = $1`,
      [userId],
    );

    if (
      sellerProfile.length === 0 ||
      sellerProfile[0].verification_status !== "approved"
    ) {
      return Response.json(
        { error: "Only approved sellers can go live" },
        { status: 403 },
      );
    }

    // End any existing active session for this user
    await sql(
      `UPDATE live_sessions SET status = 'ended', ended_at = NOW() WHERE host_user_id = $1 AND status = 'live'`,
      [userId],
    );

    // Create new session
    const sessionTitle = title || "Live Shopping";

    const rows = await sql(
      `INSERT INTO live_sessions (host_user_id, title, description, thumbnail, status, started_at)
       VALUES ($1, $2, $3, $4, 'live', NOW())
       RETURNING *`,
      [userId, sessionTitle, description || null, thumbnail || null],
    );

    return Response.json({ session: rows[0] });
  } catch (error) {
    console.error("Create live session error:", error);
    return Response.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}

// PUT - Update session (end, update viewer count, feature product)
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id.toString();
    const body = await request.json();
    const { action, sessionId, productId, serviceId } = body;

    if (action === "end") {
      await sql(
        `UPDATE live_sessions SET status = 'ended', ended_at = NOW() WHERE id = $1 AND host_user_id = $2`,
        [sessionId, userId],
      );
      return Response.json({ success: true });
    }

    if (action === "feature_product") {
      // Unfeature all products first
      await sql(
        `UPDATE live_session_products SET is_featured = false WHERE session_id = $1`,
        [sessionId],
      );

      // Check if product is already in session products
      const itemCol = productId ? "product_id" : "service_id";
      const itemVal = productId || serviceId;

      const existing = await sql(
        `SELECT id FROM live_session_products WHERE session_id = $1 AND ${itemCol} = $2`,
        [sessionId, itemVal],
      );

      if (existing.length > 0) {
        // Feature existing product
        await sql(
          `UPDATE live_session_products SET is_featured = true WHERE session_id = $1 AND ${itemCol} = $2`,
          [sessionId, itemVal],
        );
      } else {
        // Add and feature new product
        if (productId) {
          await sql(
            `INSERT INTO live_session_products (session_id, product_id, is_featured) VALUES ($1, $2, true)`,
            [sessionId, productId],
          );
        } else {
          await sql(
            `INSERT INTO live_session_products (session_id, service_id, is_featured) VALUES ($1, $2, true)`,
            [sessionId, serviceId],
          );
        }
      }

      return Response.json({ success: true });
    }

    if (action === "unfeature_product") {
      await sql(
        `UPDATE live_session_products SET is_featured = false WHERE session_id = $1`,
        [sessionId],
      );
      return Response.json({ success: true });
    }

    if (action === "increment_viewers") {
      await sql(
        `UPDATE live_sessions SET viewer_count = viewer_count + 1 WHERE id = $1`,
        [sessionId],
      );
      return Response.json({ success: true });
    }

    if (action === "decrement_viewers") {
      await sql(
        `UPDATE live_sessions SET viewer_count = GREATEST(viewer_count - 1, 0) WHERE id = $1`,
        [sessionId],
      );
      return Response.json({ success: true });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Update live session error:", error);
    return Response.json(
      { error: "Failed to update session" },
      { status: 500 },
    );
  }
}
