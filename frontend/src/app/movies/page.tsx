"use client";

import React, { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, MediaItem } from "../../lib/api";
import HeroCarousel from "../../components/home/HeroCarousel";
import MovieRow from "../../components/shared/MovieRow";
import { HeroSkeleton, MovieRowSkeleton } from "../../components/shared/Skeletons";

function MoviesPageContent() {
  // 1. Trending Movies
  const { data: trendingMovies = [], isLoading: trendingLoading } = useQuery<MediaItem[]>({
    queryKey: ["movies-page-trending"],
    queryFn: () => apiFetch("/api/tmdb/trending?media_type=movie&time_window=week"),
  });

  // 2. Popular Movies
  const { data: popularMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["movies-page-popular"],
    queryFn: () => apiFetch("/api/tmdb/popular?media_type=movie"),
  });

  // 3. Top Rated Movies
  const { data: topRatedMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["movies-page-top-rated"],
    queryFn: () => apiFetch("/api/tmdb/top_rated?media_type=movie"),
  });

  // 4. Action Movies (Genre 28)
  const { data: actionMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["movies-page-action"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_genres=28"),
  });

  // 5. Sci-Fi Movies (Genre 878)
  const { data: sciFiMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["movies-page-scifi"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_genres=878"),
  });

  // 6. Comedy Movies (Genre 35)
  const { data: comedyMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["movies-page-comedy"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_genres=35"),
  });

  // 7. Thriller Movies (Genre 53)
  const { data: thrillerMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["movies-page-thriller"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_genres=53"),
  });

  // 8. Horror Movies (Genre 27)
  const { data: horrorMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["movies-page-horror"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_genres=27"),
  });

  const heroItems = trendingMovies.length > 0
    ? trendingMovies.slice(0, 7).map(m => ({ ...m, media_type: "movie" as const }))
    : popularMovies.slice(0, 7).map(m => ({ ...m, media_type: "movie" as const }));

  if (trendingLoading) {
    return (
      <div className="w-full min-h-screen bg-[#090A0F]">
        <HeroSkeleton />
        <MovieRowSkeleton />
        <MovieRowSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#090A0F] pb-28 space-y-4">
      {/* Movies Only Hero Carousel */}
      <HeroCarousel items={heroItems} />

      {/* 1. Trending Movies */}
      <MovieRow
        title="Trending Movies"
        items={trendingMovies.map(m => ({ ...m, media_type: "movie" as const }))}
      />

      {/* 2. Popular Movies */}
      <MovieRow
        title="Popular Movies"
        items={popularMovies.map(m => ({ ...m, media_type: "movie" as const }))}
      />

      {/* 3. Top Rated Movies */}
      <MovieRow
        title="Top Rated Movies"
        items={topRatedMovies.map(m => ({ ...m, media_type: "movie" as const }))}
      />

      {/* 4. Action Blockbusters */}
      <MovieRow
        title="Action Blockbusters"
        items={actionMovies.map(m => ({ ...m, media_type: "movie" as const }))}
      />

      {/* 5. Sci-Fi & Speculative */}
      <MovieRow
        title="Sci-Fi & Speculative"
        items={sciFiMovies.map(m => ({ ...m, media_type: "movie" as const }))}
      />

      {/* 6. Comedy Hits */}
      <MovieRow
        title="Comedy Hits"
        items={comedyMovies.map(m => ({ ...m, media_type: "movie" as const }))}
      />

      {/* 7. Thriller & Suspense */}
      <MovieRow
        title="Thriller & Suspense"
        items={thrillerMovies.map(m => ({ ...m, media_type: "movie" as const }))}
      />

      {/* 8. Horror & Supernatural */}
      <MovieRow
        title="Horror & Supernatural"
        items={horrorMovies.map(m => ({ ...m, media_type: "movie" as const }))}
      />
    </div>
  );
}

export default function MoviesPage() {
  return (
    <Suspense fallback={
      <div className="w-full min-h-screen bg-[#090A0F]">
        <HeroSkeleton />
        <MovieRowSkeleton />
        <MovieRowSkeleton />
      </div>
    }>
      <MoviesPageContent />
    </Suspense>
  );
}
