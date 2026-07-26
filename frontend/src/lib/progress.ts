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

export function saveWatchProgress(item: Omit<LocalProgressItem, 'updated_at'>): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const map: Record<string, LocalProgressItem> = raw ? JSON.parse(raw) : {};

    const key = item.media_type === 'tv'
      ? `${item.id}_s${item.season || 1}e${item.episode || 1}`
      : `${item.id}`;

    // If progress is near completion (>95%), remove from continue watching
    if (item.progress_percent >= 95.0 || item.timestamp_seconds >= (item.duration_seconds * 0.95)) {
      delete map[key];
    } else if (item.timestamp_seconds > 5) {
      map[key] = {
        ...item,
        updated_at: new Date().toISOString(),
      };
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));

    // Maintain backwards compatibility with legacy key
    const rawLegacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    const mapLegacy = rawLegacy ? JSON.parse(rawLegacy) : {};
    mapLegacy[key] = {
      watched: item.timestamp_seconds,
      duration: item.duration_seconds,
      progress: item.progress_percent,
    };
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(mapLegacy));
  } catch (e) {
    console.error("Error saving watch progress to localStorage", e);
  }
}

export function getContinueWatchingList(): LocalProgressItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const map: Record<string, LocalProgressItem> = JSON.parse(raw);
    const items = Object.values(map);
    // Sort by updated_at descending
    return items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  } catch (e) {
    console.error("Error loading continue watching from localStorage", e);
    return [];
  }
}

export function getSavedTimestamp(id: string | number, season?: number, episode?: number): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const map: Record<string, LocalProgressItem> = JSON.parse(raw);
      const key = season && episode ? `${id}_s${season}e${episode}` : `${id}`;
      const entry = map[key];
      if (entry && entry.timestamp_seconds > 5) {
        return Math.floor(entry.timestamp_seconds);
      }
    }

    // Legacy fallback check
    const rawLegacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawLegacy) {
      const mapLegacy = JSON.parse(rawLegacy);
      const key = season && episode ? `${id}_s${season}e${episode}` : `${id}`;
      const entry = mapLegacy[key];
      const watched = entry?.watched ?? entry?.progress?.watched ?? 0;
      if (watched > 5) return Math.floor(watched);
    }
  } catch (e) {
    console.error("Error reading saved timestamp", e);
  }
  return 0;
}

export function removeWatchProgress(id: string | number, season?: number, episode?: number): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const map: Record<string, LocalProgressItem> = JSON.parse(raw);
    const key = season && episode ? `${id}_s${season}e${episode}` : `${id}`;
    delete map[key];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Error removing watch progress", e);
  }
}
