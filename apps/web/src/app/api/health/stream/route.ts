// @ts-nocheck
import { isStreamConfigured, probeStreamAccess } from '@/app/api/utils/cloudflare-stream';

/**
 * GET /api/health/stream
 * Confirms Stream env + API access without creating a live input.
 */
export async function GET() {
  if (!isStreamConfigured()) {
    return Response.json(
      {
        ok: false,
        streamConfigured: false,
        message:
          'Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Stream Edit) on the host.',
      },
      { status: 503 },
    );
  }

  const probe = await probeStreamAccess();
  if (!probe.ok) {
    return Response.json(
      {
        ok: false,
        streamConfigured: true,
        message: probe.reason,
      },
      { status: 503 },
    );
  }

  return Response.json({
    ok: true,
    streamConfigured: true,
    message: 'Cloudflare Stream reachable',
  });
}
