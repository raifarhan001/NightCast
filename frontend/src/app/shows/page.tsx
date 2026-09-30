"use client";

import React, { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, MediaItem } from "../../lib/api";
import HeroCarousel from "../../components/home/HeroCarousel";
import AmbientGlow from "../../components/shared/AmbientGlow";
import MovieRow from "../../components/shared/MovieRow";
import Top10RankedRow from "../../components/home/Top10RankedRow";
import { HeroSkeleton, MovieRowSkeleton } from "../../components/shared/Skeletons";

const selectTvMedia = (data: MediaItem[]) =>
  data.map(t => ({ ...t, media_type: "tv" as const }));

function ShowsPageContent() {
  const hasScrolledRef = React.useRef(false);

  // 1. Trending TV Shows
  const { data: trendingShows = [], isLoading: trendingLoading } = useQuery<MediaItem[]>({
    queryKey: ["shows-page-trending"],
    queryFn: () => apiFetch("/api/tmdb/trending?media_type=tv&time_window=week"),
    select: selectTvMedia,
  });

  // Auto-scroll to #top10 if hash is present
  React.useEffect(() => {
    if (!hasScrolledRef.current && typeof window !== "undefined" && window.location.hash === "#top10" && trendingShows.length > 0) {
      hasScrolledRef.current = true;
      const timer = setTimeout(() => {
        const el = document.getElementById("top10");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [trendingShows]);

  // 2. Popular TV Shows
  const { data: popularShows = [] } = useQuery<MediaItem[]>({
    queryKey: ["shows-page-popular"],
    queryFn: () => apiFetch("/api/tmdb/popular?media_type=tv"),
    select: selectTvMedia,
  });

  // 3. Top Rated Series
  const { data: topRatedShows = [] } = useQuery<MediaItem[]>({
    queryKey: ["shows-page-top-rated"],
    queryFn: () => apiFetch("/api/tmdb/top_rated?media_type=tv"),
    select: selectTvMedia,
  });

  // 4. Sci-Fi & Fantasy Series (Genre 10765)
  const { data: sciFiShows = [] } = useQuery<MediaItem[]>({
    queryKey: ["shows-page-scifi"],
    queryFn: () => apiFetch("/api/tmdb/discover/tv?with_genres=10765"),
    select: selectTvMedia,
  });

  // 5. Drama Series (Genre 18)
  const { data: dramaShows = [] } = useQuery<MediaItem[]>({
    queryKey: ["shows-page-drama"],
    queryFn: () => apiFetch("/api/tmdb/discover/tv?with_genres=18"),
    select: selectTvMedia,
  });

  // 6. Action & Adventure Series (Genre 10759)
  const { data: actionShows = [] } = useQuery<MediaItem[]>({
    queryKey: ["shows-page-action"],
    queryFn: () => apiFetch("/api/tmdb/discover/tv?with_genres=10759"),
    select: selectTvMedia,
  });

  // 7. Crime & Mystery Series (Genres 80, 9648)
  const { data: mysteryShows = [] } = useQuery<MediaItem[]>({
    queryKey: ["shows-page-mystery"],
    queryFn: () => apiFetch("/api/tmdb/discover/tv?with_genres=80,9648"),
    select: selectTvMedia,
  });

  // 8. Comedy Series (Genre 35)
  const { data: comedyShows = [] } = useQuery<MediaItem[]>({
    queryKey: ["shows-page-comedy"],
    queryFn: () => apiFetch("/api/tmdb/discover/tv?with_genres=35"),
    select: selectTvMedia,
  });

  const heroItems = trendingShows.length > 0
    ? trendingShows.slice(0, 7)
    : popularShows.slice(0, 7);

  if (trendingLoading) {
    return (
      <div className="w-full min-h-screen bg-[#0B131B]">
        <HeroSkeleton />
        <MovieRowSkeleton />
        <MovieRowSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#0B131B] pb-28 relative overflow-hidden">
      {/* Dynamic Ambient Background Glow */}
      <AmbientGlow />

      {/* TV Shows Only Hero Carousel */}
      <HeroCarousel items={heroItems} />

      {/* Content Rows Container */}
      <div className="space-y-6 sm:space-y-8 mt-4 sm:mt-6">
        {/* 1. Top 10 Shows Right Now */}
        <div id="top10" className="scroll-mt-8">
          <Top10RankedRow
            title="Top 10 TV Series"
            items={trendingShows}
          />
        </div>

        {/* Trending Shows */}
        <MovieRow
          title="Trending Shows"
          items={trendingShows}
        />

        {/* 4. Popular TV Shows */}
        <MovieRow
          title="Popular TV Series"
          items={popularShows}
        />

        {/* 5. Top Rated Series */}
        <MovieRow
          title="Top Rated Series"
          items={topRatedShows}
        />

        {/* 6. Sci-Fi & Fantasy Series */}
        <MovieRow
          title="Sci-Fi & Fantasy Series"
          items={sciFiShows}
        />

        {/* 7. Drama Series */}
        <MovieRow
          title="Drama & Emotion"
          items={dramaShows}
        />

        {/* 8. Action & Thrills */}
        <MovieRow
          title="Action & Thrills"
          items={actionShows}
        />

        {/* 9. Crime & Mystery */}
        <MovieRow
          title="Crime & Mystery"
          items={mysteryShows}
        />

        {/* 10. Comedy Series */}
        <MovieRow
          title="Comedy Series"
          items={comedyShows}
        />
      </div>
    </div>
  );
}

export default function ShowsPage() {
  return (
    <Suspense fallback={
      <div className="w-full min-h-screen bg-[#0B131B]">
        <HeroSkeleton />
        <MovieRowSkeleton />
        <MovieRowSkeleton />
      </div>
    }>
      <ShowsPageContent />
    </Suspense>
  );
}
