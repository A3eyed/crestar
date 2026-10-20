// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const {
      productType,
      title,
      description,
      media,
      price,
      stockQuantity,
      weightKg,
      isWholesale,
      wholesaleMinQuantity,
      prepTimeMinutes,
      spicyLevel,
      isTodaysSpecial,
      category,
      features,
      foodHubType,
      foodSubcategory,
      foodAttributes,
      drinkAttributes,
      sizingCategory,
      sizeSystem,
      sizeType,
      dimensionalSpecs,
      variants,
      creatorPromotionEnabled,
      affiliateCommissionRate,
    } = body;

    let effectiveProductType = productType;
    try {
      const [sellerFlags] = await sql`
        SELECT
          EXISTS (
            SELECT 1 FROM business_centers bc
            JOIN identity_accounts ia ON ia.identity_id = bc.identity_id
            WHERE ia.user_id = ${userId} AND bc.center_type = 'foodhub'
          ) OR EXISTS (
            SELECT 1 FROM professional_profiles pp
            WHERE pp.user_id = ${userId} AND pp.seller_type = 'food_beverage'
          ) AS is_food_seller,
          EXISTS (
            SELECT 1 FROM business_centers bc
            JOIN identity_accounts ia ON ia.identity_id = bc.identity_id
            WHERE ia.user_id = ${userId} AND bc.center_type = 'seller'
          ) OR EXISTS (
            SELECT 1 FROM professional_profiles pp
            WHERE pp.user_id = ${userId} AND pp.seller_type = 'physical_goods'
          ) AS is_goods_seller
      `;
      if (sellerFlags?.is_food_seller && !sellerFlags?.is_goods_seller) {
        effectiveProductType = 'food_beverage';
      }
    } catch (routeCheckError) {
      console.error('FoodHub seller check failed, using submitted productType:', routeCheckError);
    }

    const normalizedFoodHubType =
      effectiveProductType === 'food_beverage'
        ? String(foodHubType || category || '')
            .toLowerCase()
            .includes('drink')
          ? 'drinks'
          : foodHubType === 'drinks'
            ? 'drinks'
            : 'food'
        : null;

    // Drinks sell by the pack — minimum is 1 pack (not 5 loose pieces)
    let drinkAttrs = drinkAttributes || {};
    if (normalizedFoodHubType === 'drinks') {
      const pieces = parseInt(drinkAttrs.piecesPerPack, 10);
      if (!Number.isFinite(pieces) || pieces < 1) {
        return Response.json(
          { error: 'Drinks must specify how many pieces are in each pack' },
          { status: 400 },
        );
      }
      drinkAttrs = {
        soldBy: 'pack',
        piecesPerPack: pieces,
        unitLabel: drinkAttrs.unitLabel || 'pieces',
      };
    }
    const minOrderQty = 1;

    const [product] = await sql`
      INSERT INTO products (
        seller_id,
        product_type,
        title,
        description,
        media,
        price,
        stock_quantity,
        weight_kg,
        is_wholesale,
        wholesale_min_quantity,
        prep_time_minutes,
        spicy_level,
        is_todays_special,
        category,
        features,
        min_order_quantity,
        food_hub_type,
        food_subcategory,
        food_attributes,
        drink_attributes,
        sizing_category,
        size_system,
        size_type,
        dimensional_specs,
        creator_promotion_enabled,
        affiliate_commission_rate,
        status
      ) VALUES (
        ${userId},
        ${effectiveProductType},
        ${title},
        ${description},
        ${JSON.stringify(media)},
        ${parseFloat(price)},
        ${stockQuantity},
        ${weightKg},
        ${isWholesale || false},
        ${wholesaleMinQuantity},
        ${prepTimeMinutes},
        ${spicyLevel},
        ${isTodaysSpecial || false},
        ${category},
        ${JSON.stringify(features || [])},
        ${minOrderQty},
        ${normalizedFoodHubType},
        ${foodSubcategory || category || null},
        ${JSON.stringify(foodAttributes || {})},
        ${JSON.stringify(drinkAttrs || {})},
        ${sizingCategory || null},
        ${sizeSystem || null},
        ${sizeType || null},
        ${dimensionalSpecs ? JSON.stringify(dimensionalSpecs) : null},
        ${creatorPromotionEnabled === true},
        ${affiliateCommissionRate != null ? Math.min(50, Math.max(1, parseFloat(affiliateCommissionRate))) : 5},
        'active'
      )
      RETURNING *
    `;

    if (variants && variants.length > 0) {
      for (const variant of variants) {
        const basePrice = parseFloat(price);
        const variantPrice = parseFloat(variant.price);
        const priceAdjustment = variantPrice - basePrice;

        await sql`
          INSERT INTO product_variants (
            product_id,
            variant_type,
            variant_value,
            variant_image,
            variant_images,
            price_adjustment,
            stock_quantity,
            sizes,
            regional_standard,
            body_type
          ) VALUES (
            ${product.id},
            ${variant.variant_type || 'color'},
            ${variant.variant_value},
            ${variant.variant_images && variant.variant_images.length > 0 ? variant.variant_images[0] : null},
            ${JSON.stringify(variant.variant_images || [])},
            ${priceAdjustment},
            ${variant.stock_quantity},
            ${JSON.stringify(variant.sizes || [])},
            ${sizeSystem || null},
            ${sizeType && sizeType !== 'Regular' ? sizeType : null}
          )
        `;
      }
    }

    return Response.json({ success: true, product });
  } catch (error) {
    console.error('Create product error:', error);
    return Response.json({ error: 'Failed to create product listing' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');
    const productType = searchParams.get('productType');
    const category = searchParams.get('category');
    const foodHubType = searchParams.get('foodHubType');
    const foodSubcategory = searchParams.get('foodSubcategory');
    const isTodaysSpecial = searchParams.get('isTodaysSpecial');
    const promotable = searchParams.get('promotable');

    let queryString = `
      SELECT 
        p.*,
        COALESCE(u.username, SPLIT_PART(u.email, '@', 1)) as seller_username,
        COALESCE(u.display_name, u.name) as seller_display_name,
        COALESCE(
          NULLIF(TRIM(u.business_name), ''),
          NULLIF(TRIM(prof.business_name), ''),
          NULLIF(TRIM(bc.business_name), '')
        ) as seller_business_name,
        COALESCE(
          NULLIF(TRIM(u.business_name), ''),
          NULLIF(TRIM(prof.business_name), ''),
          NULLIF(TRIM(bc.business_name), ''),
          NULLIF(TRIM(u.display_name), ''),
          NULLIF(TRIM(u.name), ''),
          u.username
        ) as seller_name,
        prof.city as seller_city,
        prof.region as seller_region,
        u.username as seller_handle,
        u.is_verified as seller_verified
      FROM products p
      LEFT JOIN auth_users u ON p.seller_id = u.id::text
      LEFT JOIN professional_profiles prof ON prof.user_id = p.seller_id
      LEFT JOIN business_centers bc ON bc.identity_id = u.identity_id
      WHERE p.status = $1
    `;
    let values = ['active'];
    let paramIndex = 2;

    if (sellerId) {
      queryString += ` AND p.seller_id = $${paramIndex}`;
      values.push(sellerId);
      paramIndex++;
    }
    if (productType) {
      queryString += ` AND p.product_type = $${paramIndex}`;
      values.push(productType);
      paramIndex++;
    }
    if (foodHubType) {
      if (foodHubType === 'drinks') {
        queryString += ` AND (p.food_hub_type = $${paramIndex} OR (p.food_hub_type IS NULL AND LOWER(COALESCE(p.category, '')) IN ('drinks', 'smoothies & juices', 'water', 'soft drinks', 'juices', 'energy drinks', 'coffee', 'tea', 'plant-based milk', 'alcoholic', 'hot chocolate / other hot drinks')))`;
        values.push(foodHubType);
        paramIndex++;
      } else {
        queryString += ` AND (p.food_hub_type = $${paramIndex} OR (p.food_hub_type IS NULL AND LOWER(COALESCE(p.category, '')) NOT IN ('drinks', 'smoothies & juices', 'water', 'soft drinks', 'juices', 'energy drinks', 'coffee', 'tea', 'plant-based milk', 'alcoholic', 'hot chocolate / other hot drinks')))`;
        values.push(foodHubType);
        paramIndex++;
      }
    }
    if (foodSubcategory) {
      queryString += ` AND p.food_subcategory = $${paramIndex}`;
      values.push(foodSubcategory);
      paramIndex++;
    }
    if (category) {
      queryString += ` AND p.category = $${paramIndex}`;
      values.push(category);
      paramIndex++;
    }
    if (isTodaysSpecial === 'true') {
      queryString += ` AND p.is_todays_special = $${paramIndex}`;
      values.push(true);
      paramIndex++;
    }
    if (promotable === 'true') {
      queryString += ` AND p.creator_promotion_enabled = true AND (p.stock_quantity IS NULL OR p.stock_quantity > 0)`;
    }

    queryString += ' ORDER BY p.created_at DESC';

    const products = await sql(queryString, values);

    return Response.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    return Response.json({ error: 'Failed to get products' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      title,
      description,
      media,
      price,
      stockQuantity,
      weightKg,
      isWholesale,
      wholesaleMinQuantity,
      prepTimeMinutes,
      spicyLevel,
      isTodaysSpecial,
      category,
      features,
      foodHubType,
      foodSubcategory,
      foodAttributes,
      drinkAttributes,
      sizingCategory,
      sizeSystem,
      sizeType,
      dimensionalSpecs,
      sizes,
      creatorPromotionEnabled,
      affiliateCommissionRate,
    } = body;

    if (!id) {
      return Response.json({ error: 'Product ID required' }, { status: 400 });
    }

    const [existing] = await sql`SELECT seller_id FROM products WHERE id = ${id}`;
    if (!existing) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }
    if (existing.seller_id !== userId) {
      return Response.json({ error: 'You can only edit your own products' }, { status: 403 });
    }

    const normalizedFoodHubType =
      foodHubType === 'food' || foodHubType === 'drinks' ? foodHubType : null;

    const [updated] = await sql`
      UPDATE products SET
        title = ${title},
        description = ${description},
        media = ${JSON.stringify(media)},
        price = ${price},
        stock_quantity = ${stockQuantity},
        weight_kg = ${weightKg},
        is_wholesale = ${isWholesale || false},
        wholesale_min_quantity = ${wholesaleMinQuantity},
        prep_time_minutes = ${prepTimeMinutes},
        spicy_level = ${spicyLevel},
        is_todays_special = ${isTodaysSpecial || false},
        category = ${category},
        features = ${JSON.stringify(features || [])},
        food_hub_type = COALESCE(${normalizedFoodHubType}, food_hub_type),
        food_subcategory = COALESCE(${foodSubcategory || null}, food_subcategory),
        food_attributes = COALESCE(${foodAttributes ? JSON.stringify(foodAttributes) : null}, food_attributes),
        drink_attributes = COALESCE(${drinkAttributes ? JSON.stringify(drinkAttributes) : null}, drink_attributes),
        sizing_category = ${sizingCategory || null},
        size_system = ${sizeSystem || null},
        size_type = ${sizeType || null},
        dimensional_specs = ${dimensionalSpecs ? JSON.stringify(dimensionalSpecs) : null},
        creator_promotion_enabled = COALESCE(${creatorPromotionEnabled ?? null}, creator_promotion_enabled),
        affiliate_commission_rate = COALESCE(${affiliateCommissionRate != null ? Math.min(50, Math.max(1, parseFloat(affiliateCommissionRate))) : null}, affiliate_commission_rate),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (sizes && Array.isArray(sizes)) {
      await sql`
        UPDATE product_variants
        SET sizes = ${JSON.stringify(sizes)}
        WHERE product_id = ${id}
      `;
    }

    return Response.json({ success: true, product: updated });
  } catch (error) {
    console.error('Update product error:', error);
    return Response.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, creatorPromotionEnabled, affiliateCommissionRate } = body;

    if (!id) {
      return Response.json({ error: 'Product ID required' }, { status: 400 });
    }

    const [existing] = await sql`SELECT seller_id FROM products WHERE id = ${id}`;
    if (!existing) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }
    if (existing.seller_id !== userId) {
      return Response.json({ error: 'You can only edit your own products' }, { status: 403 });
    }

    const clampedRate =
      affiliateCommissionRate != null
        ? Math.min(50, Math.max(1, parseFloat(affiliateCommissionRate)))
        : null;

    const [updated] = await sql`
      UPDATE products SET
        creator_promotion_enabled = COALESCE(${
          typeof creatorPromotionEnabled === 'boolean' ? creatorPromotionEnabled : null
        }, creator_promotion_enabled),
        affiliate_commission_rate = COALESCE(${clampedRate}, affiliate_commission_rate),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return Response.json({ success: true, product: updated });
  } catch (error) {
    console.error('Update affiliate settings error:', error);
    return Response.json({ error: 'Failed to update affiliate settings' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return Response.json({ error: 'Product ID required' }, { status: 400 });
    }

    const [existing] = await sql`
      SELECT seller_id FROM products WHERE id = ${id}
    `;

    if (!existing) {
      return Response.json({ error: 'Product not found' }, { status: 404 });
    }

    if (existing.seller_id !== userId) {
      return Response.json({ error: 'You can only delete your own products' }, { status: 403 });
    }

    await sql`
      UPDATE products SET status = 'archived', updated_at = NOW()
      WHERE id = ${id}
    `;

    return Response.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    return Response.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
