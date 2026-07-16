'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserStore } from '../store/userStore';
import { apiFetch, MediaItem, ContinueWatchingItem } from '../lib/api';
import HeroCarousel from '../components/home/HeroCarousel';
import PlatformBadges from '../components/home/PlatformBadges';
import MovieRow from '../components/shared/MovieRow';
import { HeroSkeleton, MovieRowSkeleton } from '../components/shared/Skeletons';
import Image from 'next/image';
import Link from 'next/link';
import { Play } from 'lucide-react';

const platformConfigs = [
  { id: 'netflix', label: 'Netflix Originals', subtitle: 'Netflix', provider: '8' },
  { id: 'prime', label: 'Prime Video Picks', subtitle: 'Prime Video', provider: '9|119' },
  { id: 'disney', label: 'Disney+ Classics', subtitle: 'Disney+', provider: '337' },
  { id: 'crunchyroll', label: 'Crunchyroll Hits', subtitle: 'Crunchyroll', provider: '283' },
  { id: 'hbo', label: 'HBO Max Originals', subtitle: 'HBO Max', provider: '384' },
];

function PlatformSection({ id, label, subtitle, provider }: typeof platformConfigs[number]) {
  const { data = [] } = useQuery<MediaItem[]>({
    queryKey: ['discover', provider],
    queryFn: () => apiFetch(`/api/tmdb/discover?with_watch_providers=${provider}&watch_region=US&media_type=movie`),
  });

  if (data.length === 0) return null;

  return (
    <div id={`row-${id}`}>
      <MovieRow title={label} subtitle={subtitle} items={data} />
    </div>
  );
}

export default function HomePage() {
  const { user, activeProfile } = useUserStore();

  const { data: trending = [], isLoading: trendingLoading } = useQuery<MediaItem[]>({
    queryKey: ['trending'],
    queryFn: () => apiFetch('/api/tmdb/trending?media_type=all&time_window=week')
  });

  const { data: popularMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ['popular-movies'],
    queryFn: () => apiFetch('/api/tmdb/popular?media_type=movie')
  });

  const { data: topRatedMovies = [] } = useQuery<MediaItem[]>({
    queryKey: ['top-rated-movies'],
    queryFn: () => apiFetch('/api/tmdb/top_rated?media_type=movie')
  });

  const { data: continueWatching = [] } = useQuery<ContinueWatchingItem[]>({
    queryKey: ['continue-watching', activeProfile?.id],
    queryFn: () => apiFetch('/api/progress/continue', {
      headers: activeProfile ? { 'X-Profile-ID': activeProfile.id } : {}
    }),
    enabled: !!activeProfile
  });

  const { data: aiRecommendations = [] } = useQuery<MediaItem[]>({
    queryKey: ['ai-recommendations', activeProfile?.id],
    queryFn: () => apiFetch('/api/ai/recommendations', {
      headers: activeProfile ? { 'X-Profile-ID': activeProfile.id } : {}
    }),
    enabled: !!activeProfile
  });

  if (trendingLoading) {
    return (
      <div className="w-full min-h-screen bg-black">
        <HeroSkeleton />
        <MovieRowSkeleton />
        <MovieRowSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black pb-20">

      <HeroCarousel items={trending.slice(0, 6)} />

      <PlatformBadges />

      {user && continueWatching.length > 0 && (
        <section className="px-6 md:px-10 pt-6 pb-2">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-1 h-9 rounded-full bg-cyan shadow-glow-cyan-sm mt-0.5 shrink-0" />
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight text-white leading-none">
                Continue Watching
              </h3>
              <p className="text-[10px] text-nexus-muted font-semibold tracking-[0.15em] uppercase mt-1.5">
                Resume Playback
              </p>
            </div>
          </div>

          <div className="flex gap-5 overflow-x-auto no-scrollbar py-2">
            {continueWatching.map((item) => {
              const cardUrl = item.poster_path
                ? (item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w500${item.poster_path}`)
                : 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=600&h=900&fit=crop';

              const progressLink = `/watch/${item.media_type}/${item.media_id}` +
                (item.media_type === 'tv' ? `?season=${item.season}&episode=${item.episode}` : '');

              return (
                <Link
                  href={progressLink}
                  key={item.id}
                  className="group relative block w-64 md:w-80 shrink-0 aspect-[16/10] rounded-2xl overflow-hidden bg-nexus-card border border-glass-stroke transition-all duration-400 ease-out-expo hover:shadow-card-hover hover:border-cyan/20"
                >
                  <Image
                    src={cardUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 256px, 320px"
                    className="object-cover transition-all duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center text-black shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/90 to-transparent">
                    <h4 className="text-xs font-bold text-white truncate mb-1">{item.title}</h4>
                    {item.media_type === 'tv' && (
                      <p className="text-[10px] text-nexus-muted mb-2 font-medium">
                        S{item.season} &middot; E{item.episode}
                      </p>
                    )}
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan progress-bar-glow rounded-full transition-all duration-500"
                        style={{ width: `${item.progress_percent}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {user && activeProfile && aiRecommendations.length > 0 && (
        <MovieRow
          title="Curated For You"
          subtitle="Based on your history"
          items={aiRecommendations}
          isAiCurated
        />
      )}

      {platformConfigs.map((p) => (
        <PlatformSection key={p.id} {...p} />
      ))}

      <MovieRow
        title="Trending Globally"
        subtitle="This week's most watched"
        items={trending}
      />

      <MovieRow
        title="Popular Masterpieces"
        subtitle="Highly rated by the community"
        items={popularMovies}
      />

      <MovieRow
        title="Editorial Top Rated"
        subtitle="Critically acclaimed titles"
        items={topRatedMovies}
      />

    </div>
  );
}
