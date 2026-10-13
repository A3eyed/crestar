// @ts-nocheck
/**
 * Background video post queue (TikTok-style).
 * Tapping Post enqueues work and navigates away; upload continues while the
 * user browses. Listeners can show a toast when done or failed.
 */

const listeners = new Set();

let state = {
  status: 'idle', // idle | uploading | publishing | done | error
  message: '',
  progress: 0,
};

function emit() {
  listeners.forEach((fn) => {
    try {
      fn({ ...state });
    } catch {
      /* ignore */
    }
  });
}

export function subscribePostQueue(fn) {
  listeners.add(fn);
  fn({ ...state });
  return () => listeners.delete(fn);
}

export function getPostQueueState() {
  return { ...state };
}

function setState(patch) {
  state = { ...state, ...patch };
  emit();
}

async function putWithProgress(uploadUrl, file, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error('Upload failed (' + xhr.status + ')'));
    };
    xhr.onerror = () => reject(new Error('Network error while uploading'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.timeout = 10 * 60 * 1000;
    xhr.send(file);
  });
}

/**
 * Enqueue a video post. Returns immediately after starting the async job.
 */
export function enqueueVideoPost({ file, caption, taggedProducts }) {
  if (!file) {
    setState({ status: 'error', message: 'No video selected', progress: 0 });
    return;
  }
  if (!taggedProducts?.length) {
    setState({ status: 'error', message: 'Tag at least one product', progress: 0 });
    return;
  }

  // Fire-and-forget background job
  (async () => {
    try {
      setState({ status: 'uploading', message: 'Uploading…', progress: 0 });

      const contentType = file.type || 'video/webm';
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, folder: 'videos' }),
      });
      const presign = await presignRes.json().catch(() => ({}));
      if (!presignRes.ok || !presign.uploadUrl) {
        throw new Error(presign.error || 'Could not start upload');
      }

      await putWithProgress(
        presign.uploadUrl,
        file,
        presign.contentType || contentType,
        (pct) => setState({ status: 'uploading', message: 'Uploading… ' + pct + '%', progress: pct }),
      );

      setState({ status: 'publishing', message: 'Publishing…', progress: 100 });

      const postRes = await fetch('/api/videos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: presign.publicUrl,
          thumbnailUrl: null,
          caption: caption || '',
          durationSeconds: null,
          taggedProducts: taggedProducts.map((p) => ({
            productId: p.id || p.productId,
            serviceId: p.serviceId || null,
          })),
        }),
      });
      const postData = await postRes.json().catch(() => ({}));
      if (!postRes.ok) {
        throw new Error(postData.error || 'Could not publish video');
      }

      setState({ status: 'done', message: 'Video posted', progress: 100 });
      // Reset after a short delay so the toast can show
      setTimeout(() => {
        if (state.status === 'done') setState({ status: 'idle', message: '', progress: 0 });
      }, 4000);
    } catch (err) {
      console.error('Background post failed', err);
      setState({
        status: 'error',
        message: err?.message || 'Post failed',
        progress: 0,
      });
      setTimeout(() => {
        if (state.status === 'error') setState({ status: 'idle', message: '', progress: 0 });
      }, 6000);
    }
  })();
}
