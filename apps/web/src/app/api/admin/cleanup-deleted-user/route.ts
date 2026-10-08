import sql from '@/app/api/utils/sql';
import { auth } from '@/lib/auth';

// GET: Find and clean up orphaned products/services from deleted user accounts
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check admin privileges via role
    const adminCheck = await sql`
      SELECT role FROM "user"
      WHERE id = ${session.user.id} AND role IN ('admin', 'owner', 'moderator')
    `;
    if (adminCheck.length === 0) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Find orphaned products (seller_id doesn't match any existing user)
    const orphanedProducts = await sql`
      SELECT p.id, p.title, p.seller_id, p.product_type, p.created_at
      FROM products p
      LEFT JOIN auth_users u ON p.seller_id = CAST(u.id AS TEXT)
      WHERE u.id IS NULL AND p.seller_id != 'deleted_user'
    `;

    // Find orphaned services
    const orphanedServices = await sql`
      SELECT s.id, s.title, s.seller_id, s.created_at
      FROM services s
      LEFT JOIN auth_users u ON s.seller_id = CAST(u.id AS TEXT)
      WHERE u.id IS NULL AND s.seller_id != 'deleted_user'
    `;

    // Delete orphaned products
    let deletedProductCount = 0;
    if (orphanedProducts.length > 0) {
      const orphanedProductIds = orphanedProducts.map((p) => p.id);
      const deleted = await sql(`DELETE FROM products WHERE id = ANY($1) RETURNING id`, [
        orphanedProductIds,
      ]);
      deletedProductCount = deleted.length;
    }

    // Delete orphaned services
    let deletedServiceCount = 0;
    if (orphanedServices.length > 0) {
      const orphanedServiceIds = orphanedServices.map((s) => s.id);
      const deleted = await sql(`DELETE FROM services WHERE id = ANY($1) RETURNING id`, [
        orphanedServiceIds,
      ]);
      deletedServiceCount = deleted.length;
    }

    // Also clean up orphaned professional profiles
    const orphanedSellerProfiles = await sql`
      DELETE FROM professional_profiles pp
      WHERE NOT EXISTS (
        SELECT 1 FROM auth_users u WHERE pp.user_id = CAST(u.id AS TEXT)
      ) AND pp.user_id != 'deleted_user'
      RETURNING id
    `;

    // Clean up orphaned deliverer profiles
    const orphanedDelivererProfiles = await sql`
      DELETE FROM deliverer_profiles dp
      WHERE NOT EXISTS (
        SELECT 1 FROM auth_users u WHERE dp.user_id = CAST(u.id AS TEXT)
      ) AND dp.user_id != 'deleted_user'
      RETURNING id
    `;

    return Response.json({
      success: true,
      message: 'Orphaned data cleanup completed',
      found: {
        orphaned_products: orphanedProducts.length,
        orphaned_services: orphanedServices.length,
      },
      deleted: {
        products: deletedProductCount,
        services: deletedServiceCount,
        seller_profiles: orphanedSellerProfiles.length,
        deliverer_profiles: orphanedDelivererProfiles.length,
      },
    });
  } catch (error: any) {
    console.error('Orphan cleanup error:', error);
    return Response.json(
      { error: 'Failed to cleanup orphaned data', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Clean up all data for a specific deleted user
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check admin privileges via role
    const adminCheck = await sql`
      SELECT role FROM "user"
      WHERE id = ${session.user.id} AND role IN ('admin', 'owner', 'moderator')
    `;
    if (adminCheck.length === 0) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Start a transaction to ensure all cleanup operations complete together
    const result = await sql.transaction(async (txn) => {
      // Delete video product tags for the user's videos
      const deletedVideoTags = await txn`
        DELETE FROM video_product_tags
        WHERE video_id IN (
          SELECT id FROM videos WHERE creator_user_id = ${userId}
        )
        RETURNING id
      `;

      // Delete products by the user
      const deletedProducts = await txn`
        DELETE FROM products 
        WHERE seller_id = ${userId}
        RETURNING id, title
      `;

      // Delete services by the user
      const deletedServices = await txn`
        DELETE FROM services 
        WHERE seller_id = ${userId}
        RETURNING id, title
      `;

      // Delete product categories created by the user
      const deletedCategories = await txn`
        DELETE FROM product_categories
        WHERE seller_id = ${userId}
        RETURNING id, category_name
      `;

      // Delete seller delivery zones
      const deletedDeliveryZones = await txn`
        DELETE FROM seller_delivery_zones
        WHERE seller_user_id = ${userId}
        RETURNING id
      `;

      // Delete professional profiles (seller profiles)
      const deletedSellerProfiles = await txn`
        DELETE FROM professional_profiles
        WHERE user_id = ${userId}
        RETURNING id, seller_type
      `;

      // Delete deliverer profiles
      const deletedDelivererProfiles = await txn`
        DELETE FROM deliverer_profiles
        WHERE user_id = ${userId}
        RETURNING id
      `;

      // Delete live sessions hosted by the user
      const deletedLiveSessions = await txn`
        DELETE FROM live_sessions
        WHERE host_user_id = ${userId}
        RETURNING id, title
      `;

      // Delete messages sent or received by the user
      const deletedMessages = await txn`
        DELETE FROM messages
        WHERE sender_user_id = ${userId} OR receiver_user_id = ${userId}
        RETURNING id
      `;

      // Delete deliverer seller requests
      const deletedDelivererRequests = await txn`
        DELETE FROM deliverer_seller_requests
        WHERE deliverer_user_id = ${userId} OR seller_user_id = ${userId}
        RETURNING id
      `;

      // NOTE: Orders are NOT deleted to preserve order history for other parties
      // Instead, we anonymize the data and mark it as "deleted user"
      const anonymizedOrders = await txn`
        UPDATE orders 
        SET buyer_id = 'deleted_user', seller_id = CASE WHEN seller_id = ${userId} THEN 'deleted_user' ELSE seller_id END,
            deliverer_id = CASE WHEN deliverer_id = ${userId} THEN NULL ELSE deliverer_id END
        WHERE buyer_id = ${userId} OR seller_id = ${userId} OR deliverer_id = ${userId}
        RETURNING id
      `;

      // Wallet transactions are kept for financial record keeping but user references are anonymized
      const anonymizedWalletTransactions = await txn`
        UPDATE wallet_transactions
        SET user_id = 'deleted_user', recipient_user_id = CASE WHEN recipient_user_id = ${userId} THEN 'deleted_user' ELSE recipient_user_id END
        WHERE user_id = ${userId} OR recipient_user_id = ${userId}
        RETURNING id
      `;

      return {
        deletedProducts: deletedProducts.length,
        deletedServices: deletedServices.length,
        deletedCategories: deletedCategories.length,
        deletedDeliveryZones: deletedDeliveryZones.length,
        deletedSellerProfiles: deletedSellerProfiles.length,
        deletedDelivererProfiles: deletedDelivererProfiles.length,
        deletedVideoTags: deletedVideoTags.length,
        deletedLiveSessions: deletedLiveSessions.length,
        deletedMessages: deletedMessages.length,
        deletedDelivererRequests: deletedDelivererRequests.length,
        anonymizedOrders: anonymizedOrders.length,
        anonymizedWalletTransactions: anonymizedWalletTransactions.length,
      };
    });

    return Response.json({
      success: true,
      message: 'User data cleanup completed successfully',
      details: result,
    });
  } catch (error: any) {
    console.error('User cleanup error:', error);
    return Response.json(
      { error: 'Failed to cleanup user data', details: error.message },
      { status: 500 }
    );
  }
}
