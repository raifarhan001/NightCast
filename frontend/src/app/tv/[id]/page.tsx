'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useUserStore } from '../../../store/userStore';
import { apiFetch, TvDetail, ReviewItem, MediaItem, TrailerVideo } from '../../../lib/api';
import { ImageService } from '../../../lib/ImageService';
import { DetailsSkeleton } from '../../../components/shared/Skeletons';
import { TvErrorBoundary } from '../../../components/shared/ErrorBoundaries';
import MovieRow from '../../../components/shared/MovieRow';
import { Play, Star, Bookmark, BookmarkCheck, Clock, Calendar, Languages, Send, Sparkles } from 'lucide-react';

function TvDetailsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useParams() as { id: string };
  const { user, activeProfile } = useUserStore();

  const [activeSeason, setActiveSeason] = useState(1);
  const [ratingInput, setRatingInput] = useState(8.0);
  const [reviewInput, setReviewInput] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const { data: tv, isLoading } = useQuery<TvDetail>({
    queryKey: ['tv-details', id],
    queryFn: () => apiFetch(`/api/tmdb/tv/${id}`)
  });

  const { data: recommendations = [] } = useQuery<MediaItem[]>({
    queryKey: ['tv-recommendations', id],
    queryFn: () => apiFetch(`/api/tmdb/tv/${id}/recommendations`)
  });

  const { data: reviews = [], refetch: refetchReviews } = useQuery<ReviewItem[]>({
    queryKey: ['reviews-tv', id],
    queryFn: () => apiFetch(`/api/user/reviews/${id}`)
  });

  const { data: favorites = [] } = useQuery<any[]>({
    queryKey: ['favorites', activeProfile?.id],
    queryFn: () => apiFetch('/api/user/favorites', {
      headers: activeProfile ? { 'X-Profile-ID': activeProfile.id } : {}
    }),
    enabled: !!activeProfile
  });

  const { data: seasonDetails } = useQuery<any>({
    queryKey: ['tv-season', id, activeSeason],
    queryFn: () => apiFetch(`/api/tmdb/tv/${id}/season/${activeSeason}`),
    enabled: !!id
  });

  const isFavorite = favorites.some(fav => fav.media_id === id);

  const toggleFavoriteMutation = useMutation({
    mutationFn: () => {
      const headers: Record<string, string> = activeProfile ? { 'X-Profile-ID': activeProfile.id } : {};
      if (isFavorite) {
        return apiFetch(`/api/user/favorites/${id}`, { method: 'DELETE', headers });
      } else {
        return apiFetch('/api/user/favorites', {
          method: 'POST', headers,
          body: JSON.stringify({ media_id: id, media_type: 'tv', title: tv?.name || '', poster_path: tv?.poster_path || '' })
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites', activeProfile?.id] })
  });

  const createReviewMutation = useMutation({
    mutationFn: () => {
      const headers: Record<string, string> = activeProfile ? { 'X-Profile-ID': activeProfile.id } : {};
      return apiFetch('/api/user/reviews', {
        method: 'POST', headers,
        body: JSON.stringify({ media_id: id, media_type: 'tv', rating: ratingInput, review_text: reviewInput })
      });
    },
    onSuccess: () => {
      setReviewInput(''); setReviewSuccess(true); refetchReviews();
      setTimeout(() => setReviewSuccess(false), 3000);
    }
  });

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) { router.push('/profile'); return; }
    createReviewMutation.mutate();
  };

  if (isLoading) return <DetailsSkeleton />;
  if (!tv) {
    return (
      <div className="w-full min-h-screen bg-black flex justify-center items-center text-center">
        <p className="text-sm text-nexus-muted">TV details not found.</p>
      </div>
    );
  }

  const backdropUrl = ImageService.getBackdrop(tv.backdrop_path, 'original', tv.name);
  const posterUrl = ImageService.getPoster(tv.poster_path, 'w500', tv.name);
  const releaseYear = (tv.first_air_date || '').split('-')[0] || 'N/A';
  const rating = tv.vote_average ? tv.vote_average.toFixed(1) : 'N/A';
  const trailerKey = tv.videos?.results?.find((v: TrailerVideo) => v.type === 'Trailer' && v.site === 'YouTube')?.key;

  const seasons = tv.seasons || [{"season_number": 1, "episode_count": 8, "name": "Season 1"}];
  const selectedSeasonData = seasons.find((s) => s.season_number === activeSeason) || seasons[0];
  const episodes = seasonDetails?.episodes || selectedSeasonData?.episodes || Array.from({ length: selectedSeasonData?.episode_count || 8 }).map((_, i) => ({
    episode_number: i + 1, name: `Episode ${i + 1}`, overview: `Episode ${i + 1} of Season ${activeSeason}.`
  }));

  return (
    <div className="w-full min-h-screen bg-black pb-20">
      <div className="relative w-full h-[65vh] md:h-[80vh] select-none">
        <Image
          src={backdropUrl} alt={tv.name} fill priority placeholder="blur"
          blurDataURL={ImageService.getBlurHash()}
          className="object-cover object-top opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-fade-up" />
        <div className="absolute inset-0 bg-gradient-radial-cyan" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 -mt-48 md:-mt-72 relative z-10 grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
        <div className="space-y-5 flex flex-col items-center md:items-stretch">
          <div className="relative w-56 md:w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-elevated border border-glass-stroke bg-nexus-surface">
            <Image src={posterUrl} alt={tv.name} fill placeholder="blur"
              blurDataURL={ImageService.getBlurHash()}
              sizes="(max-width: 768px) 224px, 300px" className="object-cover" />
          </div>
          <button
            onClick={() => { if (!activeProfile) { router.push('/profile'); return; } toggleFavoriteMutation.mutate(); }}
            disabled={toggleFavoriteMutation.isPending}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border transition-all duration-300 font-semibold text-xs tracking-wider uppercase active:scale-[0.97] ${
              isFavorite
                ? 'bg-cyan-muted border-cyan/30 text-cyan hover:bg-cyan hover:text-black'
                : 'border-glass-stroke hover:border-white/20 text-nexus-muted hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            {isFavorite ? <><BookmarkCheck className="w-4 h-4" /><span>Bookmarked</span></> : <><Bookmark className="w-4 h-4" /><span>Add to Watchlist</span></>}
          </button>
        </div>

        <div className="md:col-span-3 space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[0.95]">{tv.name}</h1>
            {tv.tagline && <p className="text-sm italic text-nexus-muted font-light">&ldquo;{tv.tagline}&rdquo;</p>}
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-semibold text-nexus-muted items-center pb-4 border-b border-glass-stroke">
            <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-cyan" /><span>{releaseYear}</span></div>
            <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-cyan" /><span>{seasons.length} Seasons ({tv.episode_run_time?.[0] || 50}m episodes)</span></div>
            <div className="flex items-center gap-1.5"><Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /><span className="text-white">{rating}</span></div>
            <div className="flex items-center gap-1.5"><Languages className="w-4 h-4 text-cyan" /><span>English, Espa&ntilde;ol</span></div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-cyan font-bold">Overview</h3>
            <p className="text-sm md:text-base font-light text-nexus-muted leading-relaxed">{tv.overview}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {tv.genres?.map((g: any) => (
              <span key={g.id} className="px-4 py-2 rounded-full border border-glass-stroke bg-nexus-card text-[11px] font-semibold text-white tracking-wide">{g.name}</span>
            ))}
          </div>

          <div className="pt-2">
            <Link href={`/watch/tv/${id}?season=1&episode=1`}
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-bold text-sm tracking-wide transition-all duration-300 hover:shadow-glow-cyan-lg active:scale-[0.97] overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-cyan to-cyan-dark opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Play className="relative w-4 h-4 fill-black group-hover:fill-white transition-colors duration-300" />
              <span className="relative">Play S1 E1</span>
            </Link>
          </div>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-6 md:px-10 mt-20 space-y-6">
        <div className="border-t border-glass-stroke pt-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 rounded-full bg-cyan shadow-glow-cyan-sm" />
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight text-white">Episodes</h3>
              <p className="text-[10px] text-nexus-muted font-semibold tracking-[0.15em] uppercase mt-0.5">Chapter Selection</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {seasons.map((s: any) => (
              <button key={s.season_number} onClick={() => setActiveSeason(s.season_number)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wider transition-all duration-300 border ${
                  activeSeason === s.season_number
                    ? 'bg-cyan-muted border-cyan/30 text-cyan shadow-glow-cyan-sm'
                    : 'border-glass-stroke text-nexus-muted hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                {s.name || `S${s.season_number}`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {episodes.map((ep: any) => (
            <Link key={ep.episode_number} href={`/watch/tv/${id}?season=${activeSeason}&episode=${ep.episode_number}`}
              className="glass-card rounded-2xl p-5 flex items-start gap-4 border border-glass-stroke hover:border-cyan/20 transition-all duration-400 ease-out-expo group">
              <div className="w-11 h-11 rounded-xl bg-white/[0.03] border border-glass-stroke flex items-center justify-center text-nexus-muted group-hover:bg-cyan-muted group-hover:border-cyan/30 group-hover:text-cyan shrink-0 transition-all duration-300">
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-[11px] text-cyan font-bold uppercase tracking-wider">Episode {ep.episode_number}</p>
                <h4 className="text-sm font-bold text-white group-hover:text-cyan transition-colors duration-300 truncate">{ep.name}</h4>
                {ep.overview && <p className="text-xs text-nexus-muted font-light leading-relaxed line-clamp-2">{ep.overview}</p>}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {tv.cast && tv.cast.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-10 mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-6 w-1 rounded-full bg-cyan shadow-glow-cyan-sm" />
            <div><h3 className="font-display text-xl font-bold tracking-tight text-white">Cast</h3><p className="text-[10px] text-nexus-muted font-semibold tracking-[0.15em] uppercase mt-0.5">Actors &amp; Roles</p></div>
          </div>
          <div className="flex gap-6 overflow-x-auto no-scrollbar pb-2">
            {tv.cast.map((c: any, idx: number) => {
              const avatar = ImageService.getProfile(c.profile_path, c.name);
              return (
                <div key={idx} className="flex flex-col items-center shrink-0 w-24 gap-2.5 text-center">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border border-glass-stroke ring-1 ring-white/5">
                    <Image src={avatar} alt={c.name} fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white truncate max-w-[90px]">{c.name}</p>
                    <p className="text-[10px] text-nexus-muted truncate max-w-[90px]">{c.character}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {trailerKey && (
        <section className="max-w-7xl mx-auto px-6 md:px-10 mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-6 w-1 rounded-full bg-cyan shadow-glow-cyan-sm" />
            <div><h3 className="font-display text-xl font-bold tracking-tight text-white">Official Preview</h3><p className="text-[10px] text-nexus-muted font-semibold tracking-[0.15em] uppercase mt-0.5">Trailer</p></div>
          </div>
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-glass-stroke bg-black shadow-elevated">
            <iframe src={`https://www.youtube.com/embed/${trailerKey}?autoplay=0&mute=1&controls=1`} title="Official Trailer"
              className="absolute top-0 left-0 w-full h-full" frameBorder="0" allowFullScreen style={{ border: 'none' }} />
          </div>
        </section>
      )}

      {recommendations.length > 0 && (
        <div className="mt-16">
          <MovieRow title="Recommended Masterpieces" subtitle="Similar shows you might like" items={recommendations.map(m => ({ ...m, media_type: 'tv' }))} />
        </div>
      )}

      <section className="max-w-4xl mx-auto px-6 md:px-10 mt-20 space-y-8">
        <div className="border-t border-glass-stroke pt-12">
          <h3 className="font-display text-2xl font-bold tracking-tight text-white mb-1">Editorial Critiques</h3>
          <p className="text-xs text-nexus-muted font-semibold tracking-wider uppercase mb-8">Viewer Reviews</p>
        </div>

        {user && activeProfile ? (
          <form onSubmit={handleReviewSubmit} className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-glass-stroke">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan">
                <Sparkles className="w-4 h-4" /><span>Review as {activeProfile.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-nexus-muted font-semibold">Score:</span>
                <select value={ratingInput} onChange={(e) => setRatingInput(parseFloat(e.target.value))}
                  className="bg-nexus-surface border border-glass-stroke text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-cyan/50">
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(v => <option key={v} value={v.toFixed(1)}>{v.toFixed(1)}</option>)}
                </select>
              </div>
            </div>
            <textarea value={reviewInput} onChange={(e) => setReviewInput(e.target.value)}
              placeholder="Share your thoughts on the series..." required rows={4}
              className="w-full bg-nexus-surface border border-glass-stroke rounded-xl p-4 text-sm text-white placeholder-nexus-muted focus:outline-none focus:border-white/20 resize-none" />
            <div className="flex items-center justify-between">
              {reviewSuccess ? <span className="text-xs text-emerald-400 font-semibold">Review saved successfully.</span> : <span />}
              <button type="submit" disabled={createReviewMutation.isPending}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-cyan text-black font-semibold text-xs tracking-wider uppercase transition-all duration-300 active:scale-[0.97] disabled:opacity-50">
                <span>Submit Review</span><Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <div className="glass-panel rounded-2xl p-8 text-center">
            <p className="text-sm text-nexus-muted">Sign in with a profile to publish a review.</p>
          </div>
        )}

        <div className="space-y-4">
          {reviews.length > 0 ? reviews.map((r) => (
            <div key={r.id} className="glass-card rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-nexus-card border border-glass-stroke flex items-center justify-center text-xs font-bold text-white uppercase">
                    {r.profile_name?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{r.profile_name || 'Anonymous'}</p>
                    <p className="text-[9px] text-nexus-muted">{new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-bold">
                  <Star className="w-3 h-3 fill-current" /><span>{r.rating?.toFixed(1)}</span>
                </div>
              </div>
              <p className="text-sm font-light text-nexus-muted leading-relaxed">{r.review_text}</p>
            </div>
          )) : (
            <p className="text-sm text-nexus-muted italic text-center py-8">No reviews yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default function TvDetailsWrapper() {
  return (
    <TvErrorBoundary>
      <TvDetailsPage />
    </TvErrorBoundary>
  );
}
