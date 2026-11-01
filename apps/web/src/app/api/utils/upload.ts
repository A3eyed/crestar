// @ts-nocheck
/**
 * Server uploads go to Cloudflare R2.
 * Enforces content-type allowlist and max size to reduce abuse.
 */
import { uploadBuffer } from './r2';

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

function extensionFor(contentType = '') {
  const t = String(contentType).toLowerCase();
  if (t.includes('png')) return 'png';
  if (t.includes('webp')) return 'webp';
  if (t.includes('gif')) return 'gif';
  if (t.includes('mp4')) return 'mp4';
  if (t.includes('webm')) return 'webm';
  if (t.includes('quicktime')) return 'mov';
  if (t.includes('jpeg') || t.includes('jpg')) return 'jpg';
  return 'bin';
}

function assertAllowedType(type) {
  const normalized = String(type || '').toLowerCase().split(';')[0].trim();
  if (!ALLOWED_TYPES.has(normalized)) {
    throw new Error(
      'File type not allowed. Use JPEG, PNG, WebP, GIF, MP4, or WebM.',
    );
  }
  return normalized;
}

function assertSize(body) {
  const len = body?.length ?? body?.byteLength ?? 0;
  if (len <= 0) throw new Error('No file was provided');
  if (len > MAX_BYTES) {
    throw new Error('File is too large. Maximum size is 25 MB.');
  }
}

async function upload({ url, buffer, base64, contentType, folder }) {
  let body = buffer;
  let type = contentType || 'application/octet-stream';
  if (!body && base64) {
    const match = String(base64).match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      type = match[1];
      body = Buffer.from(match[2], 'base64');
    } else {
      body = Buffer.from(base64, 'base64');
    }
  }
  if (!body && url) {
    // Only allow https remote fetches for server-side pull uploads
    if (typeof url === 'string' && !url.startsWith('https://')) {
      throw new Error('Remote upload URL must use HTTPS');
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error('Could not read the file to upload');
    type = response.headers.get('content-type') || type;
    const lenHeader = response.headers.get('content-length');
    if (lenHeader && Number(lenHeader) > MAX_BYTES) {
      throw new Error('File is too large. Maximum size is 25 MB.');
    }
    body = Buffer.from(await response.arrayBuffer());
  }
  if (!body) throw new Error('No file was provided');

  type = assertAllowedType(type);
  assertSize(body);

  const result = await uploadBuffer(body, {
    folder: folder || 'uploads',
    contentType: type,
    extension: extensionFor(type),
  });
  return { url: result.url, key: result.key, mimeType: type };
}

export { upload, MAX_BYTES, ALLOWED_TYPES };
export default upload;
