// @ts-nocheck
/**
 * Cloudflare Stream Live Inputs
 *
 * Env (set in Cloudflare / hosting secrets — never commit):
 *   CLOUDFLARE_ACCOUNT_ID   — same as R2 account id if one CF account
 *   CLOUDFLARE_API_TOKEN    — API token with Stream:Edit (or Account Stream Write)
 *
 * Creates one Live Input per Crestar live session.
 * Host publishes with WHIP (browser) or RTMPS (OBS).
 * Viewers play with WHEP (low latency) or HLS.
 */

const ACCOUNT_ID = () =>
  process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || '';
const API_TOKEN = () =>
  process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || '';

function streamApiBase() {
  const id = ACCOUNT_ID();
  if (!id) throw new Error('CLOUDFLARE_ACCOUNT_ID is not set');
  return `https://api.cloudflare.com/client/v4/accounts/${id}/stream`;
}

function authHeaders() {
  const token = API_TOKEN();
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN is not set');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export function isStreamConfigured() {
  return Boolean(ACCOUNT_ID() && API_TOKEN());
}

/**
 * Create a Live Input for a Crestar shopping session.
 * Returns ingest + playback endpoints.
 */
export async function createLiveInput({ name, sessionId }) {
  const res = await fetch(`${streamApiBase()}/live_inputs`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      meta: {
        name: name || 'Crestar Live Shopping',
        crestar_session_id: sessionId || '',
      },
      recording: {
        mode: 'automatic',
        requireSignedURLs: false,
        hideLiveViewerCount: false,
      },
      preferLowLatency: true,
      deleteRecordingAfterDays: 30,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    const msg =
      data?.errors?.[0]?.message || data?.messages?.[0]?.message || res.statusText;
    throw new Error(`Cloudflare Stream create live input failed: ${msg}`);
  }

  const input = data.result;
  return {
    uid: input.uid,
    // Host-only (secret)
    webrtcPublishUrl: input.webRTC?.url || null,
    rtmpsUrl: input.rtmps?.url || null,
    rtmpsStreamKey: input.rtmps?.streamKey || null,
    // Safe for viewers
    hlsUrl: input.playback?.hls || null,
    dashUrl: input.playback?.dash || null,
    webrtcPlaybackUrl: input.webRTCPlayback?.url || null,
    raw: input,
  };
}

/** Disable ingest so the host can no longer push (call when session ends). */
export async function disableLiveInput(uid) {
  if (!uid) return;
  try {
    const res = await fetch(`${streamApiBase()}/live_inputs/${uid}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ enabled: false }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      console.warn('[stream] disableLiveInput soft-fail:', data?.errors || res.status);
    }
  } catch (err) {
    console.warn('[stream] disableLiveInput error:', err.message);
  }
}

/** Optional: delete the live input after end to free quota. */
export async function deleteLiveInput(uid) {
  if (!uid) return;
  try {
    await fetch(`${streamApiBase()}/live_inputs/${uid}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  } catch (err) {
    console.warn('[stream] deleteLiveInput error:', err.message);
  }
}
