"use client";

import React, { Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserStore } from "../store/userStore";
import { apiFetch, MediaItem, ContinueWatchingItem } from "../lib/api";
import { getContinueWatchingList, removeWatchProgress, getCleanMediaId, isDismissedFromContinueWatching, LocalProgressItem } from "../lib/progress";
import HeroCarousel from "../components/home/HeroCarousel";
import AmbientGlow from "../components/shared/AmbientGlow";
import MovieRow from "../components/shared/MovieRow";
import Top10RankedRow from "../components/home/Top10RankedRow";
import { HeroSkeleton, MovieRowSkeleton } from "../components/shared/Skeletons";

const selectHomeFeed = (data: any) => ({
  top_picks: (data?.top_picks || []) as MediaItem[],
  new_movies: ((data?.new_movies || []) as MediaItem[]).map((m) => ({ ...m, media_type: "movie" as const })),
  popular_tv: ((data?.popular_tv || []) as MediaItem[]).map((t) => ({ ...t, media_type: "tv" as const })),
  action_movies: ((data?.action_movies || []) as MediaItem[]).map((m) => ({ ...m, media_type: "movie" as const })),
  comedy_movies: ((data?.comedy_movies || []) as MediaItem[]).map((m) => ({ ...m, media_type: "movie" as const })),
  drama_movies: ((data?.drama_movies || []) as MediaItem[]).map((m) => ({ ...m, media_type: "movie" as const })),
  horror_movies: ((data?.horror_movies || []) as MediaItem[]).map((m) => ({ ...m, media_type: "movie" as const })),
  scifi_movies: ((data?.scifi_movies || []) as MediaItem[]).map((m) => ({ ...m, media_type: "movie" as const })),
  thriller_movies: ((data?.thriller_movies || []) as MediaItem[]).map((m) => ({ ...m, media_type: "movie" as const })),
  romance_movies: ((data?.romance_movies || []) as MediaItem[]).map((m) => ({ ...m, media_type: "movie" as const })),
  animation_movies: ((data?.animation_movies || []) as MediaItem[]).map((m) => ({ ...m, media_type: "movie" as const })),
  crime_movies: ((data?.crime_movies || []) as MediaItem[]).map((m) => ({ ...m, media_type: "movie" as const })),
  documentary_movies: ((data?.documentary_movies || []) as MediaItem[]).map((m) => ({ ...m, media_type: "movie" as const })),
});

function HomePageContent() {
  const { activeProfile } = useUserStore();
  const queryClient = useQueryClient();
  const hasScrolledRef = React.useRef(false);

  const [localContinueWatching, setLocalContinueWatching] = React.useState<LocalProgressItem[]>([]);

  React.useEffect(() => {
    const refreshList = () => {
      setLocalContinueWatching(getContinueWatchingList(activeProfile?.id));
      if (activeProfile) {
        queryClient.invalidateQueries({ queryKey: ["continue-watching", activeProfile.id] });
      }
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
  }, [activeProfile, queryClient]);

  // 1. Aggregated Composite Home Feed (1 single cached request replacing 13 individual queries)
  const { data: homeFeed, isLoading: isFeedLoading } = useQuery({
    queryKey: ["home-feed-v3"],
    queryFn: () => apiFetch("/api/v1/tmdb/home_feed"),
    select: selectHomeFeed,
    staleTime: 1000 * 60 * 3,
  });

  const topPicks = homeFeed?.top_picks || [];
  const newMovies = homeFeed?.new_movies || [];
  const popularTvShows = homeFeed?.popular_tv || [];
  const actionMovies = homeFeed?.action_movies || [];
  const comedyMovies = homeFeed?.comedy_movies || [];
  const dramaMovies = homeFeed?.drama_movies || [];
  const horrorMovies = homeFeed?.horror_movies || [];
  const sciFiMovies = homeFeed?.scifi_movies || [];
  const thrillerMovies = homeFeed?.thriller_movies || [];
  const romanceMovies = homeFeed?.romance_movies || [];
  const animationMovies = homeFeed?.animation_movies || [];
  const crimeMovies = homeFeed?.crime_movies || [];
  const documentaryMovies = homeFeed?.documentary_movies || [];

  // Auto-scroll to #top10 if hash is present
  React.useEffect(() => {
    if (!hasScrolledRef.current && typeof window !== "undefined" && window.location.hash === "#top10" && topPicks.length > 0) {
      hasScrolledRef.current = true;
      const timer = setTimeout(() => {
        const el = document.getElementById("top10");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [topPicks]);

  // Backend Continue Watching History
  const { data: continueWatching = [] } = useQuery<ContinueWatchingItem[]>({
    queryKey: ["continue-watching", activeProfile?.id],
    queryFn: () => apiFetch("/api/v1/progress/continue", {
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

      // Filter out explicitly dismissed items so they never resurrect on refresh
      if (isDismissedFromContinueWatching(cleanId, c.updated_at)) return;

      const percent = Number(c.progress_percent ?? 0);
      const seconds = Number(c.timestamp_seconds ?? 0);
      const duration = Number(c.duration_seconds ?? 0);

      // Filter out completed (>= 90%)
      if (percent >= 90.0 || (duration > 60 && seconds >= duration - 25)) return;
      
      const isUpNextMarker = (c.media_type === 'tv' || c.season) && c.episode !== undefined && percent >= 0.5;
      const hasWatchedContent = seconds >= 3 || percent >= 0.5;
      if (!isUpNextMarker && !hasWatchedContent) return;

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
    removeWatchProgress(cleanId, item.season, item.episode, activeProfile?.id);
    setLocalContinueWatching(getContinueWatchingList(activeProfile?.id));

    // Immediately remove from React Query cache so UI updates instantly
    queryClient.setQueryData<ContinueWatchingItem[]>(
      ["continue-watching", activeProfile?.id],
      (old) => old ? old.filter((x: any) => getCleanMediaId(x.media_id || x.id) !== cleanId) : []
    );

    if (activeProfile) {
      try {
        await apiFetch(`/api/v1/progress/continue/${cleanId}`, {
          method: "DELETE",
          headers: { "X-Profile-ID": activeProfile.id },
        });
        queryClient.invalidateQueries({ queryKey: ["continue-watching", activeProfile.id] });
      } catch (err) {
        console.error("Failed to delete continue watching from backend", err);
      }
    }
  }, [activeProfile, queryClient]);

  // Dynamic Hero Carousel items
  const heroItems = topPicks.length > 0 ? topPicks.slice(0, 7) : newMovies.slice(0, 7);

  if (isFeedLoading && !homeFeed) {
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

      {/* 2. New Movies */}
      <MovieRow
        title="New Movies"
        subtitle="Latest releases & fresh premieres"
        items={newMovies}
      />

      {/* 4. Popular TV Shows */}
      <MovieRow
        title="Popular TV Shows"
        subtitle="Top binge-worthy series"
        items={popularTvShows}
      />

      {/* 5. Action */}
      <MovieRow
        title="Action"
        subtitle="High-octane & explosive adventures"
        items={actionMovies}
      />

      {/* 6. Comedy */}
      <MovieRow
        title="Comedy"
        subtitle="Hilarious & feel-good hits"
        items={comedyMovies}
      />

      {/* 7. Drama */}
      <MovieRow
        title="Drama"
        subtitle="Compelling stories & cinematic masterpieces"
        items={dramaMovies}
      />

      {/* 8. Horror */}
      <MovieRow
        title="Horror"
        subtitle="Nightmares & supernatural chills"
        items={horrorMovies}
      />

      {/* 9. Sci Fi */}
      <MovieRow
        title="Sci-Fi"
        subtitle="Futuristic visions & space epics"
        items={sciFiMovies}
      />

      {/* 10. Thriller */}
      <MovieRow
        title="Thriller"
        subtitle="Edge-of-your-seat suspense"
        items={thrillerMovies}
      />

      {/* 11. Romance */}
      <MovieRow
        title="Romance"
        subtitle="Heartwarming passion & love stories"
        items={romanceMovies}
      />

      {/* 12. Animation */}
      <MovieRow
        title="Animation"
        subtitle="Anime & animated wonders"
        items={animationMovies}
      />

      {/* 13. Crime */}
      <MovieRow
        title="Crime"
        subtitle="Underworld sagas & detective mysteries"
        items={crimeMovies}
      />

        {/* 14. Documentary */}
        <MovieRow
          title="Documentary"
          subtitle="Real stories & untold truths"
          items={documentaryMovies}
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