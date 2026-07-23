import { NextRequest, NextResponse } from 'next/server';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || '';

const MOCK_MOVIES = [
  {
    id: 550,
    media_type: 'movie',
    title: 'Fight Club',
    overview: 'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.',
    backdrop_path: '/hZkgoQY85KGwEdo52igioCgUVXD.jpg',
    poster_path: '/pB8Over2w1iKVTMMA2a2TWDOavM.jpg',
    vote_average: 8.4,
    release_date: '1999-10-15'
  },
  {
    id: 157336,
    media_type: 'movie',
    title: 'Interstellar',
    overview: 'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.',
    backdrop_path: '/xJHokMbljvjADYdit5fKSuV0yEG.jpg',
    poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    vote_average: 8.4,
    release_date: '2014-11-05'
  },
  {
    id: 27205,
    media_type: 'movie',
    title: 'Inception',
    overview: 'Cobb, a skilled thief who steals valuable secrets from deep within the subconscious during the dream state.',
    backdrop_path: '/8ZTVqvKDQ8emSGUEMjsS4yHA84L.jpg',
    poster_path: '/oYuLEW9WAFK1P22v9yGKGqwBuKG.jpg',
    vote_average: 8.3,
    release_date: '2010-07-15'
  }
];

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  try {
    const resolvedParams = await context.params;
    const rawPath = resolvedParams?.path ? resolvedParams.path : [];
    const searchParams = req.nextUrl.searchParams;

    let targetEndpoint = '';

    if (rawPath[0] === 'trending') {
      const mediaType = searchParams.get('media_type') || 'all';
      const timeWindow = searchParams.get('time_window') || 'day';
      targetEndpoint = `trending/${mediaType}/${timeWindow}`;
    } else if (rawPath[0] === 'popular') {
      const mediaType = searchParams.get('media_type') || 'movie';
      targetEndpoint = `${mediaType}/popular`;
    } else if (rawPath[0] === 'top_rated') {
      const mediaType = searchParams.get('media_type') || 'movie';
      targetEndpoint = `${mediaType}/top_rated`;
    } else if (rawPath[0] === 'search') {
      let mediaType = searchParams.get('media_type') || 'multi';
      if (mediaType === 'all') mediaType = 'multi';
      targetEndpoint = `search/${mediaType}`;
    } else {
      targetEndpoint = rawPath.join('/');
    }

    const queryParams = new URLSearchParams(searchParams);
    if (TMDB_API_KEY) {
      queryParams.set('api_key', TMDB_API_KEY);
      const tmdbUrl = `${TMDB_BASE_URL}/${targetEndpoint}?${queryParams.toString()}`;
      const res = await fetch(tmdbUrl, {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 3600 }
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
      }
    }

    // Fallback if TMDB API Key missing or request fails
    return NextResponse.json({ results: MOCK_MOVIES, page: 1, total_results: MOCK_MOVIES.length }, { status: 200 });
  } catch (error) {
    console.error("TMDB Route Handler Error:", error);
    return NextResponse.json({ results: MOCK_MOVIES, page: 1, total_results: MOCK_MOVIES.length }, { status: 200 });
  }
}
