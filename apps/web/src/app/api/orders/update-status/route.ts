// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { resolveUserId } from "@/app/api/utils/auth";
import { sendOrderStatusUpdate } from "@/app/api/utils/notification-service";

// Valid order status transitions: current → allowed next statuses
const VALID_TRANSITIONS = {
  pending_payment: ["paid", "cancelled"],
  paid: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["in_transit", "delivered", "cancelled"],
  in_transit: ["delivered", "cancelled"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
  refunded: [],
};

export async function POST(request) {
  try {
    const body = await request.json();

    // Get authenticated user (supports both web and mobile)
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    const { orderId, status } = body;

    if (!orderId || !status) {
      return Response.json(
        { error: "orderId and status are required" },
        { status: 400 },
      );
    }

    // Fetch order
    const [order] = await sql`
      SELECT * FROM orders WHERE id = ${orderId}
    `;

    if (!order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify user is the seller
    if (userId !== order.seller_id) {
      return Response.json(
        { error: "Only the seller can update order status" },
        { status: 403 },
      );
    }

    // Validate status transition
    const allowedNext = VALID_TRANSITIONS[order.status] || [];
    if (!allowedNext.includes(status)) {
      return Response.json(
        {
          error: `Cannot change status from '${order.status}' to '${status}'`,
          current_status: order.status,
          allowed_transitions: allowedNext,
        },
        { status: 400 },
      );
    }

    // Update order status — stamp timestamps for key transitions
    let updatedOrder;
    if (status === "delivered") {
      [updatedOrder] = await sql`
        UPDATE orders
        SET 
          status = ${status},
          delivered_at = NOW(),
          escrow_release_at = NOW() + INTERVAL '48 hours',
          updated_at = NOW()
        WHERE id = ${orderId}
        RETURNING *
      `;
    } else {
      [updatedOrder] = await sql`
        UPDATE orders
        SET 
          status = ${status},
          updated_at = NOW()
        WHERE id = ${orderId}
        RETURNING *
      `;
    }

    // Send email notification to buyer about status change
    try {
      await sendOrderStatusUpdate(orderId, status);
      console.log(
        `[order-status] Email notification sent for order ${orderId}`,
      );
    } catch (emailError) {
      // Don't fail the request if email fails — just log it
      console.error("[order-status] Email notification failed:", emailError);
    }

    return Response.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    return Response.json(
      { error: "Failed to update order status" },
      { status: 500 },
    );
  }
}

// Get orders (buyer or seller view)
export async function GET(request) {
  try {
    // Get authenticated user (supports both web and mobile)
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role"); // 'buyer' or 'seller'
    const status = searchParams.get("status");

    // Build query string and values array
    let queryString;
    let values = [userId];
    let paramIndex = 2;

    if (role === "seller") {
      queryString = "SELECT * FROM orders WHERE seller_id = $1";
    } else {
      queryString = "SELECT * FROM orders WHERE buyer_id = $1";
    }

    if (status) {
      queryString += ` AND status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    queryString += " ORDER BY created_at DESC";

    const orders = await sql(queryString, values);

    return Response.json({ orders });
  } catch (error) {
    console.error("Get orders error:", error);
    return Response.json({ error: "Failed to get orders" }, { status: 500 });
  }
}
