import { z } from 'zod';

// --- Generic schemas for common items ---
export const ZodCastMember = z.object({
  name: z.string().default('Unknown Actor'),
  character: z.string().default('Unknown Role'),
  profile_path: z.string().nullable().default(null)
});

export const ZodCrewMember = z.object({
  name: z.string().default('Unknown Member'),
  job: z.string().default('Crew')
});

export const ZodTrailerVideo = z.object({
  key: z.string().default(''),
  site: z.string().default('YouTube'),
  type: z.string().default('Trailer')
});

export const ZodMovieDetailSchema = z.object({
  id: z.coerce.number(),
  imdb_id: z.string().nullable().optional().default(null),
  title: z.string().default('Untitled Movie'),
  tagline: z.string().optional().default(''),
  overview: z.string().default('Description unavailable.'),
  backdrop_path: z.string().nullable().default(null),
  poster_path: z.string().nullable().default(null),
  release_date: z.string().default(''),
  vote_average: z.coerce.number().default(0),
  runtime: z.coerce.number().nullable().default(0),
  genres: z.array(z.object({ id: z.number(), name: z.string() })).default([]),
  cast: z.array(ZodCastMember).optional().default([]),
  crew: z.array(ZodCrewMember).optional().default([]),
  videos: z.object({
    results: z.array(ZodTrailerVideo).default([])
  }).optional().default({ results: [] })
});

// --- TV Detail Schema ---
export const ZodTvEpisode = z.object({
  episode_number: z.coerce.number(),
  name: z.string().default('Episode'),
  overview: z.string().default('Synopsis not provided.')
});

export const ZodTvSeason = z.object({
  season_number: z.coerce.number(),
  episode_count: z.coerce.number().default(0),
  name: z.string().optional().default('Season'),
  episodes: z.array(ZodTvEpisode).optional().default([])
});

export const ZodTvDetailSchema = z.object({
  id: z.coerce.number(),
  name: z.string().default('Untitled Show'),
  tagline: z.string().optional().default(''),
  overview: z.string().default('Description unavailable.'),
  backdrop_path: z.string().nullable().default(null),
  poster_path: z.string().nullable().default(null),
  first_air_date: z.string().default(''),
  vote_average: z.coerce.number().default(0),
  episode_run_time: z.array(z.coerce.number()).optional().default([]),
  genres: z.array(z.object({ id: z.number(), name: z.string() })).default([]),
  cast: z.array(ZodCastMember).optional().default([]),
  crew: z.array(ZodCrewMember).optional().default([]),
  seasons: z.array(ZodTvSeason).optional().default([]),
  videos: z.object({
    results: z.array(ZodTrailerVideo).default([])
  }).optional().default({ results: [] })
});

// --- Generic Media List Item (Rows & Search cards) ---
export const ZodMediaItemSchema = z.object({
  id: z.coerce.number(),
  media_type: z.string().optional().transform((val) => (val === 'tv' ? 'tv' : 'movie')),
  title: z.string().optional(),
  name: z.string().optional(),
  overview: z.string().nullable().optional().transform((val) => val || ''),
  backdrop_path: z.string().nullable().optional().default(null),
  poster_path: z.string().nullable().optional().default(null),
  vote_average: z.coerce.number().nullable().optional().transform((val) => val ?? 0),
  release_date: z.string().optional(),
  first_air_date: z.string().optional(),
  score: z.coerce.number().optional()
});

export const ZodMediaListSchema = z.array(ZodMediaItemSchema);
export type ZodMediaItem = z.infer<typeof ZodMediaItemSchema>;
