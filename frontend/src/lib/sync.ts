import { apiFetch } from './api';
import { getCleanMediaId, getStorageKey, isDismissedFromContinueWatching, getDismissedMediaIds, LocalProgressItem } from './progress';

const STORAGE_WL_KEY = 'nightcast_watchlist';

export async function syncUserDataWithCloud(profileId?: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const storageKey = getStorageKey(profileId);

    // 1. Gather local continue watching from scoped storage
    let localCw: any[] = [];
    const rawCw = localStorage.getItem(storageKey);
    let cwMap: Record<string, LocalProgressItem> = {};

    if (rawCw) {
      try {
        cwMap = JSON.parse(rawCw);
      } catch {}
    }

    // If logging into a profile, also check if guest has items to merge
    if (profileId) {
      try {
        const guestRaw = localStorage.getItem('nightcast_cw_guest');
        if (guestRaw) {
          const guestMap = JSON.parse(guestRaw);
          for (const [k, v] of Object.entries<LocalProgressItem>(guestMap)) {
            const guestCleanId = getCleanMediaId(v.id || k);
            if (!isDismissedFromContinueWatching(guestCleanId, v.updated_at) && !cwMap[k]) {
              cwMap[k] = v;
            }
          }
          // Clear guest map now that it's adopted
          localStorage.removeItem('nightcast_cw_guest');
        }
      } catch {}
    }

    localCw = Object.values(cwMap)
      .filter((item: any) => item && (item.id || item.media_id))
      .map((item: any) => ({
        id: String(item.id || item.media_id || ''),
        media_id: String(item.media_id || item.id || ''),
        media_type: String(item.media_type || 'movie'),
        title: String(item.title || item.name || 'Untitled'),
        poster_path: item.poster_path ? String(item.poster_path) : null,
        backdrop_path: item.backdrop_path ? String(item.backdrop_path) : null,
        season: item.season !== undefined && item.season !== null ? Number(item.season) : null,
        episode: item.episode !== undefined && item.episode !== null ? Number(item.episode) : null,
        progress_percent: Number(item.progress_percent || 0),
        timestamp_seconds: Number(item.timestamp_seconds || 0),
        duration_seconds: Number(item.duration_seconds || 0),
        updated_at: item.updated_at ? String(item.updated_at) : new Date().toISOString(),
      }))
      .filter((item: any) => {
        const cleanId = getCleanMediaId(item.media_id || item.id);
        if (isDismissedFromContinueWatching(cleanId, item.updated_at)) return false;
        const prog = item.progress_percent;
        const secs = item.timestamp_seconds;
        return (prog >= 0.5 || secs >= 3.0) && prog < 90.0;
      });

    // 2. Gather local watchlist
    let localWl: any[] = [];
    const rawWl = localStorage.getItem(STORAGE_WL_KEY);
    if (rawWl) {
      try {
        const parsed = JSON.parse(rawWl);
        localWl = Object.values(parsed)
          .filter((item: any) => item && (item.id || item.media_id))
          .map((item: any) => ({
            id: String(item.id || item.media_id || ''),
            media_id: String(item.media_id || item.id || ''),
            media_type: String(item.media_type || 'movie'),
            title: String(item.title || item.name || 'Untitled'),
            poster_path: item.poster_path ? String(item.poster_path) : null,
          }));
      } catch {}
    }

    const headers: Record<string, string> = {};
    if (profileId) {
      headers['X-Profile-ID'] = profileId;
    }

    const dismissedIds = Object.keys(getDismissedMediaIds());

    // 3. Post to /api/user/sync
    const response = await apiFetch('/api/user/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        continue_watching: localCw,
        watchlist: localWl,
        dismissed_ids: dismissedIds,
      }),
    });

    if (!response) return;

    // 4. Update local scoped continue watching with cloud items
    if (Array.isArray(response.continue_watching)) {
      for (const item of response.continue_watching) {
        const cleanId = getCleanMediaId(item.media_id || item.id);
        const itemProg = Number(item.progress_percent || 0);
        if (!cleanId || itemProg >= 90.0 || isDismissedFromContinueWatching(cleanId, item.updated_at)) continue;
        const isTv = item.media_type === 'tv' || (item.season !== undefined && item.season !== null);
        const key = isTv && item.season && item.episode
          ? `${cleanId}_s${item.season}e${item.episode}`
          : cleanId;

        const cloudEpScore = ((item.season || 1) * 1000) + (item.episode || 1);
        const cloudTime = item.updated_at ? new Date(item.updated_at).getTime() : 0;

        let bestLocalKey: string | null = null;
        let bestLocalEpScore = -1;
        let bestLocalTime = 0;
        for (const [k, v] of Object.entries(cwMap)) {
          if (getCleanMediaId(v.id) === cleanId) {
            const localEpScore = ((v.season || 1) * 1000) + (v.episode || 1);
            const localTime = v.updated_at ? new Date(v.updated_at).getTime() : 0;
            if (localEpScore > bestLocalEpScore || (localEpScore === bestLocalEpScore && localTime > bestLocalTime)) {
              bestLocalKey = k;
              bestLocalEpScore = localEpScore;
              bestLocalTime = localTime;
            }
          }
        }

        if (bestLocalKey === null || cloudEpScore > bestLocalEpScore || (cloudEpScore === bestLocalEpScore && cloudTime > bestLocalTime)) {
          for (const k of Object.keys(cwMap)) {
            if (getCleanMediaId(cwMap[k].id) === cleanId) {
              delete cwMap[k];
            }
          }
          cwMap[key] = {
            id: cleanId,
            media_type: (item.media_type || (isTv ? 'tv' : 'movie')) as 'movie' | 'tv',
            title: item.title || 'Untitled',
            poster_path: item.poster_path || null,
            backdrop_path: item.backdrop_path || null,
            season: item.season,
            episode: item.episode,
            timestamp_seconds: Number(item.timestamp_seconds || 0),
            duration_seconds: Number(item.duration_seconds || 0),
            progress_percent: Number(item.progress_percent || 0),
            updated_at: item.updated_at || new Date().toISOString(),
          };
        }
      }
      localStorage.setItem(storageKey, JSON.stringify(cwMap));
    }

    // 5. Update local watchlist with cloud items
    if (Array.isArray(response.watchlist)) {
      const wlMap: Record<string, any> = rawWl ? JSON.parse(rawWl) : {};
      for (const item of response.watchlist) {
        const cleanId = getCleanMediaId(item.media_id || item.id);
        if (!cleanId) continue;
        if (!wlMap[cleanId]) {
          wlMap[cleanId] = {
            id: item.media_id || item.id,
            media_id: cleanId,
            title: item.title || 'Untitled',
            poster_path: item.poster_path || null,
            media_type: item.media_type || 'movie',
          };
        }
      }
      localStorage.setItem(STORAGE_WL_KEY, JSON.stringify(wlMap));
    }

    // 6. Dispatch events to notify UI across all components
    window.dispatchEvent(new CustomEvent('nightcast:progress-update', { detail: { profileId } }));
    window.dispatchEvent(new CustomEvent('nightcast:watchlist-update'));
  } catch (err) {
    console.error('Failed to synchronize user data with cloud:', err);
  }
}
