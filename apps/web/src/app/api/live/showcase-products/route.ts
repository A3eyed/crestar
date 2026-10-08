// @ts-nocheck
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// GET - Get products available for a host's live shopping session
// Sellers get their own products, Creators get their showcase items
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id.toString();
    const url = new URL(request.url);
    const hostId = url.searchParams.get("hostId") || userId;

    // Check if host is a seller
    const [sellerProfile] = await sql(
      `SELECT id, seller_type FROM professional_profiles WHERE user_id = $1 AND verification_status = 'approved'`,
      [hostId],
    );

    // Check if host is a creator (via business_centers)
    let creatorProfile = null;
    const creatorRows = await sql(
      `SELECT bc.id FROM business_centers bc
       JOIN identity_accounts ia ON bc.identity_id = ia.identity_id
       JOIN auth_users u ON ia.user_id = u.id
       WHERE u.id::text = $1 AND bc.center_type = 'creator' AND bc.verification_status = 'approved'
       LIMIT 1`,
      [hostId],
    );
    if (creatorRows.length > 0) {
      creatorProfile = creatorRows[0];
    }

    let products = [];

    if (sellerProfile) {
      // Sellers: get their own products
      products = await sql(
        `SELECT id, title, description, media, price, stock_quantity, product_type, category,
          'product' as item_type
        FROM products 
        WHERE seller_id = $1 AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 50`,
        [hostId],
      );

      // Also get their services
      const services = await sql(
        `SELECT id, title, description, media, basic_price as price, 
          999 as stock_quantity, 'services' as product_type, category,
          'service' as item_type
        FROM services
        WHERE seller_id = $1 AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 20`,
        [hostId],
      );

      products = [...products, ...services];
    } else if (creatorProfile) {
      // Creators: get products they've tagged in their videos
      const taggedProducts = await sql(
        `SELECT DISTINCT p.id, p.title, p.description, p.media, p.price, p.stock_quantity, p.product_type, p.category,
          'product' as item_type,
          pp_seller.business_name as seller_name
        FROM products p
        JOIN video_product_tags vpt ON vpt.product_id = p.id
        JOIN videos v ON vpt.video_id = v.id
        LEFT JOIN professional_profiles pp_seller ON pp_seller.user_id = p.seller_id
        WHERE v.creator_user_id = $1 AND p.status = 'active' AND v.status = 'active'
        ORDER BY p.created_at DESC
        LIMIT 50`,
        [hostId],
      );

      const taggedServices = await sql(
        `SELECT DISTINCT s.id, s.title, s.description, s.media, s.basic_price as price,
          999 as stock_quantity, 'services' as product_type, s.category,
          'service' as item_type,
          pp_seller.business_name as seller_name
        FROM services s
        JOIN video_product_tags vpt ON vpt.service_id = s.id
        JOIN videos v ON vpt.video_id = v.id
        LEFT JOIN professional_profiles pp_seller ON pp_seller.user_id = s.seller_id
        WHERE v.creator_user_id = $1 AND s.status = 'active' AND v.status = 'active'
        ORDER BY s.created_at DESC
        LIMIT 20`,
        [hostId],
      );

      products = [...taggedProducts, ...taggedServices];
    }

    return Response.json({
      products,
      isSeller: !!sellerProfile,
      isCreator: !!creatorProfile,
    });
  } catch (error) {
    console.error("Get showcase products error:", error);
    return Response.json({ error: "Failed to get products" }, { status: 500 });
  }
}
