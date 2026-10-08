// @ts-nocheck
import sql from '@/app/api/utils/sql';

// Feed API - returns all active videos with tagged products
async function fetchVideos(limit, offset) {
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
      COALESCE(
        NULLIF(TRIM(u.business_name), ''),
        NULLIF(TRIM(prof.business_name), ''),
        NULLIF(TRIM(bc.business_name), '')
      ) AS business_name
    FROM videos v
    LEFT JOIN auth_users u ON u.id::text = v.creator_user_id
    LEFT JOIN professional_profiles prof ON prof.user_id = v.creator_user_id
    LEFT JOIN LATERAL (
      SELECT b.business_name
      FROM business_centers b
      WHERE b.identity_id IN (
        SELECT identity_id FROM identity_accounts WHERE user_id = v.creator_user_id
        UNION
        SELECT identity_id FROM auth_users WHERE id = v.creator_user_id AND identity_id IS NOT NULL
      )
      LIMIT 1
    ) bc ON true
    WHERE v.status = 'active'
    ORDER BY v.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
  return videos;
}

async function fetchTaggedItems(videoIds) {
  if (videoIds.length === 0) return {};

  const taggedItems = await sql(
    `SELECT 
      vpt.video_id,
      vpt.product_id,
      vpt.service_id,
      p.title        AS product_title,
      p.price        AS product_price,
      p.media        AS product_media,
      p.status       AS product_status,
      p.stock_quantity AS product_stock,
      s.title        AS service_title,
      s.basic_price  AS service_price,
      s.status       AS service_status
    FROM video_product_tags vpt
    LEFT JOIN products p ON p.id = vpt.product_id AND p.status = 'active'
    LEFT JOIN services  s ON s.id = vpt.service_id  AND s.status = 'active'
    WHERE vpt.video_id = ANY($1)
      AND (
        (vpt.product_id IS NOT NULL AND p.id IS NOT NULL)
        OR
        (vpt.service_id IS NOT NULL AND s.id IS NOT NULL)
      )`,
    [videoIds]
  );

  const map = {};
  for (const tag of taggedItems) {
    if (!map[tag.video_id]) map[tag.video_id] = [];
    map[tag.video_id].push({
      productId: tag.product_id,
      serviceId: tag.service_id,
      productTitle: tag.product_title,
      productPrice: tag.product_price ? parseFloat(tag.product_price) : null,
      productMedia: tag.product_media,
      productStock: tag.product_stock != null ? parseInt(tag.product_stock) : null,
      serviceTitle: tag.service_title,
      servicePrice: tag.service_price ? parseFloat(tag.service_price) : null,
    });
  }
  return map;
}

function formatVideo(video, taggedItems) {
  const username =
    video.username || (video.email ? video.email.split('@')[0] : 'user' + video.creator_user_id);
  const displayName = video.business_name || video.display_name || video.name || username;
  const items = taggedItems || [];

  return {
    id: video.id,
    videoUrl: video.video_url,
    video_url: video.video_url,
    thumbnail: video.thumbnail_url || null,
    thumbnail_url: video.thumbnail_url || null,
    username: username,
    sellerId: video.creator_user_id,
    creatorUserId: video.creator_user_id,
    creator_user_id: video.creator_user_id,
    avatar: video.profile_image || null,
    profile_image: video.profile_image || null,
    description: video.caption || '',
    caption: video.caption || '',
    likes: String(video.likes_count || 0),
    likes_count: video.likes_count || 0,
    comments: String(video.comments_count || 0),
    comments_count: video.comments_count || 0,
    shares: String(video.shares_count || 0),
    shares_count: video.shares_count || 0,
    views: String(video.views_count || 0),
    views_count: video.views_count || 0,
    duration: video.duration_seconds,
    duration_seconds: video.duration_seconds,
    isVerified: video.is_verified || false,
    is_verified: video.is_verified || false,
    displayName: displayName,
    display_name: displayName,
    businessName: video.business_name,
    business_name: video.business_name,
    taggedItems: items,
    tagged_items: items,
    hasVideo: true,
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const videos = await fetchVideos(limit, offset);
    const videoIds = videos.map((v) => v.id);
    const tagMap = await fetchTaggedItems(videoIds);

    const feedItems = videos.map((v) => formatVideo(v, tagMap[v.id]));

    return Response.json({ feedItems, hasMore: videos.length === limit });
  } catch (error) {
    console.error('Feed API error:', error);
    return Response.json({
      feedItems: [],
      hasMore: false,
      dbError: error.message || String(error),
    });
  }
}
