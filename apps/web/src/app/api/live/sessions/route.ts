// @ts-nocheck
import sql from '@/app/api/utils/sql';
import { auth } from '@/auth';
import {
  createLiveInput,
  disableLiveInput,
  isStreamConfigured,
} from '@/app/api/utils/cloudflare-stream';

async function canHostLive(userId) {
  const [seller] = await sql`
    SELECT id, seller_type, verification_status
    FROM professional_profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  if (seller && (seller.verification_status === 'approved' || seller.verification_status === 'pending')) {
    return { allowed: true, role: 'seller', profile: seller };
  }

  const [creator] = await sql`
    SELECT bc.id, bc.center_type, bc.verification_status
    FROM business_centers bc
    LEFT JOIN identity_accounts ia ON ia.identity_id = bc.identity_id
    LEFT JOIN auth_users au ON au.id = ia.user_id OR au.identity_id = bc.identity_id
    WHERE (au.id = ${userId} OR bc.owner_user_id = ${userId})
      AND bc.center_type = 'creator'
    LIMIT 1
  `;
  if (creator) {
    return { allowed: true, role: 'creator', profile: creator };
  }

  const [hasListing] = await sql`
    SELECT 1 AS ok FROM products WHERE seller_id = ${userId} AND status = 'active' LIMIT 1
  `;
  if (hasListing) return { allowed: true, role: 'seller', profile: null };

  return { allowed: false };
}

async function loadSessionProducts(sessionId) {
  return sql`
    SELECT lp.*,
      COALESCE(p.title, s.title) AS product_title,
      COALESCE(lp.flash_price, p.price, s.basic_price) AS product_price,
      COALESCE(p.media, s.media) AS product_media,
      COALESCE(p.description, s.description) AS product_description,
      COALESCE(p.stock_quantity, 999) AS stock_quantity,
      p.seller_currency,
      CASE WHEN lp.product_id IS NOT NULL THEN 'product' ELSE 'service' END AS item_type
    FROM live_session_products lp
    LEFT JOIN products p ON p.id = lp.product_id
    LEFT JOIN services s ON s.id = lp.service_id
    WHERE lp.session_id = ${sessionId}
    ORDER BY lp.is_featured DESC, lp.sort_order ASC, lp.created_at DESC
  `;
}

/** Never send WHIP publish URL or RTMPS key to non-hosts. */
function publicSession(row, { isHost = false } = {}) {
  if (!row) return row;
  const out = { ...row };
  if (!isHost) {
    delete out.webrtc_publish_url;
    delete out.rtmps_stream_key;
    delete out.rtmps_url;
    delete out.stream_key;
  }
  return out;
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('id');
    let viewerId = null;
    try {
      const s = await auth();
      viewerId = s?.user?.id?.toString() || null;
    } catch {}

    if (sessionId) {
      const rows = await sql`
        SELECT ls.*,
          au.username, au.display_name, au.profile_image, au.is_verified,
          COALESCE(pp.business_name, bc.business_name, au.display_name, au.username) AS seller_name,
          pp.seller_type
        FROM live_sessions ls
        LEFT JOIN auth_users au ON au.id = ls.host_user_id
        LEFT JOIN professional_profiles pp ON pp.user_id = ls.host_user_id
        LEFT JOIN business_centers bc ON bc.owner_user_id = ls.host_user_id OR bc.identity_id = au.identity_id
        WHERE ls.id = ${sessionId}
        LIMIT 1
      `;
      if (!rows.length) {
        return Response.json({ error: 'Session not found' }, { status: 404 });
      }
      const isHost = viewerId && rows[0].host_user_id === viewerId;
      const products = await loadSessionProducts(sessionId);
      return Response.json({
        session: publicSession(rows[0], { isHost }),
        products,
        isHost: !!isHost,
      });
    }

    const sessions = await sql`
      SELECT ls.id, ls.host_user_id, ls.title, ls.description, ls.thumbnail, ls.status,
        ls.stream_url, ls.webrtc_playback_url, ls.viewer_count, ls.peak_viewer_count,
        ls.started_at, ls.created_at,
        au.username, au.display_name, au.profile_image, au.is_verified,
        COALESCE(pp.business_name, bc.business_name, au.display_name, au.username) AS seller_name,
        pp.seller_type
      FROM live_sessions ls
      LEFT JOIN auth_users au ON au.id = ls.host_user_id
      LEFT JOIN professional_profiles pp ON pp.user_id = ls.host_user_id
      LEFT JOIN business_centers bc ON bc.owner_user_id = ls.host_user_id OR bc.identity_id = au.identity_id
      WHERE ls.status = 'live'
      ORDER BY ls.viewer_count DESC, ls.started_at DESC
      LIMIT 50
    `;

    return Response.json({ sessions });
  } catch (error) {
    console.error('Get live sessions error:', error);
    return Response.json(
      { error: 'Failed to get sessions', details: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id.toString();
    const gate = await canHostLive(userId);
    if (!gate.allowed) {
      return Response.json(
        { error: 'You need an active product listing or an approved seller/creator profile to go live' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      thumbnail,
      productIds = [],
      serviceIds = [],
    } = body;

    // End any previous live session for this host (+ disable their Stream inputs)
    const previous = await sql`
      SELECT id, stream_input_uid FROM live_sessions
      WHERE host_user_id = ${userId} AND status = 'live'
    `;
    for (const prev of previous) {
      if (prev.stream_input_uid && isStreamConfigured()) {
        await disableLiveInput(prev.stream_input_uid);
      }
    }
    await sql`
      UPDATE live_sessions
      SET status = 'ended', ended_at = NOW(), updated_at = NOW()
      WHERE host_user_id = ${userId} AND status = 'live'
    `;

    const sessionTitle = (title && String(title).trim()) || 'Live Shopping';
    const [row] = await sql`
      INSERT INTO live_sessions (host_user_id, title, description, thumbnail, status, started_at)
      VALUES (${userId}, ${sessionTitle}, ${description || null}, ${thumbnail || null}, 'live', NOW())
      RETURNING *
    `;

    // Cloudflare Stream live input (optional if not configured — shopping still works)
    let streamMeta = null;
    if (isStreamConfigured()) {
      try {
        streamMeta = await createLiveInput({
          name: `Crestar · ${sessionTitle}`.slice(0, 100),
          sessionId: row.id,
        });
        await sql`
          UPDATE live_sessions SET
            stream_input_uid = ${streamMeta.uid},
            stream_url = ${streamMeta.hlsUrl},
            stream_key = ${streamMeta.rtmpsStreamKey},
            webrtc_publish_url = ${streamMeta.webrtcPublishUrl},
            webrtc_playback_url = ${streamMeta.webrtcPlaybackUrl},
            rtmps_url = ${streamMeta.rtmpsUrl},
            rtmps_stream_key = ${streamMeta.rtmpsStreamKey},
            updated_at = NOW()
          WHERE id = ${row.id}
        `;
        Object.assign(row, {
          stream_input_uid: streamMeta.uid,
          stream_url: streamMeta.hlsUrl,
          stream_key: streamMeta.rtmpsStreamKey,
          webrtc_publish_url: streamMeta.webrtcPublishUrl,
          webrtc_playback_url: streamMeta.webrtcPlaybackUrl,
          rtmps_url: streamMeta.rtmpsUrl,
          rtmps_stream_key: streamMeta.rtmpsStreamKey,
        });
      } catch (streamErr) {
        console.error('[live] Stream live input failed (session still created):', streamErr.message);
      }
    }

    let sort = 0;
    for (const pid of productIds) {
      if (!pid) continue;
      await sql`
        INSERT INTO live_session_products (session_id, product_id, is_featured, sort_order)
        VALUES (${row.id}, ${pid}, ${sort === 0}, ${sort})
      `;
      sort += 1;
    }
    for (const sid of serviceIds) {
      if (!sid) continue;
      await sql`
        INSERT INTO live_session_products (session_id, service_id, is_featured, sort_order)
        VALUES (${row.id}, ${sid}, ${sort === 0}, ${sort})
      `;
      sort += 1;
    }

    const products = await loadSessionProducts(row.id);
    return Response.json({
      session: publicSession(row, { isHost: true }),
      products,
      role: gate.role,
      streamConfigured: isStreamConfigured(),
      streamReady: Boolean(streamMeta?.uid),
    });
  } catch (error) {
    console.error('Create live session error:', error);
    return Response.json({ error: 'Failed to create session', details: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id.toString();
    const body = await request.json();
    const { action, sessionId, productId, serviceId, message } = body;

    if (!sessionId) {
      return Response.json({ error: 'sessionId required' }, { status: 400 });
    }

    if (action === 'end') {
      const [owned] = await sql`
        SELECT id, stream_input_uid FROM live_sessions
        WHERE id = ${sessionId} AND host_user_id = ${userId}
      `;
      if (owned?.stream_input_uid && isStreamConfigured()) {
        await disableLiveInput(owned.stream_input_uid);
      }
      await sql`
        UPDATE live_sessions
        SET status = 'ended', ended_at = NOW(), updated_at = NOW()
        WHERE id = ${sessionId} AND host_user_id = ${userId}
      `;
      await sql`DELETE FROM live_session_viewers WHERE session_id = ${sessionId}`;
      return Response.json({ success: true });
    }

    if (action === 'feature_product' || action === 'pin_product') {
      const [owned] = await sql`
        SELECT id FROM live_sessions WHERE id = ${sessionId} AND host_user_id = ${userId}
      `;
      if (!owned) return Response.json({ error: 'Not your session' }, { status: 403 });

      await sql`UPDATE live_session_products SET is_featured = false WHERE session_id = ${sessionId}`;

      if (productId) {
        const existing = await sql`
          SELECT id FROM live_session_products WHERE session_id = ${sessionId} AND product_id = ${productId}
        `;
        if (existing.length) {
          await sql`UPDATE live_session_products SET is_featured = true WHERE session_id = ${sessionId} AND product_id = ${productId}`;
        } else {
          await sql`INSERT INTO live_session_products (session_id, product_id, is_featured) VALUES (${sessionId}, ${productId}, true)`;
        }
        await sql`UPDATE live_sessions SET pinned_product_id = ${productId}, pinned_service_id = NULL, updated_at = NOW() WHERE id = ${sessionId}`;
      } else if (serviceId) {
        const existing = await sql`
          SELECT id FROM live_session_products WHERE session_id = ${sessionId} AND service_id = ${serviceId}
        `;
        if (existing.length) {
          await sql`UPDATE live_session_products SET is_featured = true WHERE session_id = ${sessionId} AND service_id = ${serviceId}`;
        } else {
          await sql`INSERT INTO live_session_products (session_id, service_id, is_featured) VALUES (${sessionId}, ${serviceId}, true)`;
        }
        await sql`UPDATE live_sessions SET pinned_service_id = ${serviceId}, pinned_product_id = NULL, updated_at = NOW() WHERE id = ${sessionId}`;
      }
      return Response.json({ success: true });
    }

    if (action === 'unfeature_product') {
      await sql`UPDATE live_session_products SET is_featured = false WHERE session_id = ${sessionId}`;
      await sql`UPDATE live_sessions SET pinned_product_id = NULL, pinned_service_id = NULL WHERE id = ${sessionId}`;
      return Response.json({ success: true });
    }

    if (action === 'join') {
      await sql`
        INSERT INTO live_session_viewers (session_id, user_id, joined_at, last_heartbeat)
        VALUES (${sessionId}, ${userId}, NOW(), NOW())
        ON CONFLICT (session_id, user_id)
        DO UPDATE SET last_heartbeat = NOW()
      `;
      const [count] = await sql`
        SELECT COUNT(*)::int AS c FROM live_session_viewers
        WHERE session_id = ${sessionId} AND last_heartbeat > NOW() - INTERVAL '2 minutes'
      `;
      await sql`
        UPDATE live_sessions
        SET viewer_count = ${count.c},
            peak_viewer_count = GREATEST(peak_viewer_count, ${count.c}),
            updated_at = NOW()
        WHERE id = ${sessionId}
      `;
      return Response.json({ success: true, viewer_count: count.c });
    }

    if (action === 'leave' || action === 'heartbeat') {
      if (action === 'leave') {
        await sql`DELETE FROM live_session_viewers WHERE session_id = ${sessionId} AND user_id = ${userId}`;
      } else {
        await sql`
          INSERT INTO live_session_viewers (session_id, user_id, last_heartbeat)
          VALUES (${sessionId}, ${userId}, NOW())
          ON CONFLICT (session_id, user_id) DO UPDATE SET last_heartbeat = NOW()
        `;
      }
      const [count] = await sql`
        SELECT COUNT(*)::int AS c FROM live_session_viewers
        WHERE session_id = ${sessionId} AND last_heartbeat > NOW() - INTERVAL '2 minutes'
      `;
      await sql`UPDATE live_sessions SET viewer_count = ${count.c}, updated_at = NOW() WHERE id = ${sessionId}`;
      return Response.json({ success: true, viewer_count: count.c });
    }

    if (action === 'chat') {
      if (!message?.trim()) {
        return Response.json({ error: 'Message required' }, { status: 400 });
      }
      const [msg] = await sql`
        INSERT INTO live_chat_messages (session_id, user_id, message_text)
        VALUES (${sessionId}, ${userId}, ${message.trim()})
        RETURNING *
      `;
      return Response.json({ success: true, message: msg });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Update live session error:', error);
    return Response.json({ error: 'Failed to update session', details: error.message }, { status: 500 });
  }
}
