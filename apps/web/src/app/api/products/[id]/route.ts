// @ts-nocheck
import sql from '@/app/api/utils/sql';

/**
 * Resolve a seller's registered business name from EITHER profile table.
 * business_centers links to the user through identity_accounts (canonical),
 * with auth_users.identity_id kept as a legacy fallback.
 */
const BUSINESS_CENTER_LATERAL = (sellerColumn) => `
  LEFT JOIN LATERAL (
    SELECT b.business_name, b.paystack_subaccount_code
    FROM business_centers b
    WHERE b.identity_id IN (
      SELECT identity_id FROM identity_accounts WHERE user_id = ${sellerColumn}
      UNION
      SELECT identity_id FROM auth_users WHERE id = ${sellerColumn} AND identity_id IS NOT NULL
    )
    LIMIT 1
  ) bc ON true
`;

/**
 * Get Product by ID - Dynamic Product Detail Endpoint
 *
 * Returns full product details including seller information and variants
 * for the ProductDetailView screen.
 */
export async function GET(request, { params }) {
  try {
    // params must be awaited — without this, id was undefined and every
    // tagged product in the feed showed "Product Unavailable"
    const { id } = await params;

    if (!id) {
      return Response.json({ error: 'Product ID required' }, { status: 400 });
    }

    // Fetch product with seller details AND business name.
    // LEFT JOIN — a missing auth_users profile row must not hide the product.
    const [product] = await sql(
      `SELECT 
        p.*,
        u.username as seller_username,
        u.display_name as seller_display_name,
        u.name as seller_name,
        u.email as seller_email,
        u.is_verified as seller_is_verified,
        u.profile_image as seller_profile_image,
        COALESCE(prof.paystack_subaccount_code, bc.paystack_subaccount_code) as paystack_subaccount_code,
        COALESCE(prof.business_name, bc.business_name) as seller_business_name
      FROM products p
      LEFT JOIN auth_users u ON p.seller_id = u.id::text
      LEFT JOIN professional_profiles prof ON prof.user_id = p.seller_id
      ${BUSINESS_CENTER_LATERAL('p.seller_id')}
      WHERE p.id = $1 AND p.status = 'active'`,
      [id]
    );

    if (!product) {
      // Fallback: the tagged item may be a SERVICE (creators can tag services too)
      const [service] = await sql(
        `SELECT 
          s.*,
          u.username as seller_username,
          u.display_name as seller_display_name,
          u.name as seller_name,
          u.email as seller_email,
          u.is_verified as seller_is_verified,
          u.profile_image as seller_profile_image,
          COALESCE(prof.paystack_subaccount_code, bc.paystack_subaccount_code) as paystack_subaccount_code,
          COALESCE(prof.business_name, bc.business_name) as seller_business_name
        FROM services s
        LEFT JOIN auth_users u ON s.seller_id = u.id::text
        LEFT JOIN professional_profiles prof ON prof.user_id = s.seller_id
        ${BUSINESS_CENTER_LATERAL('s.seller_id')}
        WHERE s.id = $1 AND s.status = 'active'`,
        [id]
      );

      if (!service) {
        return Response.json({ error: 'Product not found' }, { status: 404 });
      }

      // Normalize the service into the product response shape
      let svcMedia = service.media;
      if (typeof svcMedia === 'string') {
        try {
          svcMedia = JSON.parse(svcMedia);
        } catch (e) {
          svcMedia = [svcMedia];
        }
      }

      const svcUsername =
        service.seller_username ||
        (service.seller_email ? service.seller_email.split('@')[0] : 'seller');
      const svcDisplayName = service.seller_display_name || service.seller_name || svcUsername;

      return Response.json({
        product: {
          id: service.id,
          title: service.title,
          description: service.description,
          media: svcMedia || [],
          price: parseFloat(service.basic_price || 0),
          stockQuantity: null,
          category: service.category,
          productType: 'service',
          features: [],
          minOrderQuantity: 1,
          status: service.status,
          createdAt: service.created_at,
          isService: true,
          pricingTiers: {
            basic: { price: service.basic_price, description: service.basic_description },
            standard: { price: service.standard_price, description: service.standard_description },
            premium: { price: service.premium_price, description: service.premium_description },
          },
          seller: {
            id: service.seller_id,
            username: svcUsername,
            displayName: service.seller_business_name || svcDisplayName,
            businessName: service.seller_business_name,
            isVerified: service.seller_is_verified || false,
            profileImage: service.seller_profile_image,
            paystackSubaccountCode: service.paystack_subaccount_code,
          },
        },
        variants: [],
      });
    }

    // Parse media if it's a JSON string
    let media = product.media;
    if (typeof media === 'string') {
      try {
        media = JSON.parse(media);
      } catch (e) {
        media = [media];
      }
    }

    // Parse features if it's a JSON string
    let features = product.features || [];
    if (typeof features === 'string') {
      try {
        features = JSON.parse(features);
      } catch (e) {
        features = [];
      }
    }

    // Fetch product variants
    const variants = await sql`
      SELECT *
      FROM product_variants
      WHERE product_id = ${id}
      ORDER BY variant_type, variant_value
    `;

    // Build seller object with business name and email fallback
    const sellerUsername =
      product.seller_username ||
      (product.seller_email ? product.seller_email.split('@')[0] : 'seller');
    const sellerDisplayName = product.seller_display_name || product.seller_name || sellerUsername;

    const seller = {
      id: product.seller_id,
      username: sellerUsername,
      displayName: product.seller_business_name || sellerDisplayName,
      businessName: product.seller_business_name,
      isVerified: product.seller_is_verified || false,
      profileImage: product.seller_profile_image,
      paystackSubaccountCode: product.paystack_subaccount_code,
    };

    // Return complete product data
    return Response.json({
      product: {
        id: product.id,
        title: product.title,
        description: product.description,
        media,
        price: parseFloat(product.price),
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
        minOrderQuantity: product.min_order_quantity,
        status: product.status,
        createdAt: product.created_at,
        seller,
      },
      variants: variants || [], // Include variants in response
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    return Response.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}
