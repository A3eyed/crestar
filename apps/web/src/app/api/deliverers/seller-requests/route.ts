// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// GET — list seller partnership requests
// Deliverers: see their sent requests
// Sellers: see incoming requests from deliverers
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id.toString();
    const url = new URL(request.url);
    const role = url.searchParams.get("role"); // 'deliverer' or 'seller'

    if (role === "seller") {
      // Seller sees incoming deliverer requests
      const requests = await sql(
        `SELECT dsr.*, 
          dp.full_name AS deliverer_name, 
          dp.phone_number AS deliverer_phone,
          dp.vehicle_type,
          dp.rating AS deliverer_rating,
          dp.total_deliveries,
          dp.successful_deliveries
        FROM deliverer_seller_requests dsr
        JOIN deliverer_profiles dp ON dp.user_id = dsr.deliverer_user_id
        WHERE dsr.seller_user_id = $1
        ORDER BY dsr.created_at DESC`,
        [userId],
      );

      return Response.json({ requests });
    }

    // Deliverer sees their sent requests + available sellers
    const myRequests = await sql(
      `SELECT dsr.*, 
        pp.full_name AS seller_name,
        pp.business_name,
        pp.seller_type,
        pp.city,
        pp.region
      FROM deliverer_seller_requests dsr
      JOIN professional_profiles pp ON pp.user_id = dsr.seller_user_id
      WHERE dsr.deliverer_user_id = $1
      ORDER BY dsr.created_at DESC`,
      [userId],
    );

    // Get list of available sellers the deliverer hasn't requested yet
    const availableSellers = await sql(
      `SELECT pp.user_id, pp.full_name, pp.business_name, pp.seller_type, pp.city, pp.region,
        (SELECT COUNT(*) FROM products WHERE seller_id = pp.user_id AND status = 'active')::int AS product_count,
        (SELECT COUNT(*) FROM seller_delivery_zones WHERE seller_user_id = pp.user_id AND is_active = true)::int AS delivery_zone_count
      FROM professional_profiles pp
      WHERE pp.verification_status = 'approved'
        AND pp.user_id NOT IN (
          SELECT seller_user_id FROM deliverer_seller_requests WHERE deliverer_user_id = $1
        )
      ORDER BY pp.business_name`,
      [userId],
    );

    return Response.json({ myRequests, availableSellers });
  } catch (error) {
    console.error("Get seller requests error:", error);
    return Response.json(
      { error: "Failed to fetch requests" },
      { status: 500 },
    );
  }
}

// POST — deliverer sends request to a seller
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id.toString();
    const body = await request.json();
    const { sellerUserId, message } = body;

    if (!sellerUserId) {
      return Response.json({ error: "Seller ID is required" }, { status: 400 });
    }

    // Verify user is an approved deliverer
    const deliverers = await sql(
      `SELECT * FROM deliverer_profiles WHERE user_id = $1 AND verification_status = 'approved'`,
      [userId],
    );

    if (deliverers.length === 0) {
      return Response.json(
        { error: "You must be an approved deliverer" },
        { status: 403 },
      );
    }

    const result = await sql(
      `INSERT INTO deliverer_seller_requests (deliverer_user_id, seller_user_id, message)
       VALUES ($1, $2, $3)
       ON CONFLICT (deliverer_user_id, seller_user_id) DO UPDATE SET
         status = 'pending',
         message = EXCLUDED.message,
         updated_at = NOW()
       RETURNING *`,
      [userId, sellerUserId, message || null],
    );

    return Response.json({ success: true, request: result[0] });
  } catch (error) {
    console.error("Send seller request error:", error);
    return Response.json({ error: "Failed to send request" }, { status: 500 });
  }
}

// PATCH — seller accepts or declines a deliverer request
export async function PATCH(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id.toString();
    const body = await request.json();
    const { requestId, action } = body; // action: 'accept' or 'decline'

    if (!requestId || !["accept", "decline"].includes(action)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const newStatus = action === "accept" ? "accepted" : "declined";

    const result = await sql(
      `UPDATE deliverer_seller_requests 
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND seller_user_id = $3
       RETURNING *`,
      [newStatus, requestId, userId],
    );

    if (result.length === 0) {
      return Response.json({ error: "Request not found" }, { status: 404 });
    }

    return Response.json({ success: true, request: result[0] });
  } catch (error) {
    console.error("Update seller request error:", error);
    return Response.json(
      { error: "Failed to update request" },
      { status: 500 },
    );
  }
}
