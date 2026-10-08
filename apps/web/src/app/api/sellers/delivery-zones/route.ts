// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// GET /api/sellers/delivery-zones?sellerId=XX — get delivery zones for a seller
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const sellerId = url.searchParams.get("sellerId");

    if (!sellerId) {
      // If no sellerId, get zones for the authenticated seller
      const session = await auth();
      if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const userId = session.user.id.toString();

      const zones = await sql(
        `SELECT * FROM seller_delivery_zones WHERE seller_user_id = $1 AND is_active = true ORDER BY country, region_name, city_name`,
        [userId],
      );

      return Response.json({ zones });
    }

    // Public: get delivery zones for a specific seller
    const zones = await sql(
      `SELECT id, country, region_name, city_name, delivery_fee, is_free_delivery, estimated_time, currency 
       FROM seller_delivery_zones WHERE seller_user_id = $1 AND is_active = true ORDER BY country, region_name, city_name`,
      [sellerId],
    );

    return Response.json({ zones });
  } catch (error) {
    console.error("Get delivery zones error:", error);
    return Response.json(
      { error: "Failed to fetch delivery zones" },
      { status: 500 },
    );
  }
}

// POST /api/sellers/delivery-zones — add or update delivery zones
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id.toString();
    const body = await request.json();
    const { zones } = body; // Array of { country, regionName, cityName, deliveryFee, isFreeDelivery, estimatedTime, currency }

    if (!zones || !Array.isArray(zones) || zones.length === 0) {
      return Response.json(
        { error: "At least one delivery zone is required" },
        { status: 400 },
      );
    }

    // Clean up old inactive rows to prevent table bloat, then delete current active ones
    await sql(`DELETE FROM seller_delivery_zones WHERE seller_user_id = $1`, [
      userId,
    ]);

    // Insert new zones
    const insertedZones = [];
    for (const zone of zones) {
      const result = await sql(
        `INSERT INTO seller_delivery_zones (
          seller_user_id, 
          country,
          region_name, 
          city_name, 
          delivery_fee, 
          is_free_delivery, 
          estimated_time, 
          currency,
          is_active
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         RETURNING *`,
        [
          userId,
          zone.country || "GH",
          zone.regionName,
          zone.cityName,
          zone.isFreeDelivery ? 0 : zone.deliveryFee || 0,
          zone.isFreeDelivery || false,
          zone.estimatedTime || null,
          zone.currency || "GHS",
        ],
      );
      if (result[0]) insertedZones.push(result[0]);
    }

    return Response.json({ success: true, zones: insertedZones });
  } catch (error) {
    console.error("Update delivery zones error:", error);
    return Response.json(
      { error: "Failed to update delivery zones" },
      { status: 500 },
    );
  }
}

// DELETE /api/sellers/delivery-zones — remove a delivery zone
export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id.toString();
    const body = await request.json();
    const { zoneId } = body;

    await sql(
      `UPDATE seller_delivery_zones SET is_active = false WHERE id = $1 AND seller_user_id = $2`,
      [zoneId, userId],
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete delivery zone error:", error);
    return Response.json(
      { error: "Failed to delete delivery zone" },
      { status: 500 },
    );
  }
}
