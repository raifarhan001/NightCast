import { ZodMovieDetailSchema, ZodTvDetailSchema, ZodMediaListSchema } from './validation';
const IS_SERVER = typeof window === 'undefined';

// On SSR, query the container service directly; otherwise query localhost
export const API_BASE_URL = IS_SERVER
  ? (process.env.NEXT_PUBLIC_SERVER_API_URL || 'http://backend:8080')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080');

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

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  // Gracefully rewrite old api endpoints to API v1 prefix
  const cleanEndpoint = endpoint.startsWith('/api/') && !endpoint.startsWith('/api/v1/')
    ? endpoint.replace('/api/', '/api/v1/')
    : endpoint;
    
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  
  options.credentials = 'include';
  options.headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  } as Record<string, string>;

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
  if (cleanEndpoint.includes('/api/v1/tmdb/')) {
    // 1. Movie Detail endpoint
    if (cleanEndpoint.includes('/tmdb/movie/') && !cleanEndpoint.includes('/recommendations')) {
      const result = ZodMovieDetailSchema.safeParse(rawData);
      if (result.success) return result.data;
      console.warn("Zod schema validation failed on Movie Detail, using defaults. Error: ", result.error);
      return ZodMovieDetailSchema.parse({ id: parseInt(cleanEndpoint.split('/').pop() || '0') });
    }
    
    // 2. TV Detail endpoint
    if (cleanEndpoint.includes('/tmdb/tv/') && !cleanEndpoint.includes('/recommendations')) {
      const result = ZodTvDetailSchema.safeParse(rawData);
      if (result.success) return result.data;
      console.warn("Zod schema validation failed on TV Detail, using defaults. Error: ", result.error);
      return ZodTvDetailSchema.parse({ id: parseInt(cleanEndpoint.split('/').pop() || '0') });
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
      const result = ZodMediaListSchema.safeParse(rawData);
      if (result.success) return result.data;
      console.warn("Zod schema validation failed on media list, falling back to raw data. Error: ", result.error);
      return Array.isArray(rawData) ? rawData : [];
    }
  }
  
  return rawData;
}

