// @ts-nocheck
import { create } from 'zustand';

/**
 * Tracks whether the first meaningful screen (the feed) has content to paint.
 *
 * TikTok keeps the OS splash on screen until the feed is actually ready, then
 * fades straight into video. We do the same: the root layout waits on
 * `feedReady` before calling SplashScreen.hideAsync(), so there is never an
 * intermediate logo screen, spinner, or black gap between launch and landing.
 */
const useBootStore = create((set, get) => ({
  feedReady: false,
  markFeedReady: () => {
    if (get().feedReady) return;
    set({ feedReady: true });
  },
}));

export default useBootStore;
