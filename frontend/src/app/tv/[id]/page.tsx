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
      <div className="w-full min-h-screen bg-[#0D0E11] flex justify-center items-center text-center">
        <p className="text-xs font-mono text-[#87878A] uppercase tracking-widest">TV details not found.</p>
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
    <div className="w-full min-h-screen bg-[#0B131B] text-[#F0F0F0] pb-28">
      {/* Immersive Backdrop Banner */}
      <div className="relative w-full h-[65vh] md:h-[80vh] select-none border-b border-[#4A6E8D]/25">
        <Image
          src={backdropUrl}
          alt={tv.name}
          fill
          priority
          placeholder="blur"
          blurDataURL={ImageService.getBlurHash()}
          className="object-cover object-top opacity-40 grayscale-[20%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B131B] via-[#0B131B]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B131B] via-transparent to-[#0B131B]/80" />
      </div>

      {/* Main TV Poster & Info Grid */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 -mt-48 md:-mt-72 relative z-10 grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
        <div className="space-y-4 flex flex-col items-center md:items-stretch">
          <div className="relative w-56 md:w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_25px_60px_rgba(11,19,27,0.95)] border border-[#4A6E8D]/30 bg-[#1B3A57]/30">
            <Image
              src={posterUrl}
              alt={tv.name}
              fill
              placeholder="blur"
              blurDataURL={ImageService.getBlurHash()}
              sizes="(max-width: 768px) 224px, 300px"
              className="object-cover"
            />
          </div>
          <button
            onClick={() => {
              if (!activeProfile) {
                router.push('/profile');
                return;
              }
              toggleFavoriteMutation.mutate();
            }}
            disabled={toggleFavoriteMutation.isPending}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border transition-all font-sans font-semibold text-xs tracking-wide cursor-pointer ${
              isFavorite
                ? 'bg-[#A4C8E1] text-[#0B131B] border-[#A4C8E1] shadow-[0_0_20px_rgba(164,200,225,0.4)]'
                : 'border-[#4A6E8D]/40 bg-[#1B3A57]/60 text-[#F0F0F0] hover:bg-[#2C3E50]/70 backdrop-blur-xl'
            }`}
          >
            {isFavorite ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-[#0B131B]" />
                <span>Bookmarked</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 text-[#F0F0F0]/80" />
                <span>Add to Watchlist</span>
              </>
            )}
          </button>
        </div>

        <div className="md:col-span-3 space-y-6">
          {/* Metadata Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#1B3A57]/70 border border-[#4A6E8D]/40 text-[#A4C8E1] text-[10px] font-sans font-semibold">
              Series Premiere
            </span>
            <span className="px-3 py-1 rounded-full bg-[#1B3A57]/30 border border-[#4A6E8D]/25 text-[10px] font-sans font-medium text-[#F0F0F0]/80 backdrop-blur-md">
              Dolby Atmos
            </span>
            <span className="px-3 py-1 rounded-full bg-[#1B3A57]/30 border border-[#4A6E8D]/25 text-[10px] font-sans font-medium text-[#F0F0F0]/80 backdrop-blur-md">
              4K HDR
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#F0F0F0] leading-[0.95]">
              {tv.name}
            </h1>
            {tv.tagline && <p className="text-sm italic text-[#4A6E8D] font-light">&ldquo;{tv.tagline}&rdquo;</p>}
          </div>

          <div className="flex flex-wrap gap-5 text-xs font-sans text-[#4A6E8D] items-center pb-4 border-b border-[#4A6E8D]/20">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#4A6E8D]" />
              <span>{releaseYear}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#4A6E8D]" />
              <span>{seasons.length} Seasons ({tv.episode_run_time?.[0] || 50}m eps)</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#F0F0F0]">
              <Star className="w-3.5 h-3.5 text-[#A4C8E1] fill-[#A4C8E1]" />
              <span className="font-bold">{rating}</span>
              <span className="text-[#4A6E8D]">/ 10</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-[#4A6E8D]" />
              <span>English, Hindi &amp; Multi-Audio</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-wider text-[#4A6E8D] font-sans font-semibold">Overview</h3>
            <p className="text-sm md:text-base font-normal text-[#F0F0F0]/90 leading-relaxed font-sans max-w-3xl">
              {tv.overview}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {tv.genres?.map((g: any) => (
              <span key={g.id} className="px-3 py-1 rounded-full border border-[#4A6E8D]/25 bg-[#1B3A57]/30 text-xs font-sans text-[#F0F0F0]/80 hover:text-[#F0F0F0] hover:border-[#A4C8E1]/60 transition-colors">
                {g.name}
              </span>
            ))}
          </div>

          <div className="pt-2">
            <Link
              href={`/watch/tv/${id}?season=1&episode=1`}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-[#F0F0F0] hover:bg-[#A4C8E1] text-[#0B131B] text-xs font-sans font-bold tracking-wide rounded-full shadow-[0_4px_24px_rgba(240,240,240,0.3)] transition-all cursor-pointer active:scale-[0.97]"
            >
              <Play className="w-4 h-4 fill-current ml-0.5 text-[#0B131B]" />
              <span>Play S1 E1</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Chapter / Episode Selection */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 mt-20 space-y-6">
        <div className="border-t border-[#4A6E8D]/25 pt-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-[#A4C8E1] to-[#4A6E8D]" />
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight text-[#F0F0F0]">Episodes</h3>
              <p className="text-[10px] text-[#4A6E8D] font-mono font-medium tracking-[0.15em] uppercase mt-0.5">Chapter Selection</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 p-1 bg-[#0B131B]/80 border border-[#4A6E8D]/30 rounded-xl">
            {seasons.map((s: any) => (
              <button
                key={s.season_number}
                onClick={() => setActiveSeason(s.season_number)}
                className={`px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all border cursor-pointer ${
                  activeSeason === s.season_number
                    ? 'bg-[#F0F0F0] border-transparent text-[#0B131B] shadow-[0_0_15px_rgba(240,240,240,0.3)]'
                    : 'border-transparent bg-transparent text-[#4A6E8D] hover:text-[#F0F0F0] hover:bg-[#2C3E50]/40'
                }`}
              >
                {s.name || `S${s.season_number}`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {episodes.map((ep: any) => (
            <Link
              key={ep.episode_number}
              href={`/watch/tv/${id}?season=${activeSeason}&episode=${ep.episode_number}`}
              className="bg-[#1B3A57]/25 rounded-2xl p-5 flex items-start gap-4 border border-[#4A6E8D]/25 hover:border-[#A4C8E1]/60 hover:bg-[#2C3E50]/40 transition-all group cursor-pointer shadow-lg"
            >
              <div className="w-11 h-11 rounded-xl bg-[#0B131B] border border-[#4A6E8D]/30 flex items-center justify-center text-[#4A6E8D] group-hover:bg-[#F0F0F0] group-hover:border-transparent group-hover:text-[#0B131B] shrink-0 transition-all">
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-[11px] text-[#4A6E8D] font-mono font-bold uppercase tracking-wider">
                  Episode {ep.episode_number}
                </p>
                <h4 className="text-sm font-bold text-[#F0F0F0] group-hover:text-white transition-colors truncate">
                  {ep.name}
                </h4>
                {ep.overview && (
                  <p className="text-xs text-[#4A6E8D] font-normal leading-relaxed line-clamp-2">
                    {ep.overview}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Cast Showcase */}
      {tv.cast && tv.cast.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-12 mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-[#A4C8E1] to-[#4A6E8D]" />
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight text-[#F0F0F0]">Cast</h3>
              <p className="text-[10px] text-[#4A6E8D] font-mono font-medium tracking-[0.15em] uppercase mt-0.5">Actors &amp; Roles</p>
            </div>
          </div>
          <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
            {tv.cast.map((c: any, idx: number) => {
              const avatar = ImageService.getProfile(c.profile_path, c.name);
              return (
                <div key={idx} className="flex flex-col items-center shrink-0 w-24 gap-2 text-center">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-[#4A6E8D]/30 bg-[#1B3A57]/30">
                    <Image src={avatar} alt={c.name} fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#F0F0F0] truncate max-w-[90px]">{c.name}</p>
                    <p className="text-[10px] font-mono text-[#4A6E8D] truncate max-w-[90px]">{c.character}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Official Preview */}
      {trailerKey && (
        <section className="max-w-7xl mx-auto px-6 md:px-12 mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-[#A4C8E1] to-[#4A6E8D]" />
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight text-[#F0F0F0]">Official Preview</h3>
              <p className="text-[10px] text-[#4A6E8D] font-mono font-medium tracking-[0.15em] uppercase mt-0.5">Trailer</p>
            </div>
          </div>
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-[#4A6E8D]/30 bg-[#0B131B] shadow-[0_25px_60px_rgba(11,19,27,0.95)]">
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=0&mute=1&controls=1`}
              title="Official Trailer"
              className="absolute top-0 left-0 w-full h-full"
              frameBorder="0"
              allowFullScreen
              style={{ border: 'none' }}
            />
          </div>
        </section>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-20">
          <MovieRow
            title="Recommended Masterpieces"
            subtitle="Similar shows curated for you"
            items={recommendations.map(m => ({ ...m, media_type: 'tv' }))}
          />
        </div>
      )}

      {/* Editorial Critiques */}
      <section className="max-w-4xl mx-auto px-6 md:px-12 mt-20 space-y-8">
        <div className="border-t border-[#4A6E8D]/25 pt-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-[#A4C8E1] to-[#4A6E8D]" />
            <h3 className="font-display text-2xl font-bold tracking-tight text-[#F0F0F0]">Editorial Critiques</h3>
          </div>
          <p className="text-xs text-[#4A6E8D] font-mono font-medium tracking-wider uppercase ml-4">Viewer Reviews</p>
        </div>

        {user && activeProfile ? (
          <form onSubmit={handleReviewSubmit} className="bg-[#1B3A57]/30 rounded-2xl p-6 space-y-4 border border-[#4A6E8D]/30 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#4A6E8D]/25">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#4A6E8D]">
                <Sparkles className="w-4 h-4 text-[#A4C8E1]" />
                <span>Review as {activeProfile.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#4A6E8D]">Score:</span>
                <select
                  value={ratingInput}
                  onChange={(e) => setRatingInput(parseFloat(e.target.value))}
                  className="bg-[#0B131B] border border-[#4A6E8D]/40 text-[#F0F0F0] rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#A4C8E1]/60"
                >
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(v => (
                    <option key={v} value={v.toFixed(1)}>{v.toFixed(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <textarea
              value={reviewInput}
              onChange={(e) => setReviewInput(e.target.value)}
              placeholder="Share your thoughts on the series..."
              required
              rows={4}
              className="w-full bg-[#0B131B] border border-[#4A6E8D]/40 rounded-xl p-4 text-sm text-[#F0F0F0] placeholder-[#4A6E8D] focus:outline-none focus:border-[#A4C8E1]/60 resize-none font-sans"
            />
            <div className="flex items-center justify-between">
              {reviewSuccess ? (
                <span className="text-xs font-mono text-[#A4C8E1] font-semibold">Review saved successfully.</span>
              ) : (
                <span />
              )}
              <button
                type="submit"
                disabled={createReviewMutation.isPending}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#F0F0F0] hover:bg-[#A4C8E1] text-[#0B131B] font-mono font-bold text-xs tracking-wider uppercase transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-[0_4px_16px_rgba(240,240,240,0.3)]"
              >
                <span>Submit Review</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-[#1B3A57]/20 rounded-2xl p-8 text-center border border-[#4A6E8D]/25">
            <p className="text-xs font-mono text-[#4A6E8D] uppercase tracking-wider">Sign in with a profile to publish a review.</p>
          </div>
        )}

        <div className="space-y-4">
          {reviews.length > 0 ? (
            reviews.map((r) => (
              <div key={r.id} className="bg-[#1B3A57]/25 rounded-2xl p-5 space-y-3.5 border border-[#4A6E8D]/25 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#0B131B] border border-[#4A6E8D]/30 flex items-center justify-center text-xs font-mono font-bold text-[#A4C8E1] uppercase">
                      {r.profile_name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#F0F0F0]">{r.profile_name || 'Anonymous'}</p>
                      <p className="text-[10px] font-mono text-[#4A6E8D]">
                        {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2C3E50]/60 border border-[#4A6E8D]/40 text-[#A4C8E1] text-xs font-mono font-bold">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{r.rating?.toFixed(1)}</span>
                  </div>
                </div>
                <p className="text-sm font-normal text-[#F0F0F0]/90 leading-relaxed font-sans">{r.review_text}</p>
              </div>
            ))
          ) : (
            <p className="text-xs font-mono text-[#4A6E8D] uppercase tracking-wider text-center py-8">No editorial reviews yet.</p>
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
