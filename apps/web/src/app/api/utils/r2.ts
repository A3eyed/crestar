// @ts-nocheck
/**
 * Cloudflare R2 uploads for Crestar.
 * Credentials: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 * R2_BUCKET, R2_PUBLIC_BASE_URL
 */
import crypto from 'crypto';

const bucket = () => process.env.R2_BUCKET || 'crestar-media';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function hmac(key, value) {
  return crypto.createHmac('sha256', key).update(value, typeof key === 'string' ? 'utf8' : undefined).digest();
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function signingKey(secret, dateStamp) {
  const kDate = hmac('AWS4' + secret, dateStamp);
  const kRegion = hmac(kDate, 'auto');
  const kService = hmac(kRegion, 's3');
  return hmac(kService, 'aws4_request');
}

function amzNow() {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

export function publicUrlFor(key) {
  const base = (process.env.R2_PUBLIC_BASE_URL || 'https://media.crestarhq.com').replace(/\/$/, '');
  return `${base}/${key}`;
}

/** Server-side PUT (small files / server-generated assets). */
export async function putObject({ key, body, contentType = 'application/octet-stream' }) {
  const accessKey = requireEnv('R2_ACCESS_KEY_ID');
  const secret = requireEnv('R2_SECRET_ACCESS_KEY');
  const accountId = requireEnv('R2_ACCOUNT_ID');
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const payloadHash = sha256Hex(payload);
  const { amzDate, dateStamp } = amzNow();
  const canonicalUri = `/${bucket()}/${key.split('/').map(encodeURIComponent).join('/')}`;
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');
  const signature = crypto.createHmac('sha256', signingKey(secret, dateStamp)).update(stringToSign).digest('hex');

  const response = await fetch(`https://${host}${canonicalUri}`, {
    method: 'PUT',
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'content-type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
    body: payload,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`R2 upload failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  return { key, url: publicUrlFor(key) };
}

export async function uploadBuffer(buffer, { folder = 'uploads', contentType, extension = 'bin' } = {}) {
  const key = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
  return putObject({ key, body: buffer, contentType });
}

/**
 * Presigned PUT so the browser uploads straight to R2 (no Worker body limit).
 * Valid for `expiresIn` seconds (default 15 minutes).
 */
export function createPresignedPut({
  key,
  contentType = 'application/octet-stream',
  expiresIn = 900,
} = {}) {
  const accessKey = requireEnv('R2_ACCESS_KEY_ID');
  const secret = requireEnv('R2_SECRET_ACCESS_KEY');
  const accountId = requireEnv('R2_ACCOUNT_ID');
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const { amzDate, dateStamp } = amzNow();
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const credential = `${accessKey}/${credentialScope}`;
  const canonicalUri = `/${bucket()}/${key.split('/').map(encodeURIComponent).join('/')}`;

  const query = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'content-type;host',
  });
  // Sort query keys for canonical request
  const canonicalQuery = [...query.keys()]
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query.get(k))}`)
    .join('&');

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const signedHeaders = 'content-type;host';
  const payloadHash = 'UNSIGNED-PAYLOAD';
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const signature = crypto
    .createHmac('sha256', signingKey(secret, dateStamp))
    .update(stringToSign)
    .digest('hex');

  const uploadUrl = `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  return {
    uploadUrl,
    publicUrl: publicUrlFor(key),
    key,
    contentType,
    headers: {
      'Content-Type': contentType,
    },
  };
}

export function newObjectKey(folder = 'uploads', extension = 'bin') {
  return `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
}
