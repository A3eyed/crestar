// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { resolveUserId } from "@/app/api/utils/auth";

const NOT_DELIVERED = ["paid", "preparing", "ready_for_pickup", "in_transit"];

async function currentUserId(request) {
  const resolved = await resolveUserId(request).catch(() => null);
  if (resolved) return String(resolved);
  const session = await auth();
  return session?.user?.id ? String(session.user.id) : null;
}

export async function GET(request) {
  try {
    const sellerId = await currentUserId(request);
    if (!sellerId)
      return Response.json({ error: "Unauthorized" }, { status: 401 });

    const pendingOrders = await sql(
      `SELECT id, order_number, item_title, seller_payout, status, created_at
       FROM orders
       WHERE seller_id = $1
         AND status = ANY($2::text[])
       ORDER BY created_at DESC`,
      [sellerId, NOT_DELIVERED]
    );
    const totalPending = pendingOrders.reduce(
      (sum, order) => sum + Number(order.seller_payout || 0),
      0
    );

    return Response.json({
      pendingOrders,
      totalPending: Math.round(totalPending * 100) / 100,
      message:
        totalPending > 0
          ? `${pendingOrders.length} paid order${
              pendingOrders.length === 1 ? "" : "s"
            } not delivered yet. The 3% fee is already removed. This moves to available only after the buyer confirms delivery with the PIN.`
          : "No undelivered paid orders",
    });
  } catch (error) {
    console.error("Pending earnings error:", error);
    return Response.json(
      { error: "Failed to fetch pending earnings" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return Response.json(
    {
      error:
        "Undelivered orders are not released on a timer. Confirm the delivery PIN to move the earning to available.",
    },
    { status: 405 }
  );
}