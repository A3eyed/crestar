// @ts-nocheck
/**
 * Crestar feed preferences — client-side first so the feed feels responsive.
 * "Not for me" hides a video; muted creators are skipped in the session list.
 */

const KEY = 'crestar_feed_prefs_v1';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { hiddenVideoIds: [], mutedCreatorIds: [] };
    const p = JSON.parse(raw);
    return {
      hiddenVideoIds: Array.isArray(p.hiddenVideoIds) ? p.hiddenVideoIds.map(String) : [],
      mutedCreatorIds: Array.isArray(p.mutedCreatorIds) ? p.mutedCreatorIds.map(String) : [],
    };
  } catch {
    return { hiddenVideoIds: [], mutedCreatorIds: [] };
  }
}

function write(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* quota */
  }
}

export function getFeedPreferences() {
  return read();
}

export function hideVideo(videoId) {
  const p = read();
  const id = String(videoId);
  if (!p.hiddenVideoIds.includes(id)) p.hiddenVideoIds.push(id);
  // Cap list so localStorage stays small
  if (p.hiddenVideoIds.length > 400) p.hiddenVideoIds = p.hiddenVideoIds.slice(-400);
  write(p);
  return p;
}

export function muteCreator(creatorId) {
  const p = read();
  const id = String(creatorId);
  if (!p.mutedCreatorIds.includes(id)) p.mutedCreatorIds.push(id);
  if (p.mutedCreatorIds.length > 200) p.mutedCreatorIds = p.mutedCreatorIds.slice(-200);
  write(p);
  return p;
}

export function filterFeedItems(items) {
  const p = read();
  const hidden = new Set(p.hiddenVideoIds);
  const muted = new Set(p.mutedCreatorIds);
  return (items || []).filter((item) => {
    const vid = String(item.id || '');
    const cid = String(item.creator_user_id || item.creatorUserId || item.sellerId || '');
    if (hidden.has(vid)) return false;
    if (cid && muted.has(cid)) return false;
    return true;
  });
}
