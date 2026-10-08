// @ts-nocheck
import sql from '@/app/api/utils/sql';

export async function GET(request, { params }) {
  try {
    // params must be awaited in this Next.js version
    const { id: targetUserId } = await params;

    // Check seller/professional profile
    const [sellerProfile] = await sql`
      SELECT 
        id, 
        seller_type, 
        business_name,
        full_name,
        verification_status,
        paystack_subaccount_code,
        payment_setup_complete,
        created_at
      FROM professional_profiles 
      WHERE user_id = ${targetUserId}
    `;

    // Check deliverer profile
    const [delivererProfile] = await sql`
      SELECT 
        id, 
        user_id,
        full_name,
        phone_number,
        vehicle_type,
        verification_status,
        is_available,
        total_deliveries,
        successful_deliveries,
        rating,
        created_at
      FROM deliverer_profiles 
      WHERE user_id = ${targetUserId}
    `;

    // Check if user has created any videos (creator status)
    const [videoStats] = await sql`
      SELECT 
        COUNT(*) as video_count,
        SUM(views_count) as total_views,
        SUM(likes_count) as total_likes
      FROM videos 
      WHERE creator_user_id = ${targetUserId} AND status = 'active'
    `;

    // Check if user has any affiliate sales (creator earnings)
    const [affiliateStats] = await sql`
      SELECT 
        COUNT(*) as total_sales,
        SUM(creator_commission) as total_commission
      FROM orders 
      WHERE origin_creator_id = ${targetUserId} AND status IN ('delivered', 'paid', 'confirmed')
    `;

    const creatorProfile =
      videoStats?.video_count > 0 || affiliateStats?.total_sales > 0
        ? {
            video_count: parseInt(videoStats?.video_count || 0),
            total_views: parseInt(videoStats?.total_views || 0),
            total_likes: parseInt(videoStats?.total_likes || 0),
            total_sales: parseInt(affiliateStats?.total_sales || 0),
            total_commission: parseFloat(affiliateStats?.total_commission || 0),
            created_at: null,
          }
        : null;

    return Response.json({
      seller: sellerProfile || null,
      deliverer: delivererProfile || null,
      creator: creatorProfile,
      hasAnyMonetization: !!sellerProfile || !!delivererProfile || !!creatorProfile,
    });
  } catch (error) {
    console.error('Get user monetization status error:', error);
    return Response.json({ error: 'Failed to get monetization status' }, { status: 500 });
  }
}
