// @ts-nocheck
import { createPresignedPut, newObjectKey } from '@/app/api/utils/r2';
import { resolveUserId } from '@/app/api/utils/auth';

const ALLOWED = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/octet-stream',
]);

function extFor(mime) {
  const t = String(mime || '').toLowerCase();
  if (t.includes('webm')) return 'webm';
  if (t.includes('mp4')) return 'mp4';
  if (t.includes('quicktime')) return 'mov';
  if (t.includes('png')) return 'png';
  if (t.includes('webp')) return 'webp';
  if (t.includes('gif')) return 'gif';
  if (t.includes('jpeg') || t.includes('jpg')) return 'jpg';
  return 'bin';
}

/**
 * POST /api/upload/presign
 * Body: { contentType, folder? }
 * Returns a short-lived R2 PUT URL so the client uploads directly.
 */
export async function POST(request) {
  try {
    const userId = await resolveUserId(request);
    if (!userId) {
      return Response.json({ error: 'Please sign in' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    let contentType = String(body.contentType || 'application/octet-stream').toLowerCase();
    if (!ALLOWED.has(contentType)) {
      // Keep a sensible default for camera webm/mp4
      if (contentType.startsWith('video/')) contentType = contentType;
      else contentType = 'application/octet-stream';
    }

    const folder = body.folder === 'videos' ? 'videos' : 'uploads';
    const key = newObjectKey(folder, extFor(contentType));
    const signed = createPresignedPut({ key, contentType, expiresIn: 900 });

    return Response.json({
      uploadUrl: signed.uploadUrl,
      publicUrl: signed.publicUrl,
      key: signed.key,
      contentType: signed.contentType,
      headers: signed.headers,
    });
  } catch (error) {
    console.error('presign error', error?.message || error);
    return Response.json(
      { error: error?.message || 'Could not prepare upload' },
      { status: 500 },
    );
  }
}
