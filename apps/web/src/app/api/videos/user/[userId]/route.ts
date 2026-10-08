// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { resolveUserId } from '@/app/api/utils/auth';

/**
 * Get all videos by a specific user
 * Used to display videos on user profile (Posts tab)
 */
export async function GET(request, { params }) {
  try {
    // params is a Promise in this Next.js version — must be awaited,
    // otherwise userId is undefined and no videos are ever returned
    const { userId } = await params;

    // Support "me" to get current user's videos
    let targetUserId = userId;
    if (userId === 'me') {
      const currentUserId = await resolveUserId(request);
      if (!currentUserId) {
        return Response.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
      }
      targetUserId = currentUserId;
    }

    // Step 1: Fetch user's videos with profile data
    const videos = await sql`
      SELECT 
        v.id,
        v.creator_user_id,
        v.video_url,
        v.thumbnail_url,
        v.caption,
        v.duration_seconds,
        v.views_count,
        v.likes_count,
        v.comments_count,
        v.shares_count,
        v.created_at,
        u.username,
        u.display_name,
        u.name,
        u.email,
        u.profile_image,
        u.is_verified,
        prof.business_name
      FROM videos v
      LEFT JOIN auth_users u ON u.id::text = v.creator_user_id
      LEFT JOIN professional_profiles prof ON prof.user_id = v.creator_user_id
      WHERE v.creator_user_id = ${targetUserId}
        AND v.status = 'active'
      ORDER BY v.created_at DESC
    `;

    // Step 2: Fetch tagged items for these videos
    const videoIds = videos.map((v) => v.id);
    const taggedItemsMap = {};

    if (videoIds.length > 0) {
      const taggedItems = await sql(
        `SELECT 
          vpt.video_id,
          vpt.product_id,
          vpt.service_id,
          p.title as product_title,
          p.price as product_price,
          p.media as product_media,
          s.title as service_title,
          s.basic_price as service_price
        FROM video_product_tags vpt
        LEFT JOIN products p ON p.id = vpt.product_id
        LEFT JOIN services s ON s.id = vpt.service_id
        WHERE vpt.video_id = ANY($1)`,
        [videoIds]
      );

      for (const tag of taggedItems) {
        if (!taggedItemsMap[tag.video_id]) {
          taggedItemsMap[tag.video_id] = [];
        }
        if (tag.product_id || tag.service_id) {
          taggedItemsMap[tag.video_id].push({
            productId: tag.product_id,
            serviceId: tag.service_id,
            productTitle: tag.product_title,
            productPrice: tag.product_price ? parseFloat(tag.product_price) : null,
            productMedia: tag.product_media,
            serviceTitle: tag.service_title,
            servicePrice: tag.service_price ? parseFloat(tag.service_price) : null,
          });
        }
      }
    }

    // Step 3: Format response with both camelCase and snake_case
    const formattedVideos = videos.map((video) => {
      const items = taggedItemsMap[video.id] || [];
      const reliableUsername =
        video.username ||
        (video.email ? video.email.split('@')[0] : `user${video.creator_user_id}`);
      const reliableDisplayName =
        video.business_name || video.display_name || video.name || reliableUsername;
      return {
        id: video.id,
        creatorUserId: video.creator_user_id,
        creator_user_id: video.creator_user_id,
        videoUrl: video.video_url,
        video_url: video.video_url,
        thumbnailUrl: video.thumbnail_url,
        thumbnail_url: video.thumbnail_url,
        caption: video.caption,
        description: video.caption,
        durationSeconds: video.duration_seconds,
        duration_seconds: video.duration_seconds,
        viewsCount: video.views_count || 0,
        views_count: video.views_count || 0,
        likesCount: video.likes_count || 0,
        likes_count: video.likes_count || 0,
        commentsCount: video.comments_count || 0,
        comments_count: video.comments_count || 0,
        sharesCount: video.shares_count || 0,
        shares_count: video.shares_count || 0,
        createdAt: video.created_at,
        created_at: video.created_at,
        username: reliableUsername,
        displayName: reliableDisplayName,
        display_name: reliableDisplayName,
        businessName: video.business_name,
        business_name: video.business_name,
        profileImage: video.profile_image,
        profile_image: video.profile_image,
        avatar: video.profile_image || `https://i.pravatar.cc/150?u=${video.creator_user_id}`,
        isVerified: video.is_verified || false,
        is_verified: video.is_verified || false,
        taggedItems: items,
        tagged_items: items,
      };
    });

    return Response.json({ videos: formattedVideos });
  } catch (error) {
    console.error('Get user videos error:', error);
    return Response.json({ error: 'Failed to fetch user videos' }, { status: 500 });
  }
}
