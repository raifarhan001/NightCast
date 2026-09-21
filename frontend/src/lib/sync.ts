import { apiFetch } from './api';
import { getCleanMediaId, LocalProgressItem } from './progress';

const STORAGE_CW_KEY = 'nightcast_continue_watching';
const STORAGE_WL_KEY = 'nightcast_watchlist';

export async function syncUserDataWithCloud(profileId?: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // 1. Gather local continue watching
    let localCw: any[] = [];
    const rawCw = localStorage.getItem(STORAGE_CW_KEY);
    if (rawCw) {
      try {
        const parsed = JSON.parse(rawCw);
        localCw = Object.values(parsed)
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
            const prog = item.progress_percent;
            const secs = item.timestamp_seconds;
            return (prog >= 1.0 || secs >= 5.0) && prog < 92.0;
          });
      } catch {}
    }

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

    // 3. Post to /api/user/sync
    const response = await apiFetch('/api/user/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        continue_watching: localCw,
        watchlist: localWl,
      }),
    });

    if (!response) return;

    // 4. Update local continue watching with cloud items
    if (Array.isArray(response.continue_watching)) {
      const cwMap: Record<string, LocalProgressItem> = rawCw ? JSON.parse(rawCw) : {};
      for (const item of response.continue_watching) {
        const cleanId = getCleanMediaId(item.media_id || item.id);
        if (!cleanId) continue;
        const key = item.media_type === 'tv' && item.season && item.episode
          ? `${cleanId}_s${item.season}e${item.episode}`
          : cleanId;

        if (!cwMap[key] || Number(item.timestamp_seconds) >= Number(cwMap[key].timestamp_seconds || 0)) {
          cwMap[key] = {
            id: cleanId,
            media_type: (item.media_type || 'movie') as 'movie' | 'tv',
            title: item.title || 'Untitled',
            poster_path: item.poster_path || null,
            season: item.season,
            episode: item.episode,
            timestamp_seconds: Number(item.timestamp_seconds || 0),
            duration_seconds: Number(item.duration_seconds || 0),
            progress_percent: Number(item.progress_percent || 0),
            updated_at: item.updated_at || new Date().toISOString(),
          };
        }
      }
      localStorage.setItem(STORAGE_CW_KEY, JSON.stringify(cwMap));
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
    window.dispatchEvent(new CustomEvent('nightcast:progress-update'));
    window.dispatchEvent(new CustomEvent('nightcast:watchlist-update'));
  } catch (err) {
    console.error('Failed to synchronize user data with cloud:', err);
  }
}
