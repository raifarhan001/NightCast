"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useUserStore } from "../store/userStore";
import { apiFetch, MediaItem, ContinueWatchingItem } from "../lib/api";
import { getContinueWatchingList, LocalProgressItem } from "../lib/progress";
import HeroCarousel from "../components/home/HeroCarousel";
import MovieRow from "../components/shared/MovieRow";
import Top10RankedRow from "../components/home/Top10RankedRow";
import StudiosRow from "../components/home/StudiosRow";
import { HeroSkeleton, MovieRowSkeleton } from "../components/shared/Skeletons";

function HomePageContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "foryou";
  const { activeProfile } = useUserStore();

  const [localContinueWatching, setLocalContinueWatching] = React.useState<LocalProgressItem[]>([]);

  React.useEffect(() => {
    setLocalContinueWatching(getContinueWatchingList());
  }, []);

  // 1. Top Picks For You (Mixed Trending)
  const { data: topPicks = [], isLoading: topPicksLoading } = useQuery<MediaItem[]>({
    queryKey: ["top-picks"],
    queryFn: () => apiFetch("/api/tmdb/trending?media_type=all&time_window=week"),
  });

  // 2. Trending Movies
  const { data: trendingMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["trending-movies"],
    queryFn: () => apiFetch("/api/tmdb/trending?media_type=movie&time_window=week"),
  });

  // 3. Popular TV Shows
  const { data: popularTvShows = [] } = useQuery<MediaItem[]>({
    queryKey: ["popular-tv-shows"],
    queryFn: () => apiFetch("/api/tmdb/popular?media_type=tv"),
  });

  // 4. Action & Adventure (Genres 28, 12)
  const { data: actionMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["action-adventure-movies"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_genres=28,12"),
  });

  // 5. Sci-Fi & Fantasy (Genres 878, 14)
  const { data: sciFiMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["scifi-fantasy-movies"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_genres=878,14"),
  });

  // 6. Top Rated Movies
  const { data: topRated = [] } = useQuery<MediaItem[]>({
    queryKey: ["top-rated-movies"],
    queryFn: () => apiFetch("/api/tmdb/top_rated?media_type=movie"),
  });

  // 7. Hindi & Asian Hits
  const { data: asianHits = [] } = useQuery<MediaItem[]>({
    queryKey: ["hindi-asian-hits"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_original_language=hi"),
  });

  // 8. Comedies (Genre 35)
  const { data: comedyMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["comedy-movies"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_genres=35"),
  });

  // Backend Continue Watching History
  const { data: continueWatching = [] } = useQuery<ContinueWatchingItem[]>({
    queryKey: ["continue-watching", activeProfile?.id],
    queryFn: () => apiFetch("/api/progress/continue", {
      headers: activeProfile ? { "X-Profile-ID": activeProfile.id } : {},
    }),
    enabled: !!activeProfile,
  });

  // Merge Local & Backend Continue Watching (De-duplicate)
  const mergedContinueWatching = React.useMemo(() => {
    const map = new Map<string, any>();

    // Add local items first
    for (const item of localContinueWatching) {
      const key = item.media_type === 'tv' ? `${item.id}_s${item.season || 1}e${item.episode || 1}` : `${item.id}`;
      map.set(key, {
        id: item.id,
        media_type: item.media_type,
        title: item.title,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        season: item.season,
        episode: item.episode,
        progress_percent: item.progress_percent,
        updated_at: item.updated_at,
      });
    }

    // Overlay backend items
    for (const c of continueWatching) {
      const key = c.media_type === 'tv' ? `${c.media_id}_s${c.season || 1}e${c.episode || 1}` : `${c.media_id}`;
      map.set(key, {
        id: c.media_id || c.id,
        media_type: c.media_type,
        title: c.title,
        poster_path: c.poster_path,
        season: c.season,
        episode: c.episode,
        progress_percent: c.progress_percent,
        updated_at: c.updated_at,
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [localContinueWatching, continueWatching]);

  // Dynamic Hero Carousel items
  const heroItems = topPicks.length > 0 ? topPicks.slice(0, 7) : trendingMovies.slice(0, 7);

  if (topPicksLoading) {
    return (
      <div className="w-full min-h-screen bg-[#0B1120]">
        <HeroSkeleton />
        <MovieRowSkeleton />
        <MovieRowSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#0B1120] pb-28 space-y-6">
      {/* Immersive Amazon Prime Video Hero Banner Showcase */}
      <HeroCarousel items={heroItems} />

      {/* Continue Watching (Merged Local + Synced Backend) */}
      {mergedContinueWatching.length > 0 && (
        <MovieRow
          title="Continue Watching"
          items={mergedContinueWatching}
        />
      )}

      {/* 1. Top 10 Movies & Shows on Prime */}
      <Top10RankedRow
        title="Top 10 Movies & Shows on Prime"
        items={topPicks.length > 0 ? topPicks : trendingMovies}
      />

      {/* 2. Studios & Channels Row */}
      <StudiosRow />

      {/* 3. Recommended Movies & Shows */}
      <MovieRow
        title="Recommended Movies & Shows"
        items={topPicks}
      />

      {/* 4. Popular Movies */}
      <MovieRow
        title="Popular Movies"
        items={trendingMovies.map((m) => ({ ...m, media_type: "movie" }))}
      />

      {/* 5. Binge-Worthy TV Series */}
      <MovieRow
        title="Binge-Worthy TV Series"
        items={popularTvShows.map((t) => ({ ...t, media_type: "tv" }))}
      />

      {/* 6. Action & Thrillers */}
      <MovieRow
        title="Action & Thrillers"
        items={actionMovies.map((m) => ({ ...m, media_type: "movie" }))}
      />

      {/* 7. Sci-Fi & Speculative Cinema */}
      <MovieRow
        title="Sci-Fi & Speculative Cinema"
        items={sciFiMovies.map((m) => ({ ...m, media_type: "movie" }))}
      />

      {/* 8. Highly Rated Masterpieces */}
      <MovieRow
        title="Highly Rated Masterpieces"
        items={topRated.map((m) => ({ ...m, media_type: "movie" }))}
      />

      {/* 9. International & Regional Cinema */}
      <MovieRow
        title="International & Regional Cinema"
        items={asianHits.map((m) => ({ ...m, media_type: "movie" }))}
      />

      {/* 10. Hilarious Comedies */}
      <MovieRow
        title="Hilarious Comedies"
        items={comedyMovies.map((m) => ({ ...m, media_type: "movie" }))}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="w-full min-h-screen bg-[#0B1120]">
        <HeroSkeleton />
        <MovieRowSkeleton />
        <MovieRowSkeleton />
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}