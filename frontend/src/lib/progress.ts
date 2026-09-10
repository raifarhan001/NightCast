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

const STORAGE_KEY = 'nightcast_continue_watching';
const LEGACY_STORAGE_KEY = 'vidLinkProgress';

/**
 * Normalizes any composite or dirty media ID (e.g. "205715_s1e4", "205715-s1e1", 205715)
 * into a clean base TMDB ID ("205715").
 */
export function getCleanMediaId(id: string | number | undefined | null): string {
  if (!id) return '';
  const str = String(id).trim();
  const match = str.match(/^(\d+)/);
  return match ? match[1] : str.split('_')[0].split('-')[0].trim();
}

function notifyProgressUpdate(detail?: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nightcast:progress-update', { detail }));
  }
}

export function saveWatchProgress(
  item: Omit<LocalProgressItem, 'updated_at'> & {
    next_season?: number;
    next_episode?: number;
  }
): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const map: Record<string, LocalProgressItem> = raw ? JSON.parse(raw) : {};

    const cleanId = getCleanMediaId(item.id);
    if (!cleanId) return;

    const duration = Number(item.duration_seconds) || 0;
    const current = Number(item.timestamp_seconds) || 0;
    const progress = Number(item.progress_percent) || (duration > 0 ? (current / duration) * 100 : 0);

    const key = item.media_type === 'tv'
      ? `${cleanId}_s${item.season || 1}e${item.episode || 1}`
      : cleanId;

    const isCompleted = progress >= 92.0 || (duration > 60 && current >= duration - 30);

    if (isCompleted) {
      delete map[key];
      delete map[cleanId];
      if (item.media_type === 'movie') {
        for (const k of Object.keys(map)) {
          if (getCleanMediaId(k) === cleanId) {
            delete map[k];
          }
        }
      }

      // If this was a TV episode and a next episode exists, auto-advance Continue Watching to the next episode!
      if (item.media_type === 'tv' && item.next_season && item.next_episode) {
        const nextKey = `${cleanId}_s${item.next_season}e${item.next_episode}`;
        map[nextKey] = {
          ...item,
          id: cleanId,
          season: item.next_season,
          episode: item.next_episode,
          timestamp_seconds: 0,
          duration_seconds: duration,
          progress_percent: 1, // Fresh 1% marker indicating up next
          updated_at: new Date().toISOString(),
        };
      }
    } else {
      map[key] = {
        ...item,
        id: cleanId,
        timestamp_seconds: current,
        duration_seconds: duration,
        progress_percent: Math.min(Math.max(progress, 0), 100),
        updated_at: new Date().toISOString(),
      };
      if (item.media_type === 'movie') {
        for (const k of Object.keys(map)) {
          if (k !== cleanId && getCleanMediaId(k) === cleanId) {
            delete map[k];
          }
        }
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));

    // Maintain backwards compatibility with legacy key
    try {
      const rawLegacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      const mapLegacy = rawLegacy ? JSON.parse(rawLegacy) : {};
      if (isCompleted) {
        delete mapLegacy[key];
      } else {
        mapLegacy[key] = {
          watched: current,
          duration: duration,
          progress: progress,
        };
      }
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(mapLegacy));
    } catch {
      // Ignore legacy errors
    }

    notifyProgressUpdate({ key, item: { ...item, id: cleanId } });
  } catch (e) {
    console.error("Error saving watch progress to localStorage", e);
  }
}

export function getContinueWatchingList(): LocalProgressItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    let map: Record<string, LocalProgressItem> = {};
    try {
      map = JSON.parse(raw);
    } catch {
      return [];
    }

    const items = Object.values(map);
    let storageChanged = false;

    // Group by clean show ID so each movie or TV series has exactly ONE entry (the latest watched)
    const showMap = new Map<string, LocalProgressItem>();

    for (const item of items) {
      if (!item || !item.id) continue;

      const cleanId = getCleanMediaId(item.id);
      if (!cleanId) continue;

      const duration = Number(item.duration_seconds) || 0;
      const current = Number(item.timestamp_seconds) || 0;
      const progress = Number(item.progress_percent) || 0;

      // 1. Purge finished items (>= 92% or within 30s of end)
      if (progress >= 92.0 || (duration > 60 && current >= duration - 30)) {
        const itemKey = item.media_type === 'tv'
          ? `${cleanId}_s${item.season || 1}e${item.episode || 1}`
          : cleanId;
        delete map[itemKey];
        delete map[String(item.id)];
        storageChanged = true;
        continue;
      }

      // 2. Purge unstarted ghost items (< 1.5% and < 15s)
      if (current < 15 && progress < 1.5) {
        const itemKey = item.media_type === 'tv'
          ? `${cleanId}_s${item.season || 1}e${item.episode || 1}`
          : cleanId;
        delete map[itemKey];
        delete map[String(item.id)];
        storageChanged = true;
        continue;
      }

      // 3. Deduplicate TV episodes for the same show (keep latest episode)
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

        // Choose item with later update time, or higher episode if within 1 minute
        if (itemTime > existTime || (itemEpScore > existEpScore && itemTime >= existTime - 60000)) {
          showMap.set(cleanId, normalizedItem);
        }
      }
    }

    // If ghost or completed entries were purged, update localStorage so storage stays clean permanently
    if (storageChanged) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      } catch {
        // Ignore write error
      }
    }

    return Array.from(showMap.values()).sort((a, b) => {
      const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return timeB - timeA;
    });
  } catch (e) {
    console.error("Error loading continue watching from localStorage", e);
    return [];
  }
}

export function getSavedTimestamp(
  id: string | number,
  season?: number,
  episode?: number,
  mediaType?: 'movie' | 'tv'
): number {
  if (typeof window === 'undefined') return 0;
  try {
    const cleanId = getCleanMediaId(id);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const map: Record<string, LocalProgressItem> = JSON.parse(raw);

      // 1. If mediaType is 'movie' OR neither season nor episode is specified:
      if (mediaType === 'movie' || (!season && !episode)) {
        const entry = map[cleanId] || map[String(id)];
        if (entry && Number(entry.timestamp_seconds) > 5) {
          return Math.floor(Number(entry.timestamp_seconds));
        }
        // Also check any legacy/composite keys matching cleanId
        for (const [k, item] of Object.entries(map)) {
          if (getCleanMediaId(k) === cleanId && Number(item.timestamp_seconds) > 5) {
            return Math.floor(Number(item.timestamp_seconds));
          }
        }
      }

      // 2. If season and episode are provided (TV series):
      if (season && episode) {
        const specificKey = `${cleanId}_s${season}e${episode}`;
        const entry = map[specificKey];
        if (entry && Number(entry.timestamp_seconds) > 5) {
          return Math.floor(Number(entry.timestamp_seconds));
        }
      }

      // 3. Fallback: check base cleanId directly
      const baseEntry = map[cleanId] || map[String(id)];
      if (baseEntry && Number(baseEntry.timestamp_seconds) > 5) {
        return Math.floor(Number(baseEntry.timestamp_seconds));
      }

      // 4. If looking for matching season & episode across map entries
      if (season && episode) {
        for (const [k, item] of Object.entries(map)) {
          if (k.startsWith(`${cleanId}_`)) {
            if (item.season === season && item.episode === episode) {
              if (Number(item.timestamp_seconds) > 5) {
                return Math.floor(Number(item.timestamp_seconds));
              }
            }
          }
        }
      }

      // 5. Ultimate fallback: any entry with cleanId matching
      for (const [k, item] of Object.entries(map)) {
        if (getCleanMediaId(k) === cleanId && Number(item.timestamp_seconds) > 5) {
          return Math.floor(Number(item.timestamp_seconds));
        }
      }
    }

    // Legacy fallback check
    const rawLegacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawLegacy) {
      const mapLegacy = JSON.parse(rawLegacy);
      const specificKey = season && episode ? `${cleanId}_s${season}e${episode}` : cleanId;
      const entry = mapLegacy[specificKey] || mapLegacy[cleanId];
      const watched = entry?.watched ?? entry?.progress?.watched ?? 0;
      if (watched > 5) return Math.floor(watched);

      for (const [k, v] of Object.entries<any>(mapLegacy)) {
        if (getCleanMediaId(k) === cleanId) {
          const w = v?.watched ?? v?.progress?.watched ?? 0;
          if (w > 5) return Math.floor(w);
        }
      }
    }
  } catch (e) {
    console.error("Error reading saved timestamp", e);
  }
  return 0;
}

export function removeWatchProgress(id: string | number, season?: number, episode?: number): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanId = getCleanMediaId(id);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const map: Record<string, LocalProgressItem> = JSON.parse(raw);
      delete map[cleanId];
      delete map[String(id)];
      // Remove all episode entries for this show so it is completely dismissed
      for (const k of Object.keys(map)) {
        if (k === cleanId || k.startsWith(`${cleanId}_`) || k.startsWith(`${cleanId}-`)) {
          delete map[k];
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    }

    const rawLegacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawLegacy) {
      const mapLegacy = JSON.parse(rawLegacy);
      delete mapLegacy[cleanId];
      delete mapLegacy[String(id)];
      for (const k of Object.keys(mapLegacy)) {
        if (k === cleanId || k.startsWith(`${cleanId}_`) || k.startsWith(`${cleanId}-`)) {
          delete mapLegacy[k];
        }
      }
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(mapLegacy));
    }

    notifyProgressUpdate({ id: cleanId, season, episode, removed: true });
  } catch (e) {
    console.error("Error removing watch progress", e);
  }
}

export function clearAllWatchProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    notifyProgressUpdate({ clearedAll: true });
  } catch (e) {
    console.error("Error clearing watch progress", e);
  }
}
