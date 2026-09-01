/**
 * Small persistence bridge for navigation routes.
 *
 * The application's primary persistence layer is the backend (routes are
 * stored on `user.pages` and saved via the Assistant Builder / save-assistant
 * endpoint). This module additionally mirrors the routes to localStorage so
 * the assistant keeps working across refreshes even before a save, and so the
 * storage implementation can later be swapped for a dedicated API without
 * touching the rest of the app.
 */

const STORAGE_KEY = "anaya.navigationPages.v2";

const getDefaultStorage = () =>
  typeof localStorage !== "undefined" ? localStorage : null;

export const createNavigationStorage = (storage = getDefaultStorage()) => ({
  load() {
    if (!storage) return null;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  save(pages) {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(pages));
    } catch {
      /* storage full / unavailable - ignore */
    }
  },
  clear() {
    if (!storage) return;
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },
});

export const navigationStorage = createNavigationStorage();