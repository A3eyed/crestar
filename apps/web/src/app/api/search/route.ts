// @ts-nocheck
import sql from "@/app/api/utils/sql";

// GET /api/search?q=query&type=all|products|users|videos
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";
    const type = url.searchParams.get("type") || "all";

    if (!query.trim() || query.trim().length < 1) {
      return Response.json({
        products: [],
        services: [],
        users: [],
        videos: [],
      });
    }

    const searchTerm = `%${query.trim()}%`;
    let products = [];
    let services = [];
    let users = [];
    let videos = [];

    if (type === "all" || type === "videos") {
      videos = await sql(
        `SELECT v.id, v.video_url, v.thumbnail_url, v.caption, v.views_count, v.likes_count,
          v.creator_user_id, v.created_at,
          u.username, u.display_name, u.profile_image, u.is_verified,
          pp.business_name
        FROM videos v
        LEFT JOIN auth_users u ON u.id::text = v.creator_user_id
        LEFT JOIN professional_profiles pp ON pp.user_id = v.creator_user_id
        WHERE v.status = 'active'
          AND (
            LOWER(v.caption) LIKE LOWER($1)
            OR LOWER(u.username) LIKE LOWER($1)
            OR LOWER(u.display_name) LIKE LOWER($1)
            OR LOWER(pp.business_name) LIKE LOWER($1)
          )
        ORDER BY v.created_at DESC
        LIMIT 15`,
        [searchTerm],
      );
    }

    if (type === "all" || type === "products") {
      products = await sql(
        `SELECT p.id, p.title, p.price, p.media, p.product_type, p.category, p.seller_id,
          pp.business_name AS seller_name, pp.city AS seller_city,
          COALESCE(u.username, SPLIT_PART(u.email, '@', 1)) AS seller_username,
          COALESCE(u.display_name, u.name) AS seller_display_name
        FROM products p
        LEFT JOIN professional_profiles pp ON pp.user_id = p.seller_id
        LEFT JOIN auth_users u ON u.id::text = p.seller_id
        WHERE p.status = 'active'
          AND (
            LOWER(p.title) LIKE LOWER($1)
            OR LOWER(p.description) LIKE LOWER($1)
            OR LOWER(p.category) LIKE LOWER($1)
          )
        ORDER BY p.created_at DESC
        LIMIT 20`,
        [searchTerm],
      );

      services = await sql(
        `SELECT s.id, s.title, s.basic_price AS price, s.media, s.category, s.seller_id,
          pp.business_name AS seller_name,
          COALESCE(u.username, SPLIT_PART(u.email, '@', 1)) AS seller_username,
          COALESCE(u.display_name, u.name) AS seller_display_name
        FROM services s
        LEFT JOIN professional_profiles pp ON pp.user_id = s.seller_id
        LEFT JOIN auth_users u ON u.id::text = s.seller_id
        WHERE s.status = 'active'
          AND (
            LOWER(s.title) LIKE LOWER($1)
            OR LOWER(s.description) LIKE LOWER($1)
            OR LOWER(s.category) LIKE LOWER($1)
          )
        ORDER BY s.created_at DESC
        LIMIT 10`,
        [searchTerm],
      );
    }

    if (type === "all" || type === "users") {
      users = await sql(
        `SELECT u.id, u.username, u.display_name, u.name, u.email, u.profile_image, u.bio, u.is_verified,
          pp.business_name, pp.seller_type, pp.city, pp.region,
          (SELECT COUNT(*) FROM products WHERE seller_id = u.id::text AND status = 'active')::int AS product_count
        FROM auth_users u
        LEFT JOIN professional_profiles pp ON pp.user_id = u.id::text
        WHERE (
          LOWER(u.username) LIKE LOWER($1)
          OR LOWER(u.display_name) LIKE LOWER($1)
          OR LOWER(u.name) LIKE LOWER($1)
          OR LOWER(u.email) LIKE LOWER($1)
          OR LOWER(pp.business_name) LIKE LOWER($1)
        )
        ORDER BY u.is_verified DESC, u.id DESC
        LIMIT 15`,
        [searchTerm],
      );
    }

    return Response.json({ products, services, users, videos });
  } catch (error) {
    console.error("Search error:", error);
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}
