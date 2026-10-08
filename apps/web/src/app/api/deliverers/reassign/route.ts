// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// POST /api/deliverers/reassign — reassign pending deliveries that haven't been accepted within timeout
// Can be called by: system/cron, seller, or admin
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { assignmentId, timeoutMinutes = 15 } = body;

    let assignmentsToReassign = [];

    if (assignmentId) {
      // Reassign a specific assignment
      assignmentsToReassign = await sql(
        `SELECT da.*, o.seller_id
         FROM delivery_assignments da
         JOIN orders o ON o.id = da.order_id
         WHERE da.id = $1 AND da.status = 'pending'`,
        [assignmentId],
      );
    } else {
      // Find all pending assignments older than the timeout
      assignmentsToReassign = await sql(
        `SELECT da.*, o.seller_id
         FROM delivery_assignments da
         JOIN orders o ON o.id = da.order_id
         WHERE da.status = 'pending'
           AND da.created_at < NOW() - INTERVAL '1 minute' * $1`,
        [timeoutMinutes],
      );
    }

    const reassigned = [];

    for (const assignment of assignmentsToReassign) {
      const currentDeliverer = assignment.deliverer_user_id;

      // Find another accepted deliverer for this seller (not the current one)
      let excludeClause = "";
      const params = [assignment.seller_id];

      if (currentDeliverer) {
        excludeClause = "AND dsr.deliverer_user_id != $2";
        params.push(currentDeliverer);
      }

      const nextDeliverers = await sql(
        `SELECT dsr.deliverer_user_id, dp.full_name, dp.rating
         FROM deliverer_seller_requests dsr
         JOIN deliverer_profiles dp ON dp.user_id = dsr.deliverer_user_id
         WHERE dsr.seller_user_id = $1
           AND dsr.status = 'accepted'
           AND dp.verification_status = 'approved'
           AND dp.is_available = true
           ${excludeClause}
         ORDER BY dp.rating DESC
         LIMIT 1`,
        params,
      );

      if (nextDeliverers.length > 0) {
        const nextDeliverer = nextDeliverers[0];

        // Update assignment with new deliverer, reset timestamp
        await sql(
          `UPDATE delivery_assignments 
           SET deliverer_user_id = $1, status = 'pending', created_at = NOW()
           WHERE id = $2`,
          [nextDeliverer.deliverer_user_id, assignment.id],
        );

        // Update order
        await sql(`UPDATE orders SET deliverer_id = $1 WHERE id = $2`, [
          nextDeliverer.deliverer_user_id,
          assignment.order_id,
        ]);

        reassigned.push({
          assignmentId: assignment.id,
          previousDeliverer: currentDeliverer,
          newDeliverer: nextDeliverer.deliverer_user_id,
          newDelivererName: nextDeliverer.full_name,
        });
      } else {
        // No other deliverer available — mark as unassigned
        await sql(
          `UPDATE delivery_assignments 
           SET deliverer_user_id = NULL, status = 'pending'
           WHERE id = $1`,
          [assignment.id],
        );

        await sql(`UPDATE orders SET deliverer_id = NULL WHERE id = $1`, [
          assignment.order_id,
        ]);

        reassigned.push({
          assignmentId: assignment.id,
          previousDeliverer: currentDeliverer,
          newDeliverer: null,
          note: "No available deliverer found",
        });
      }
    }

    return Response.json({
      success: true,
      reassignedCount: reassigned.length,
      reassigned,
    });
  } catch (error) {
    console.error("Reassign delivery error:", error);
    return Response.json(
      { error: "Failed to reassign deliveries" },
      { status: 500 },
    );
  }
}
