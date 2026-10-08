// @ts-nocheck
import sql from "@/app/api/utils/sql";

/**
 * GET /api/creator/showcase?username=xxx
 * Returns creator profile + all products they've tagged in their shoppable videos.
 * This endpoint is PUBLIC — no auth required (shareable link).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.replace("@", "");

    if (!username) {
      return Response.json({ error: "Username is required" }, { status: 400 });
    }

    // Find the creator
    const users = await sql(
      `SELECT id, username, display_name, bio, profile_image, is_verified FROM auth_users WHERE LOWER(username) = LOWER($1) LIMIT 1`,
      [username],
    );

    if (users.length === 0) {
      return Response.json({ error: "Creator not found" }, { status: 404 });
    }

    const creator = users[0];

    // Check they're an approved creator
    const centerRows = await sql(
      `SELECT id FROM business_centers bc
       JOIN identity_accounts ia ON bc.identity_id = ia.identity_id
       WHERE ia.user_id = $1 AND bc.center_type = 'creator' AND bc.verification_status = 'approved'
       LIMIT 1`,
      [creator.id],
    );

    // Get all products tagged in this creator's videos
    const products = await sql(
      `SELECT DISTINCT p.id, p.title, p.price, p.media, p.seller_currency, p.status
       FROM products p
       JOIN video_product_tags vpt ON vpt.product_id = p.id
       JOIN videos v ON vpt.video_id = v.id
       WHERE v.creator_user_id = $1
         AND p.status = 'active'
         AND v.status = 'active'
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [creator.id.toString()],
    );

    return Response.json({
      success: true,
      creator: {
        id: creator.id,
        username: creator.username,
        display_name: creator.display_name,
        bio: creator.bio,
        profile_image: creator.profile_image,
        is_verified: creator.is_verified,
        is_creator: centerRows.length > 0,
      },
      products: products.map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        media: p.media,
        seller_currency: p.seller_currency || "GHS",
        status: p.status,
      })),
    });
  } catch (error) {
    console.error("Creator showcase error:", error);
    return Response.json({ error: "Failed to load showcase" }, { status: 500 });
  }
}
