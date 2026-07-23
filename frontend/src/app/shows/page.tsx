"use client";

import React, { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, MediaItem } from "../../lib/api";
import HeroCarousel from "../../components/home/HeroCarousel";
import MovieRow from "../../components/shared/MovieRow";
import { HeroSkeleton, MovieRowSkeleton } from "../../components/shared/Skeletons";

function ShowsPageContent() {
  // 1. Trending TV Shows
  const { data: trendingShows = [], isLoading: trendingLoading } = useQuery<MediaItem[]>({
    queryKey: ["shows-page-trending"],
    queryFn: () => apiFetch("/api/tmdb/trending?media_type=tv&time_window=week"),
  });

  // 2. Popular TV Shows
  const { data: popularShows = [] } = useQuery<MediaItem[]>({
    queryKey: ["shows-page-popular"],
    queryFn: () => apiFetch("/api/tmdb/popular?media_type=tv"),
  });

  // 3. Top Rated Series
  const { data: topRatedShows = [] } = useQuery<MediaItem[]>({
    queryKey: ["shows-page-top-rated"],
    queryFn: () => apiFetch("/api/tmdb/top_rated?media_type=tv"),
  });

  // 4. Sci-Fi & Fantasy Series (Genre 10765)
  const { data: sciFiShows = [] } = useQuery<MediaItem[]>({
    queryKey: ["shows-page-scifi"],
    queryFn: () => apiFetch("/api/tmdb/discover/tv?with_genres=10765"),
  });

  // 5. Drama Series (Genre 18)
  const { data: dramaShows = [] } = useQuery<MediaItem[]>({
    queryKey: ["shows-page-drama"],
    queryFn: () => apiFetch("/api/tmdb/discover/tv?with_genres=18"),
  });

  // 6. Action & Adventure Series (Genre 10759)
  const { data: actionShows = [] } = useQuery<MediaItem[]>({
    queryKey: ["shows-page-action"],
    queryFn: () => apiFetch("/api/tmdb/discover/tv?with_genres=10759"),
  });

  // 7. Crime & Mystery Series (Genres 80, 9648)
  const { data: mysteryShows = [] } = useQuery<MediaItem[]>({
    queryKey: ["shows-page-mystery"],
    queryFn: () => apiFetch("/api/tmdb/discover/tv?with_genres=80,9648"),
  });

  // 8. Comedy Series (Genre 35)
  const { data: comedyShows = [] } = useQuery<MediaItem[]>({
    queryKey: ["shows-page-comedy"],
    queryFn: () => apiFetch("/api/tmdb/discover/tv?with_genres=35"),
  });

  const heroItems = trendingShows.length > 0
    ? trendingShows.slice(0, 7).map(t => ({ ...t, media_type: "tv" as const }))
    : popularShows.slice(0, 7).map(t => ({ ...t, media_type: "tv" as const }));

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
      {/* TV Shows Only Hero Carousel */}
      <HeroCarousel items={heroItems} />

      {/* 1. Trending Shows */}
      <MovieRow
        title="Trending Shows"
        items={trendingShows.map(t => ({ ...t, media_type: "tv" as const }))}
      />

      {/* 2. Popular TV Shows */}
      <MovieRow
        title="Popular TV Shows"
        items={popularShows.map(t => ({ ...t, media_type: "tv" as const }))}
      />

      {/* 3. Top Rated Series */}
      <MovieRow
        title="Top Rated Series"
        items={topRatedShows.map(t => ({ ...t, media_type: "tv" as const }))}
      />

      {/* 4. Sci-Fi & Fantasy Series */}
      <MovieRow
        title="Sci-Fi & Fantasy Series"
        items={sciFiShows.map(t => ({ ...t, media_type: "tv" as const }))}
      />

      {/* 5. Drama Series */}
      <MovieRow
        title="Drama & Emotion"
        items={dramaShows.map(t => ({ ...t, media_type: "tv" as const }))}
      />

      {/* 6. Action & Adventure */}
      <MovieRow
        title="Action & Thrills"
        items={actionShows.map(t => ({ ...t, media_type: "tv" as const }))}
      />

      {/* 7. Crime & Mystery */}
      <MovieRow
        title="Crime & Mystery"
        items={mysteryShows.map(t => ({ ...t, media_type: "tv" as const }))}
      />

      {/* 8. Comedy Series */}
      <MovieRow
        title="Comedy Series"
        items={comedyShows.map(t => ({ ...t, media_type: "tv" as const }))}
      />
    </div>
  );
}

export default function ShowsPage() {
  return (
    <Suspense fallback={
      <div className="w-full min-h-screen bg-[#090A0F]">
        <HeroSkeleton />
        <MovieRowSkeleton />
        <MovieRowSkeleton />
      </div>
    }>
      <ShowsPageContent />
    </Suspense>
  );
}
