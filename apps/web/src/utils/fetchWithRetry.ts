// @ts-nocheck
/**
 * Fetch with short retries for network / 5xx / rate-limit failures.
 * Does NOT retry 4xx (except 408/429). Callers should treat only 404 as "not found".
 */
export async function fetchWithRetry(
  url,
  { attempts = 3, credentials = 'include', signal, headers } = {},
) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { credentials, signal, headers });
      if (res.status >= 500 || res.status === 429 || res.status === 408) {
        lastErr = new Error(`HTTP ${res.status}`);
        if (i < attempts - 1) {
          await new Promise((r) => setTimeout(r, 150 * (i + 1)));
          continue;
        }
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (signal?.aborted) throw err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 150 * (i + 1)));
        continue;
      }
    }
  }
  throw lastErr || new Error('Request failed');
}

export default fetchWithRetry;
