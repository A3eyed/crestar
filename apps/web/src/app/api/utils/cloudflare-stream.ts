// @ts-nocheck
/**
 * Cloudflare Stream Live Inputs
 *
 * Env (Cloudflare / hosting secrets — never commit):
 *   CLOUDFLARE_ACCOUNT_ID  — or R2_ACCOUNT_ID
 *   CLOUDFLARE_API_TOKEN   — Stream:Edit (or CF_API_TOKEN)
 */

const ACCOUNT_ID = () =>
  process.env.CLOUDFLARE_ACCOUNT_ID ||
  process.env.R2_ACCOUNT_ID ||
  '';

const API_TOKEN = () =>
  process.env.CLOUDFLARE_API_TOKEN ||
  process.env.CF_API_TOKEN ||
  process.env.CLOUDFLARE_STREAM_API_TOKEN ||
  '';

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

/** Lightweight probe for ops / health checks */
export async function probeStreamAccess() {
  if (!isStreamConfigured()) {
    return { ok: false, reason: 'missing_env', accountId: Boolean(ACCOUNT_ID()) };
  }
  try {
    const res = await fetch(`${streamApiBase()}/live_inputs?per_page=1`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      const msg =
        data?.messages?.[0]?.message ||
        data?.errors?.[0]?.message ||
        res.statusText;
      return { ok: false, reason: msg, status: res.status };
    }
    return { ok: true, liveInputCount: Array.isArray(data.result) ? data.result.length : null };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

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
    webrtcPublishUrl: input.webRTC?.url || null,
    rtmpsUrl: input.rtmps?.url || null,
    rtmpsStreamKey: input.rtmps?.streamKey || null,
    hlsUrl: input.playback?.hls || null,
    dashUrl: input.playback?.dash || null,
    webrtcPlaybackUrl: input.webRTCPlayback?.url || null,
    raw: input,
  };
}

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
