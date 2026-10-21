// @ts-nocheck
/** Crestar video drafts — resume posting later without losing caption / tags. */

const KEY = 'crestar_video_drafts_v1';

export function listDrafts() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveDraft({ id, caption, taggedProductIds, previewName }) {
  const list = listDrafts();
  const draft = {
    id: id || 'draft_' + Date.now(),
    caption: caption || '',
    taggedProductIds: taggedProductIds || [],
    previewName: previewName || 'Video draft',
    updatedAt: new Date().toISOString(),
  };
  const next = [draft, ...list.filter((d) => d.id !== draft.id)].slice(0, 8);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  return draft;
}

export function removeDraft(id) {
  const next = listDrafts().filter((d) => d.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}
