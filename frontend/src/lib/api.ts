import { ZodMovieDetailSchema, ZodTvDetailSchema, ZodMediaListSchema } from './validation';
const IS_SERVER = typeof window === 'undefined';

// On SSR, query the container service directly; otherwise query localhost
export const API_BASE_URL = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_SERVER_API_URL || '');

if (typeof window !== 'undefined') {
  console.log(">>> FORCE RELATIVE PATH ACTIVATED <<<");
  console.log("Current API Base URL:", API_BASE_URL || "RELATIVE PATH");
}

export interface MediaItem {
  id: string | number;
  media_type: 'movie' | 'tv';
  title?: string;
  name?: string;
  overview?: string;
  backdrop_path?: string;
  poster_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  score?: number; // AI score
}

export interface Profile {
  id: string;
  name: string;
  avatar_url: string;
}

export interface ContinueWatchingItem {
  id: string;
  media_id: string;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path: string;
  season?: number;
  episode?: number;
  progress_percent: number;
  timestamp_seconds: number;
  duration_seconds: number;
  updated_at: string;
}

export interface Settings {
  theme: string;
  autoplay: boolean;
  subtitles_enabled: boolean;
  preferred_language: string;
}

export interface CastMember {
  name: string;
  character: string;
  profile_path: string | null;
}

export interface CrewMember {
  name: string;
  job: string;
}

export interface TrailerVideo {
  key: string;
  site: string;
  type: string;
}

export interface MovieDetail {
  id: number;
  imdb_id?: string | null;
  title: string;
  tagline?: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  runtime: number | null;
  genres: Array<{ id: number; name: string }>;
  cast?: CastMember[];
  crew?: CrewMember[];
  videos?: { results: TrailerVideo[] };
}

export interface TvEpisode {
  episode_number: number;
  name: string;
  overview: string;
}

export interface TvSeason {
  season_number: number;
  episode_count: number;
  name?: string;
  episodes?: TvEpisode[];
}

export interface TvDetail {
  id: number;
  name: string;
  tagline?: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  first_air_date: string;
  vote_average: number;
  episode_run_time?: number[];
  genres: Array<{ id: number; name: string }>;
  cast?: CastMember[];
  crew?: CrewMember[];
  seasons?: TvSeason[];
  videos?: { results: TrailerVideo[] };
}

export interface ReviewItem {
  id: string;
  profile_id: string;
  profile_name?: string;
  media_id: string;
  media_type: string;
  rating: number;
  review_text: string;
  created_at: string;
}

export interface UserAccount {
  id: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  profile_count: number;
  profiles: Array<{ id: string; name: string }>;
}

export interface UserStats {
  users: number;
  profiles: number;
  plays: number;
  reviews: number;
  favorites: number;
}

export interface SystemLog {
  timestamp: string;
  level: string;
  message: string;
}

// Token storage for cross-origin auth (SameSite=Lax blocks cookie on fetch)
const TOKEN_KEY = 'vidking_access_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) { localStorage.setItem(TOKEN_KEY, token); }
    else { localStorage.removeItem(TOKEN_KEY); }
  } catch {}
}

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  // Gracefully rewrite old api endpoints to API v1 prefix
  const cleanEndpoint = endpoint.startsWith('/api/') && !endpoint.startsWith('/api/v1/')
    ? endpoint.replace('/api/', '/api/v1/')
    : endpoint;
    
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  
  options.credentials = 'include';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  // Attach stored token as Authorization header (works cross-origin without SameSite issues)
  const storedToken = getStoredToken();
  if (storedToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${storedToken}`;
  }
  options.headers = headers;

  const response = await fetch(url, options);
  
  if (!response.ok) {
    let errorDetail = 'API Request Failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch (_) {}
    throw new Error(errorDetail);
  }
  
  if (response.status === 204) return null;
  const rawData = await response.json();
  
  // Apply Zod validation schemas to protect the UI components from undefined keys
  if (cleanEndpoint.includes('/tmdb/')) {
    // 1. Movie Detail endpoint
    if (cleanEndpoint.includes('/tmdb/movie/') && !cleanEndpoint.includes('/recommendations') && !cleanEndpoint.includes('/streams')) {
      const itemData = (rawData && typeof rawData === 'object' && 'data' in rawData && rawData.data) ? rawData.data : rawData;
      const result = ZodMovieDetailSchema.safeParse(itemData);
      if (result.success) return result.data;
      const pathSegments = cleanEndpoint.split('/').filter(Boolean);
      const idIndex = pathSegments.findIndex(s => s === 'movie');
      const idString = idIndex !== -1 ? pathSegments[idIndex + 1] : '0';
      const parsedId = parseInt(idString, 10);
      return ZodMovieDetailSchema.parse({ id: isNaN(parsedId) ? 0 : parsedId });
    }
    
    // 2. TV Detail endpoint
    if (cleanEndpoint.includes('/tmdb/tv/') && !cleanEndpoint.includes('/recommendations') && !cleanEndpoint.includes('/streams')) {
      const itemData = (rawData && typeof rawData === 'object' && 'data' in rawData && rawData.data) ? rawData.data : rawData;
      const result = ZodTvDetailSchema.safeParse(itemData);
      if (result.success) return result.data;
      const pathSegments = cleanEndpoint.split('/').filter(Boolean);
      const idIndex = pathSegments.findIndex(s => s === 'tv');
      const idString = idIndex !== -1 ? pathSegments[idIndex + 1] : '0';
      const parsedId = parseInt(idString, 10);
      return ZodTvDetailSchema.parse({ id: isNaN(parsedId) ? 0 : parsedId });
    }
    
    // 3. Lists endpoints
    if (
      cleanEndpoint.includes('/trending') ||
      cleanEndpoint.includes('/popular') ||
      cleanEndpoint.includes('/top_rated') ||
      cleanEndpoint.includes('/search') ||
      cleanEndpoint.includes('/recommendations') ||
      cleanEndpoint.includes('/discover')
    ) {
      const listData = Array.isArray(rawData)
        ? rawData
        : (Array.isArray(rawData?.results) ? rawData.results : (Array.isArray(rawData?.data) ? rawData.data : []));

      const result = ZodMediaListSchema.safeParse(listData);
      if (result.success) return result.data;

      if (Array.isArray(listData) && listData.length > 0) {
        return listData.map((item: any) => ({
          id: item.id || Math.floor(Math.random() * 100000),
          media_type: item.media_type === 'tv' ? 'tv' : 'movie',
          title: item.title || item.name || 'Untitled',
          name: item.name || item.title || 'Untitled',
          overview: item.overview || '',
          backdrop_path: item.backdrop_path || null,
          poster_path: item.poster_path || null,
          vote_average: item.vote_average || 0,
          release_date: item.release_date || item.first_air_date || '',
          first_air_date: item.first_air_date || item.release_date || '',
        }));
      }
      return [];
    }
  }
  
  return rawData;
}

