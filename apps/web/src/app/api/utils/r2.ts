// @ts-nocheck
/**
 * Cloudflare R2 uploads for Crestar.
 * Credentials come from environment secrets, never from the repo.
 *
 * R2_ACCOUNT_ID
 * R2_ACCESS_KEY_ID
 * R2_SECRET_ACCESS_KEY
 * R2_BUCKET (default crestar-media)
 * R2_PUBLIC_BASE_URL (https://media.crestarhq.com or the r2.dev URL)
 */
import crypto from 'crypto';

const bucket = () => process.env.R2_BUCKET || 'crestar-media';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function hmac(key, value) {
  return crypto.createHmac('sha256', key).update(value).digest();
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function signingKey(secret, dateStamp) {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, 'auto');
  const kService = hmac(kRegion, 's3');
  return hmac(kService, 'aws4_request');
}

function authorization({ method, key, payloadHash, contentType }) {
  const accessKey = requireEnv('R2_ACCESS_KEY_ID');
  const secret = requireEnv('R2_SECRET_ACCESS_KEY');
  const accountId = requireEnv('R2_ACCOUNT_ID');
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const canonicalUri = `/${bucket()}/${key.split('/').map(encodeURIComponent).join('/')}`;
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [method, canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256(canonicalRequest)].join('\n');
  const signature = crypto.createHmac('sha256', signingKey(secret, dateStamp)).update(stringToSign).digest('hex');
  return {
    host,
    url: `https://${host}${canonicalUri}`,
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'content-type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
  };
}

export function publicUrlFor(key) {
  const base = (process.env.R2_PUBLIC_BASE_URL || 'https://media.crestarhq.com').replace(/\/$/, '');
  return `${base}/${key}`;
}

export async function putObject({ key, body, contentType = 'application/octet-stream' }) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const signed = authorization({
    method: 'PUT',
    key,
    payloadHash: sha256(payload),
    contentType,
  });
  const response = await fetch(signed.url, {
    method: 'PUT',
    headers: signed.headers,
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
