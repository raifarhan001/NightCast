"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useUserStore } from "../store/userStore";
import { apiFetch, MediaItem, ContinueWatchingItem } from "../lib/api";
import { getContinueWatchingList, removeWatchProgress, getCleanMediaId, LocalProgressItem } from "../lib/progress";
import HeroCarousel from "../components/home/HeroCarousel";
import AmbientGlow from "../components/shared/AmbientGlow";
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

  // Auto-scroll to #top10 if hash is present
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#top10" && topPicks.length > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById("top10");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [topPicks]);

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

  // Merge Local & Backend Continue Watching (Consolidate per show)
  const mergedContinueWatching = React.useMemo(() => {
    const map = new Map<string, any>();

    const processItem = (c: any) => {
      const cleanId = getCleanMediaId(c.media_id || c.id);
      if (!cleanId) return;

      const percent = Number(c.progress_percent ?? 0);
      const seconds = Number(c.timestamp_seconds ?? 0);
      const duration = Number(c.duration_seconds ?? 0);

      // Filter out completed (>= 92%) or unstarted (< 1.5% and < 15s)
      if (percent >= 92.0 || (duration > 60 && seconds >= duration - 30)) return;
      if (seconds < 15 && percent < 1.5) return;

      const existing = map.get(cleanId);
      const cTime = c.updated_at ? new Date(c.updated_at).getTime() : 0;
      const exTime = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0;

      const cEpScore = ((c.season || 1) * 1000) + (c.episode || 1);
      const exEpScore = existing ? (((existing.season || 1) * 1000) + (existing.episode || 1)) : 0;

      if (!existing || cTime > exTime || (cEpScore > exEpScore && cTime >= exTime - 60000)) {
        map.set(cleanId, {
          id: cleanId,
          media_type: c.media_type || (c.season ? 'tv' : 'movie'),
          title: c.title || existing?.title || 'Untitled',
          poster_path: c.poster_path || existing?.poster_path || null,
          backdrop_path: c.backdrop_path || (c as any).backdrop_path || existing?.backdrop_path || null,
          season: c.season,
          episode: c.episode,
          progress_percent: percent,
          timestamp_seconds: seconds,
          duration_seconds: duration,
          updated_at: c.updated_at || new Date().toISOString(),
        });
      }
    };

    for (const item of localContinueWatching) {
      processItem(item);
    }
    for (const c of continueWatching) {
      processItem(c);
    }

    return Array.from(map.values()).sort((a, b) => {
      const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [localContinueWatching, continueWatching]);

  const handleRemoveContinueWatching = React.useCallback(async (item: any) => {
    const cleanId = getCleanMediaId(item.id);
    removeWatchProgress(cleanId, item.season, item.episode);
    setLocalContinueWatching(getContinueWatchingList());

    if (activeProfile) {
      try {
        const queryParams = new URLSearchParams();
        if (item.season) queryParams.set("season", item.season.toString());
        if (item.episode) queryParams.set("episode", item.episode.toString());
        const qs = queryParams.toString() ? `?${queryParams.toString()}` : "";
        await apiFetch(`/api/progress/continue/${cleanId}${qs}`, {
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

      {/* Immersive Hero Showcase - Flush with Top */}
      <HeroCarousel items={heroItems} />

      {/* Content Rows Container */}
      <div className="space-y-6 sm:space-y-8 mt-4 sm:mt-6">
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
      <div id="top10" className="scroll-mt-8">
        <Top10RankedRow
          title="Top 10 Trending Titles"
          items={topPicks}
        />
      </div>

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
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="w-full min-h-screen bg-[#0B131B]">
        <HeroSkeleton />
        <MovieRowSkeleton />
        <MovieRowSkeleton />
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}