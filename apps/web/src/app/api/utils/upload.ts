// @ts-nocheck

/**
 * Shared server-side upload helper.
 *
 * The upload service requires PROJECT CONTEXT to accept files. That context
 * is established by calling the platform base URL for this project
 * (NEXT_PUBLIC_CREATE_BASE_URL) with the project token — the same pattern
 * used for all integration calls. Hitting the raw CDN hosts directly
 * (api.create.xyz / api.anything.com) fails with
 * "Project context header is required" because those hosts cannot infer
 * which project the upload belongs to.
 *
 * Endpoint order:
 *   1. `${NEXT_PUBLIC_CREATE_BASE_URL}/v0/upload`  ← project-scoped (correct)
 *   2. https://api.create.xyz/v0/upload            ← direct host fallback
 *   3. https://api.anything.com/v0/upload          ← legacy host fallback
 */

const getUploadEndpoints = () => {
  const endpoints = [];

  const base = process.env.NEXT_PUBLIC_CREATE_BASE_URL;
  if (base) {
    endpoints.push(`${base.replace(/\/$/, '')}/v0/upload`);
  }

  endpoints.push('https://api.create.xyz/v0/upload');
  endpoints.push('https://api.anything.com/v0/upload');

  return endpoints;
};

function buildProjectContextHeaders(isBuffer) {
  const headers = {
    'Content-Type': isBuffer ? 'application/octet-stream' : 'application/json',
  };

  // Project context — required by the create.xyz upload endpoint
  if (process.env.ANYTHING_PROJECT_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.ANYTHING_PROJECT_TOKEN}`;
  }
  if (process.env.NEXT_PUBLIC_PROJECT_GROUP_ID) {
    headers['x-createxyz-project-group-id'] = process.env.NEXT_PUBLIC_PROJECT_GROUP_ID;
  }
  if (process.env.NEXT_PUBLIC_CREATE_APP_URL) {
    try {
      headers['x-createxyz-host'] = new URL(process.env.NEXT_PUBLIC_CREATE_APP_URL).host;
    } catch (e) {
      // ignore malformed URL
    }
  }

  return headers;
}

async function attemptUpload(endpoint, { url, buffer, base64 }, headers) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: buffer ? buffer : JSON.stringify({ base64, url }),
  });

  console.log(`📡 CDN response from ${endpoint}:`, response.status);

  if (!response.ok) {
    let errorMessage = `CDN upload failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
      console.error('❌ CDN error response:', errorData);
    } catch (e) {
      console.error('❌ CDN error (no JSON):', response.statusText);
    }
    const err = new Error(errorMessage);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();

  if (!data.url) {
    console.error('❌ CDN response missing URL:', data);
    throw new Error('CDN upload succeeded but did not return a URL');
  }

  return {
    url: data.url,
    mimeType: data.mimeType || null,
  };
}

async function upload({ url, buffer, base64 }) {
  const isBuffer = !!buffer;
  console.log('🔄 Uploading to CDN...');
  console.log('📋 Upload type:', buffer ? 'buffer' : url ? 'url' : 'base64');

  const headers = buildProjectContextHeaders(isBuffer);
  const endpoints = getUploadEndpoints();
  const errors = [];

  for (const endpoint of endpoints) {
    try {
      const result = await attemptUpload(endpoint, { url, buffer, base64 }, headers);
      console.log(`✅ CDN upload successful via ${endpoint}:`, result.url);
      return result;
    } catch (error) {
      errors.push(`${endpoint} → ${error.message}`);
      console.warn(`⚠️ Upload failed via ${endpoint}:`, error.message);

      // Don't burn attempts on payload-size errors — no endpoint will accept it
      if (error.status === 413) {
        break;
      }
    }
  }

  console.error('❌ All CDN endpoints failed:');
  for (const e of errors) console.error('  •', e);

  // Surface the first (most authoritative) error to the caller
  throw new Error(`Upload to CDN failed: ${errors[0]?.split(' → ')[1] || 'Unknown error'}`);
}

export { upload };
export default upload;
