"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useUserStore } from "../store/userStore";
import { apiFetch, MediaItem, ContinueWatchingItem } from "../lib/api";
import { getContinueWatchingList, removeWatchProgress, LocalProgressItem } from "../lib/progress";
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
    const refreshList = () => {
      setLocalContinueWatching(getContinueWatchingList());
    };
    refreshList();

    window.addEventListener("focus", refreshList);
    window.addEventListener("storage", refreshList);
    window.addEventListener("nightcast:progress-update", refreshList);

    return () => {
      window.removeEventListener("focus", refreshList);
      window.removeEventListener("storage", refreshList);
      window.removeEventListener("nightcast:progress-update", refreshList);
    };
  }, []);

  // 1. Trending Right Now (Mixed Trending)
  const { data: topPicks = [], isLoading: topPicksLoading } = useQuery<MediaItem[]>({
    queryKey: ["top-picks"],
    queryFn: () => apiFetch("/api/tmdb/trending?media_type=all&time_window=week"),
  });

  // 2. New Movies (Now Playing)
  const { data: newMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["new-movies"],
    queryFn: () => apiFetch("/api/tmdb/now_playing"),
  });

  // 3. Popular TV Shows
  const { data: popularTvShows = [] } = useQuery<MediaItem[]>({
    queryKey: ["popular-tv-shows"],
    queryFn: () => apiFetch("/api/tmdb/popular?media_type=tv"),
  });

  // 4. Action (Genre 28)
  const { data: actionMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["action-movies"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_genres=28"),
  });

  // 5. Comedy (Genre 35)
  const { data: comedyMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["comedy-movies"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_genres=35"),
  });

  // 6. Drama (Genre 18)
  const { data: dramaMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["drama-movies"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_genres=18"),
  });

  // 7. Horror (Genre 27)
  const { data: horrorMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["horror-movies"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_genres=27"),
  });

  // 8. Sci-Fi (Genre 878)
  const { data: sciFiMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["scifi-movies"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_genres=878"),
  });

  // 9. Thriller (Genre 53)
  const { data: thrillerMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["thriller-movies"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_genres=53"),
  });

  // 10. Romance (Genre 10749)
  const { data: romanceMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["romance-movies"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_genres=10749"),
  });

  // 11. Animation (Genre 16)
  const { data: animationMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["animation-movies"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_genres=16"),
  });

  // 12. Crime (Genre 80)
  const { data: crimeMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["crime-movies"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_genres=80"),
  });

  // 13. Documentary (Genre 99)
  const { data: documentaryMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ["documentary-movies"],
    queryFn: () => apiFetch("/api/tmdb/discover/movie?with_genres=99"),
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

  const handleRemoveContinueWatching = React.useCallback(async (item: any) => {
    removeWatchProgress(item.id, item.season, item.episode);
    setLocalContinueWatching(getContinueWatchingList());

    if (activeProfile) {
      try {
        const queryParams = new URLSearchParams();
        if (item.season) queryParams.set("season", item.season.toString());
        if (item.episode) queryParams.set("episode", item.episode.toString());
        const qs = queryParams.toString() ? `?${queryParams.toString()}` : "";
        await apiFetch(`/api/progress/continue/${item.id}${qs}`, {
          method: "DELETE",
          headers: { "X-Profile-ID": activeProfile.id },
        });
      } catch (err) {
        console.error("Failed to delete continue watching from backend", err);
      }
    }
  }, [activeProfile]);

  // Dynamic Hero Carousel items
  const heroItems = topPicks.length > 0 ? topPicks.slice(0, 7) : newMovies.slice(0, 7);

  if (topPicksLoading) {
    return (
      <div className="w-full min-h-screen bg-[#0A0F11]">
        <HeroSkeleton />
        <MovieRowSkeleton />
        <MovieRowSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#0A0F11] pb-28 space-y-6">
      {/* Immersive Hero Showcase */}
      <HeroCarousel items={heroItems} />

      {/* Continue Watching (If User Has In-Progress Titles) */}
      {mergedContinueWatching.length > 0 && (
        <MovieRow
          title="Continue Watching"
          subtitle="Pick up where you left off"
          items={mergedContinueWatching}
          onRemoveItem={handleRemoveContinueWatching}
        />
      )}

      {/* 1. Trending Right Now */}
      <Top10RankedRow
        title="Trending Right Now"
        items={topPicks}
      />

      {/* 2. Studios & Platform */}
      <StudiosRow />

      {/* 3. New Movies */}
      <MovieRow
        title="New Movies"
        subtitle="Latest releases & fresh premieres"
        items={newMovies.map((m) => ({ ...m, media_type: "movie" }))}
      />

      {/* 4. Popular TV Shows */}
      <MovieRow
        title="Popular TV Shows"
        subtitle="Top binge-worthy series"
        items={popularTvShows.map((t) => ({ ...t, media_type: "tv" }))}
      />

      {/* 5. Action */}
      <MovieRow
        title="Action"
        subtitle="High-octane & explosive adventures"
        items={actionMovies.map((m) => ({ ...m, media_type: "movie" }))}
      />

      {/* 6. Comedy */}
      <MovieRow
        title="Comedy"
        subtitle="Hilarious & feel-good hits"
        items={comedyMovies.map((m) => ({ ...m, media_type: "movie" }))}
      />

      {/* 7. Drama */}
      <MovieRow
        title="Drama"
        subtitle="Compelling stories & cinematic masterpieces"
        items={dramaMovies.map((m) => ({ ...m, media_type: "movie" }))}
      />

      {/* 8. Horror */}
      <MovieRow
        title="Horror"
        subtitle="Nightmares & supernatural chills"
        items={horrorMovies.map((m) => ({ ...m, media_type: "movie" }))}
      />

      {/* 9. Sci Fi */}
      <MovieRow
        title="Sci-Fi"
        subtitle="Futuristic visions & space epics"
        items={sciFiMovies.map((m) => ({ ...m, media_type: "movie" }))}
      />

      {/* 10. Thriller */}
      <MovieRow
        title="Thriller"
        subtitle="Edge-of-your-seat suspense"
        items={thrillerMovies.map((m) => ({ ...m, media_type: "movie" }))}
      />

      {/* 11. Romance */}
      <MovieRow
        title="Romance"
        subtitle="Heartwarming passion & love stories"
        items={romanceMovies.map((m) => ({ ...m, media_type: "movie" }))}
      />

      {/* 12. Animation */}
      <MovieRow
        title="Animation"
        subtitle="Anime & animated wonders"
        items={animationMovies.map((m) => ({ ...m, media_type: "movie" }))}
      />

      {/* 13. Crime */}
      <MovieRow
        title="Crime"
        subtitle="Underworld sagas & detective mysteries"
        items={crimeMovies.map((m) => ({ ...m, media_type: "movie" }))}
      />

      {/* 14. Documentary */}
      <MovieRow
        title="Documentary"
        subtitle="Real stories & untold truths"
        items={documentaryMovies.map((m) => ({ ...m, media_type: "movie" }))}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="w-full min-h-screen bg-[#0A0F11]">
        <HeroSkeleton />
        <MovieRowSkeleton />
        <MovieRowSkeleton />
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}