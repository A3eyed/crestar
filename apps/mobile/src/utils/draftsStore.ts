// @ts-nocheck
import AsyncStorage from './safeStorage';
import * as FileSystem from 'expo-file-system/legacy';
import { create } from 'zustand';

/**
 * Video Drafts — TikTok-style local drafts for unposted videos.
 *
 * Drafts are stored on-device only (like TikTok):
 * - The video file is copied into the app's document directory so it
 *   survives cache clears.
 * - Draft metadata (caption, tagged products, created date) is stored
 *   in AsyncStorage.
 */

const DRAFTS_KEY = 'video_drafts';
const DRAFTS_DIR = `${FileSystem.documentDirectory}drafts/`;

const ensureDraftsDir = async () => {
  try {
    const info = await FileSystem.getInfoAsync(DRAFTS_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(DRAFTS_DIR, { intermediates: true });
    }
  } catch (e) {
    console.warn('Drafts dir error:', e?.message);
  }
};

export const getDrafts = async () => {
  try {
    const raw = await AsyncStorage.getItem(DRAFTS_KEY);
    const drafts = raw ? JSON.parse(raw) : [];
    return Array.isArray(drafts) ? drafts : [];
  } catch (e) {
    console.warn('Get drafts error:', e?.message);
    return [];
  }
};

export const saveDraft = async ({ videoUri, caption, taggedProducts }) => {
  try {
    await ensureDraftsDir();

    const id = `draft_${Date.now()}`;
    const ext = videoUri.split('.').pop()?.split('?')[0] || 'mp4';
    const persistedUri = `${DRAFTS_DIR}${id}.${ext}`;

    // Copy video into permanent storage so it survives cache clears
    await FileSystem.copyAsync({ from: videoUri, to: persistedUri });

    const draft = {
      id,
      videoUri: persistedUri,
      caption: caption || '',
      taggedProducts: taggedProducts || [],
      createdAt: new Date().toISOString(),
    };

    const drafts = await getDrafts();
    const updated = [draft, ...drafts];
    await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));

    return draft;
  } catch (e) {
    console.error('Save draft error:', e?.message);
    throw new Error('Could not save draft');
  }
};

export const deleteDraft = async (draftId) => {
  try {
    const drafts = await getDrafts();
    const draft = drafts.find((d) => d.id === draftId);

    // Remove the stored video file (best effort)
    if (draft?.videoUri) {
      try {
        await FileSystem.deleteAsync(draft.videoUri, { idempotent: true });
      } catch (e) {}
    }

    const updated = drafts.filter((d) => d.id !== draftId);
    await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Delete draft error:', e?.message);
    return getDrafts();
  }
};

export const getDraftCount = async () => {
  const drafts = await getDrafts();
  return drafts.length;
};

/**
 * Hand-off store: the Drafts screen selects a draft, the Create tab
 * picks it up and opens the preview/post screen with it.
 */
export const usePendingDraft = create((set) => ({
  pendingDraft: null,
  setPendingDraft: (draft) => set({ pendingDraft: draft }),
  clearPendingDraft: () => set({ pendingDraft: null }),
}));
