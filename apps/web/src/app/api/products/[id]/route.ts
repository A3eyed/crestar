// @ts-nocheck
import sql from '@/app/api/utils/sql';

/**
 * GET /api/products/:id
 * Full product (or service) detail for the product page.
 * Kept intentionally simple — complex lateral joins were failing in production
 * and made every product open as "Product not found".
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!id) {
      return Response.json({ error: 'Product ID required' }, { status: 400 });
    }

    let product = null;
    try {
      const rows = await sql`
        SELECT
          p.*,
          u.username AS seller_username,
          u.display_name AS seller_display_name,
          u.name AS seller_name,
          u.email AS seller_email,
          u.is_verified AS seller_is_verified,
          u.profile_image AS seller_profile_image
        FROM products p
        LEFT JOIN auth_users u ON p.seller_id = u.id::text
        WHERE p.id = ${id}
          AND (p.status = 'active' OR p.status IS NULL)
        LIMIT 1
      `;
      product = rows?.[0] || null;
    } catch (e) {
      console.error('[products/id] product query failed', e?.message || e);
      return Response.json({ error: 'Failed to fetch product' }, { status: 500 });
    }

    if (!product) {
      // Fallback: tagged services
      try {
        const rows = await sql`
          SELECT
            s.*,
            u.username AS seller_username,
            u.display_name AS seller_display_name,
            u.name AS seller_name,
            u.email AS seller_email,
            u.is_verified AS seller_is_verified,
            u.profile_image AS seller_profile_image
          FROM services s
          LEFT JOIN auth_users u ON s.seller_id = u.id::text
          WHERE s.id = ${id}
            AND (s.status = 'active' OR s.status IS NULL)
          LIMIT 1
        `;
        const service = rows?.[0];
        if (!service) {
          return Response.json({ error: 'Product not found' }, { status: 404 });
        }

        let svcMedia = service.media;
        if (typeof svcMedia === 'string') {
          try {
            svcMedia = JSON.parse(svcMedia);
          } catch {
            svcMedia = svcMedia ? [svcMedia] : [];
          }
        }

        const svcUsername =
          service.seller_username ||
          (service.seller_email ? service.seller_email.split('@')[0] : 'seller');

        return Response.json({
          product: {
            id: service.id,
            title: service.title,
            description: service.description,
            media: Array.isArray(svcMedia) ? svcMedia : [],
            price: parseFloat(service.basic_price || 0),
            stockQuantity: null,
            category: service.category,
            productType: 'service',
            features: [],
            minOrderQuantity: 1,
            status: service.status,
            createdAt: service.created_at,
            isService: true,
            seller_id: service.seller_id,
            seller_currency: 'GHS',
            seller: {
              id: service.seller_id,
              username: svcUsername,
              displayName: service.seller_display_name || service.seller_name || svcUsername,
              businessName: null,
              isVerified: service.seller_is_verified || false,
              profileImage: service.seller_profile_image,
            },
          },
          variants: [],
        });
      } catch (e) {
        console.error('[products/id] service fallback failed', e?.message || e);
        return Response.json({ error: 'Product not found' }, { status: 404 });
      }
    }

    let media = product.media;
    if (typeof media === 'string') {
      try {
        media = JSON.parse(media);
      } catch {
        media = media ? [media] : [];
      }
    }
    if (!Array.isArray(media)) media = [];

    let features = product.features || [];
    if (typeof features === 'string') {
      try {
        features = JSON.parse(features);
      } catch {
        features = [];
      }
    }

    let variants = [];
    try {
      variants = await sql`
        SELECT *
        FROM product_variants
        WHERE product_id = ${id}
        ORDER BY variant_type, variant_value
      `;
    } catch (e) {
      // Table may not exist yet — product still opens without variants
      console.warn('[products/id] variants unavailable', e?.message || e);
      variants = [];
    }

    // Optional business name (never fail the whole response)
    let businessName = null;
    try {
      const [bc] = await sql`
        SELECT bc.business_name
        FROM business_centers bc
        JOIN identity_accounts ia ON ia.identity_id = bc.identity_id
        WHERE ia.user_id = ${product.seller_id}
        LIMIT 1
      `;
      businessName = bc?.business_name || null;
    } catch {
      businessName = null;
    }

    const sellerUsername =
      product.seller_username ||
      (product.seller_email ? product.seller_email.split('@')[0] : 'seller');
    const sellerDisplayName =
      businessName || product.seller_display_name || product.seller_name || sellerUsername;

    return Response.json({
      product: {
        id: product.id,
        title: product.title,
        description: product.description,
        media,
        price: parseFloat(product.price) || 0,
        stockQuantity: product.stock_quantity,
        weightKg: product.weight_kg,
        isWholesale: product.is_wholesale,
        wholesaleMinQuantity: product.wholesale_min_quantity,
        prepTimeMinutes: product.prep_time_minutes,
        spicyLevel: product.spicy_level,
        isTodaysSpecial: product.is_todays_special,
        category: product.category,
        productType: product.product_type,
        features,
        minOrderQuantity: product.min_order_quantity || 1,
        status: product.status,
        createdAt: product.created_at,
        seller_id: product.seller_id,
        seller_currency: product.seller_currency || 'GHS',
        seller: {
          id: product.seller_id,
          username: sellerUsername,
          displayName: sellerDisplayName,
          businessName,
          isVerified: product.seller_is_verified || false,
          profileImage: product.seller_profile_image,
        },
      },
      variants: variants || [],
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    return Response.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}
