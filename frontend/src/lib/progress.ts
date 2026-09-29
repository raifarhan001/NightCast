export interface LocalProgressItem {
  id: string | number;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  season?: number;
  episode?: number;
  timestamp_seconds: number;
  duration_seconds: number;
  progress_percent: number;
  updated_at: string;
}

const GLOBAL_LEGACY_KEY = 'nightcast_continue_watching';
const VIDLINK_LEGACY_KEY = 'vidLinkProgress';
const DISMISSED_CW_KEY = 'nightcast_dismissed_cw';

export function getDismissedMediaIds(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DISMISSED_CW_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function isDismissedFromContinueWatching(id: string | number, updatedAt?: string): boolean {
  if (typeof window === 'undefined') return false;
  const cleanId = getCleanMediaId(id);
  if (!cleanId) return false;
  const dismissed = getDismissedMediaIds();
  const dismissedTime = dismissed[cleanId];
  if (!dismissedTime) return false;

  // If item was watched after dismissal, it is no longer dismissed
  if (updatedAt) {
    const itemTime = new Date(updatedAt).getTime();
    if (itemTime > dismissedTime + 2000) {
      clearDismissedMediaId(cleanId);
      return false;
    }
  }
  return true;
}

export function clearDismissedMediaId(id: string | number): void {
  if (typeof window === 'undefined') return;
  const cleanId = getCleanMediaId(id);
  if (!cleanId) return;
  try {
    const dismissed = getDismissedMediaIds();
    if (dismissed[cleanId]) {
      delete dismissed[cleanId];
      localStorage.setItem(DISMISSED_CW_KEY, JSON.stringify(dismissed));
    }
  } catch {}
}

export function markDismissedFromContinueWatching(id: string | number): void {
  if (typeof window === 'undefined') return;
  const cleanId = getCleanMediaId(id);
  if (!cleanId) return;
  try {
    const dismissed = getDismissedMediaIds();
    dismissed[cleanId] = Date.now();
    localStorage.setItem(DISMISSED_CW_KEY, JSON.stringify(dismissed));
  } catch {}
}

/**
 * Normalizes any composite or dirty media ID (e.g. "205715_s1e4", "205715-s1e1", 205715)
 * into a clean base TMDB integer ID ("205715").
 */
export function getCleanMediaId(id: string | number | undefined | null): string {
  if (!id && id !== 0) return '';
  const str = String(id).trim();
  const match = str.match(/^(\d+)/);
  return match ? match[1] : str.split('_')[0].split('-')[0].trim();
}

/**
 * Resolves the profile-scoped localStorage key so users/profiles never mix.
 */
export function getStorageKey(profileId?: string | null): string {
  if (profileId) {
    return `nightcast_cw_${profileId}`;
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('active_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id) return `nightcast_cw_${parsed.id}`;
      }
    } catch {}
  }
  return 'nightcast_cw_guest';
}

function notifyProgressUpdate(detail?: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nightcast:progress-update', { detail }));
  }
}

/**
 * Read the map from localStorage with fallback migration from legacy key.
 */
function readStorageMap(storageKey: string): Record<string, LocalProgressItem> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      return JSON.parse(raw);
    }
    // If scoped key is empty, check if we have data in the legacy global key
    const legacyRaw = localStorage.getItem(GLOBAL_LEGACY_KEY);
    if (legacyRaw) {
      const legacyMap = JSON.parse(legacyRaw);
      if (legacyMap && Object.keys(legacyMap).length > 0) {
        // Migrate to current key
        localStorage.setItem(storageKey, legacyRaw);
        return legacyMap;
      }
    }
  } catch (err) {
    console.error("Error reading progress storage", err);
  }
  return {};
}

/**
 * Writes the map safely to localStorage.
 */
function writeStorageMap(storageKey: string, map: Record<string, LocalProgressItem>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(map));
  } catch (err) {
    console.error("Error saving progress storage", err);
  }
}

export function saveWatchProgress(
  item: Omit<LocalProgressItem, 'updated_at'> & {
    next_season?: number;
    next_episode?: number;
  },
  profileId?: string | null
): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanId = getCleanMediaId(item.id);
    if (!cleanId) return;

    // Un-dismiss if actively watching now
    clearDismissedMediaId(cleanId);

    const storageKey = getStorageKey(profileId);
    const map = readStorageMap(storageKey);

    const duration = Number(item.duration_seconds) || 0;
    const current = Number(item.timestamp_seconds) || 0;
    const progress = Number(item.progress_percent) || (duration > 0 ? (current / duration) * 100 : 0);

    const isTv = item.media_type === 'tv' || (item.season !== undefined && item.season !== null);
    const key = isTv
      ? `${cleanId}_s${item.season || 1}e${item.episode || 1}`
      : cleanId;

    const isCompleted = progress >= 90.0 || (duration > 60 && current >= duration - 25);

    if (isCompleted) {
      delete map[key];
      delete map[cleanId];
      if (!isTv) {
        for (const k of Object.keys(map)) {
          if (getCleanMediaId(k) === cleanId) {
            delete map[k];
          }
        }
      }

      // If this was a TV episode and a next episode exists, auto-advance Continue Watching
      if (isTv && item.next_season && item.next_episode) {
        const nextKey = `${cleanId}_s${item.next_season}e${item.next_episode}`;
        map[nextKey] = {
          ...item,
          id: cleanId,
          media_type: 'tv',
          season: item.next_season,
          episode: item.next_episode,
          timestamp_seconds: 0,
          duration_seconds: duration,
          progress_percent: 0.5, // marker indicating Up Next
          updated_at: new Date().toISOString(),
        };
      }
    } else {
      map[key] = {
        ...item,
        id: cleanId,
        media_type: isTv ? 'tv' : 'movie',
        timestamp_seconds: current,
        duration_seconds: duration,
        progress_percent: Math.min(Math.max(progress, 0), 100),
        updated_at: new Date().toISOString(),
      };
      if (!isTv) {
        for (const k of Object.keys(map)) {
          if (k !== cleanId && getCleanMediaId(k) === cleanId) {
            delete map[k];
          }
        }
      }
    }

    writeStorageMap(storageKey, map);

    // Also update legacy storage for backwards compatibility
    try {
      const rawLegacy = localStorage.getItem(VIDLINK_LEGACY_KEY);
      const mapLegacy = rawLegacy ? JSON.parse(rawLegacy) : {};
      if (isCompleted) {
        delete mapLegacy[key];
      } else {
        mapLegacy[key] = { watched: current, duration, progress };
      }
      localStorage.setItem(VIDLINK_LEGACY_KEY, JSON.stringify(mapLegacy));
    } catch {}

    notifyProgressUpdate({ key, item: { ...item, id: cleanId }, profileId });
  } catch (e) {
    console.error("Error saving watch progress", e);
  }
}

export function getContinueWatchingList(profileId?: string | null): LocalProgressItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const storageKey = getStorageKey(profileId);
    const map = readStorageMap(storageKey);
    const items = Object.values(map);

    let storageChanged = false;
    const showMap = new Map<string, LocalProgressItem>();

    for (const item of items) {
      if (!item || (!item.id && item.id !== 0)) continue;

      const cleanId = getCleanMediaId(item.id);
      if (!cleanId) continue;

      // Filter out explicitly dismissed items
      if (isDismissedFromContinueWatching(cleanId, item.updated_at)) {
        continue;
      }

      const duration = Number(item.duration_seconds) || 0;
      const current = Number(item.timestamp_seconds) || 0;
      const progress = Number(item.progress_percent) || 0;

      // 1. Purge finished items
      if (progress >= 90.0 || (duration > 60 && current >= duration - 25)) {
        const itemKey = item.media_type === 'tv'
          ? `${cleanId}_s${item.season || 1}e${item.episode || 1}`
          : cleanId;
        delete map[itemKey];
        delete map[String(item.id)];
        storageChanged = true;
        continue;
      }

      // 2. Validate content has been engaged with or is up next marker
      const isUpNextMarker = item.media_type === 'tv' && item.season !== undefined && item.episode !== undefined;
      const hasWatchedContent = current >= 3 || progress >= 0.5;

      if (!isUpNextMarker && !hasWatchedContent) {
        const itemKey = item.media_type === 'tv'
          ? `${cleanId}_s${item.season || 1}e${item.episode || 1}`
          : cleanId;
        delete map[itemKey];
        delete map[String(item.id)];
        storageChanged = true;
        continue;
      }

      // 3. Deduplicate TV episodes for the same show (keep latest/highest)
      const existing = showMap.get(cleanId);
      const normalizedItem: LocalProgressItem = {
        ...item,
        id: cleanId,
        progress_percent: progress,
        timestamp_seconds: current,
        duration_seconds: duration,
      };

      if (!existing) {
        showMap.set(cleanId, normalizedItem);
      } else {
        const itemEpScore = ((item.season || 1) * 1000) + (item.episode || 1);
        const existEpScore = ((existing.season || 1) * 1000) + (existing.episode || 1);
        const itemTime = item.updated_at ? new Date(item.updated_at).getTime() : 0;
        const existTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;

        if (itemTime > existTime || (itemEpScore > existEpScore && itemTime >= existTime - 60000)) {
          showMap.set(cleanId, normalizedItem);
        }
      }
    }

    if (storageChanged) {
      writeStorageMap(storageKey, map);
    }

    return Array.from(showMap.values()).sort((a, b) => {
      const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return timeB - timeA;
    });
  } catch (e) {
    console.error("Error loading continue watching", e);
    return [];
  }
}

export function getSavedTimestamp(
  id: string | number,
  season?: number,
  episode?: number,
  mediaType?: 'movie' | 'tv',
  profileId?: string | null
): number {
  if (typeof window === 'undefined') return 0;
  try {
    const cleanId = getCleanMediaId(id);
    if (!cleanId) return 0;

    const storageKey = getStorageKey(profileId);
    const map = readStorageMap(storageKey);
    const isTv = mediaType === 'tv' || (season !== undefined && episode !== undefined);

    // 1. If TV series with season and episode:
    if (isTv && season && episode) {
      const specificKey = `${cleanId}_s${season}e${episode}`;
      const entry = map[specificKey];
      if (entry && Number(entry.timestamp_seconds) > 3) {
        return Math.floor(Number(entry.timestamp_seconds));
      }

      for (const [k, item] of Object.entries(map)) {
        if (getCleanMediaId(k) === cleanId) {
          if (item.season === season && item.episode === episode) {
            if (Number(item.timestamp_seconds) > 3) {
              return Math.floor(Number(item.timestamp_seconds));
            }
          }
        }
      }
      return 0;
    }

    // 2. If movie:
    if (!isTv) {
      const entry = map[cleanId] || map[String(id)];
      if (entry && Number(entry.timestamp_seconds) > 3) {
        return Math.floor(Number(entry.timestamp_seconds));
      }

      for (const [k, item] of Object.entries(map)) {
        if (getCleanMediaId(k) === cleanId && (item.media_type === 'movie' || !item.season)) {
          if (Number(item.timestamp_seconds) > 3) {
            return Math.floor(Number(item.timestamp_seconds));
          }
        }
      }
    }
  } catch (e) {
    console.error("Error reading saved timestamp", e);
  }
  return 0;
}

export function removeWatchProgress(
  id: string | number,
  season?: number,
  episode?: number,
  profileId?: string | null
): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanId = getCleanMediaId(id);
    if (!cleanId) return;

    // 1. Permanently register dismissal tombstone so it won't resurrect on refresh
    markDismissedFromContinueWatching(cleanId);

    // 2. Helper to clean an item from any storage dictionary
    const purgeKey = (sKey: string) => {
      try {
        const raw = localStorage.getItem(sKey);
        if (!raw) return;
        const map = JSON.parse(raw);
        let changed = false;
        if (map[cleanId] || map[String(id)]) {
          delete map[cleanId];
          delete map[String(id)];
          changed = true;
        }
        for (const k of Object.keys(map)) {
          if (k === cleanId || k.startsWith(`${cleanId}_`) || k.startsWith(`${cleanId}-`)) {
            delete map[k];
            changed = true;
          }
        }
        if (changed) {
          localStorage.setItem(sKey, JSON.stringify(map));
        }
      } catch {}
    };

    // 3. Purge across all known continue watching scopes
    const targetStorageKey = getStorageKey(profileId);
    purgeKey(targetStorageKey);
    purgeKey('nightcast_cw_guest');
    purgeKey(GLOBAL_LEGACY_KEY);

    // Also scan all localStorage keys to remove from any existing profile scope
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('nightcast_cw_') || k === GLOBAL_LEGACY_KEY)) {
          purgeKey(k);
        }
      }
    } catch {}

    // 4. Clean legacy VidLink storage as well
    try {
      const rawLegacy = localStorage.getItem(VIDLINK_LEGACY_KEY);
      if (rawLegacy) {
        const mapLegacy = JSON.parse(rawLegacy);
        delete mapLegacy[cleanId];
        delete mapLegacy[String(id)];
        for (const k of Object.keys(mapLegacy)) {
          if (k === cleanId || k.startsWith(`${cleanId}_`)) {
            delete mapLegacy[k];
          }
        }
        localStorage.setItem(VIDLINK_LEGACY_KEY, JSON.stringify(mapLegacy));
      }
    } catch {}

    notifyProgressUpdate({ id: cleanId, season, episode, removed: true, profileId });
  } catch (e) {
    console.error("Error removing watch progress", e);
  }
}

export function clearAllWatchProgress(profileId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const storageKey = getStorageKey(profileId);
    localStorage.removeItem(storageKey);
    notifyProgressUpdate({ clearedAll: true, profileId });
  } catch (e) {
    console.error("Error clearing watch progress", e);
  }
}
