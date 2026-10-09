// @ts-nocheck
/**
 * Server uploads go to Cloudflare R2.
 * Anything / create.xyz upload hosts are not used.
 */
import { uploadBuffer } from './r2';

function extensionFor(contentType = '') {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('mp4')) return 'mp4';
  if (contentType.includes('quicktime')) return 'mov';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  return 'bin';
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
    const response = await fetch(url);
    if (!response.ok) throw new Error('Could not read the file to upload');
    type = response.headers.get('content-type') || type;
    body = Buffer.from(await response.arrayBuffer());
  }
  if (!body) throw new Error('No file was provided');
  const result = await uploadBuffer(body, {
    folder: folder || 'uploads',
    contentType: type,
    extension: extensionFor(type),
  });
  return { url: result.url, key: result.key };
}

export { upload };
export default upload;
