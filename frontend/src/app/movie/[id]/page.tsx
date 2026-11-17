"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useUserStore } from "../../../store/userStore";
import { apiFetch, MovieDetail, ReviewItem, MediaItem, TrailerVideo } from "../../../lib/api";
import { ImageService } from "../../../lib/ImageService";
import { DetailsSkeleton } from "../../../components/shared/Skeletons";
import { MovieErrorBoundary } from "../../../components/shared/ErrorBoundaries";
import MovieRow from "../../../components/shared/MovieRow";
import { Play, Star, Bookmark, BookmarkCheck, Clock, Calendar, Languages, Send, Sparkles, RotateCcw, Film, Plus, Check, Clapperboard, Download, Share2, X } from "lucide-react";

function MovieDetailsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useParams() as { id: string };
  const { user, activeProfile } = useUserStore();

  const [ratingInput, setRatingInput] = useState<number>(8.0);
  const [reviewInput, setReviewInput] = useState<string>("");
  const [reviewSuccess, setReviewSuccess] = useState<boolean>(false);
  const [showTrailerModal, setShowTrailerModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: movie, isLoading, refetch: refetchMovie } = useQuery<MovieDetail>({
    queryKey: ["movie-details", id],
    queryFn: () => apiFetch(`/api/tmdb/movie/${id}`),
  });

  const { data: recommendations = [] } = useQuery<MediaItem[]>({
    queryKey: ["movie-recommendations", id],
    queryFn: () => apiFetch(`/api/tmdb/movie/${id}/recommendations`),
  });

  const { data: reviews = [], refetch: refetchReviews } = useQuery<ReviewItem[]>({
    queryKey: ["reviews", id],
    queryFn: () => apiFetch(`/api/user/reviews/${id}`),
  });

  const { data: favorites = [] } = useQuery<any[]>({
    queryKey: ["favorites", activeProfile?.id],
    queryFn: () => apiFetch("/api/user/favorites", {
      headers: activeProfile ? { "X-Profile-ID": activeProfile.id } : {},
    }),
    enabled: !!activeProfile,
  });

  const isFavorite = favorites.some((fav) => fav.media_id === id);

  const toggleFavoriteMutation = useMutation({
    mutationFn: () => {
      const headers: Record<string, string> = activeProfile ? { "X-Profile-ID": activeProfile.id } : {};
      if (isFavorite) {
        return apiFetch(`/api/user/favorites/${id}`, { method: "DELETE", headers });
      } else {
        return apiFetch("/api/user/favorites", {
          method: "POST",
          headers,
          body: JSON.stringify({
            media_id: id,
            media_type: "movie",
            title: movie?.title || "",
            poster_path: movie?.poster_path || "",
          }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", activeProfile?.id] });
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: () => {
      const headers: Record<string, string> = activeProfile ? { "X-Profile-ID": activeProfile.id } : {};
      return apiFetch("/api/user/reviews", {
        method: "POST",
        headers,
        body: JSON.stringify({
          media_id: id,
          media_type: "movie",
          rating: ratingInput,
          review_text: reviewInput,
        }),
      });
    },
    onSuccess: () => {
      setReviewInput("");
      setReviewSuccess(true);
      refetchReviews();
      setTimeout(() => setReviewSuccess(false), 3000);
    },
  });

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) {
      router.push("/profile");
      return;
    }
    createReviewMutation.mutate();
  };

  if (isLoading) return <DetailsSkeleton />;
  if (!movie) {
    return (
      <div className="w-full min-h-screen bg-[#0B131B] flex flex-col justify-center items-center text-center px-6">
        <div className="w-16 h-16 rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.15] flex items-center justify-center text-[#A4C8E1] mb-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_10px_30px_rgba(0,0,0,0.7)]">
          <Film className="w-8 h-8 opacity-80" />
        </div>
        <h2 className="text-2xl font-bold font-display text-[#F0F0F0] mb-2">Movie Details Not Found</h2>
        <p className="text-xs font-sans text-[#8FA8AD] max-w-sm mb-6">
          We couldn't load information for this movie. It may have been removed or TMDB is temporarily unreachable.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetchMovie()}
            className="px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-[#F0F0F0] border border-white/[0.15] backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] text-xs font-medium transition cursor-pointer flex items-center gap-2 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-full bg-[#F0F0F0]/95 hover:bg-white text-[#0B131B] text-xs font-semibold backdrop-blur-xl border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_20px_rgba(255,255,255,0.2)] transition cursor-pointer active:scale-95"
          >
            Explore Home
          </Link>
        </div>
      </div>
    );
  }

  const backdropUrl = ImageService.getBackdrop(movie.backdrop_path, "original", movie.title);
  const posterUrl = ImageService.getPoster(movie.poster_path, "w500", movie.title);
  const releaseYear = (movie.release_date || "").split("-")[0] || "N/A";
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
  const duration = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : "N/A";
  const trailerKey = movie.videos?.results?.find((v: TrailerVideo) => v.type === "Trailer" && v.site === "YouTube")?.key;
  const languageName = movie.original_language === "en" 
    ? "English" 
    : (movie.spoken_languages?.[0]?.english_name || movie.original_language?.toUpperCase() || "English");

  const handleShare = async () => {
    if (typeof window !== "undefined") {
      if (navigator.share) {
        try {
          await navigator.share({
            title: movie?.title || "Nightcast",
            text: `Watch ${movie?.title || "this title"} on Nightcast`,
            url: window.location.href,
          });
          return;
        } catch {
          // User dismissed
        }
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setToastMessage("Link copied to clipboard!");
        setTimeout(() => setToastMessage(null), 2500);
      }
    }
  };

  const handleToggleFavorite = () => {
    if (!activeProfile) {
      router.push("/profile");
      return;
    }
    toggleFavoriteMutation.mutate();
  };

  return (
    <div className="w-full min-h-screen bg-[#0B131B] text-[#F0F0F0] pb-28">
      {/* Cinematic Redesigned Hero Banner matching reference image */}
      <div className="relative w-full min-h-[72vh] md:min-h-[82vh] flex items-center select-none overflow-hidden pt-28 pb-16 md:py-32">
        {/* Full-bleed Backdrop Artwork */}
        <Image
          src={backdropUrl}
          alt={`${movie.title} backdrop`}
          fill
          priority
          placeholder="blur"
          blurDataURL={ImageService.getBlurHash()}
          className="object-cover object-top opacity-60 md:opacity-75"
        />

        {/* Seamless Vignettes */}
        {/* Left Dark Vignette */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B131B] via-[#0B131B]/90 md:via-[#0B131B]/75 to-transparent z-[1]" />
        {/* Bottom Smooth Blend */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B131B] via-[#0B131B]/60 to-transparent z-[1]" />
        {/* Top Navbar Shadow */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0B131B]/80 to-transparent z-[1]" />

        {/* Hero Content Overlay */}
        <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-12 w-full relative z-10">
          <div className="max-w-2xl space-y-4 md:space-y-5">
            {/* Title */}
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-red-600 drop-shadow-[0_4px_30px_rgba(220,38,38,0.35)] leading-[1.02]">
              {movie.title}
            </h1>

            {/* TMDB Rating */}
            <div className="flex items-center gap-2">
              <span className="text-red-500 font-extrabold text-sm md:text-base tracking-wider uppercase">
                TMDB {rating}
              </span>
            </div>

            {/* Metadata Row: Year • Duration • Language */}
            <div className="flex items-center gap-2.5 text-xs md:text-sm text-neutral-300 font-medium tracking-wide">
              <span>{releaseYear}</span>
              <span className="text-neutral-500">•</span>
              <span>{duration}</span>
              <span className="text-neutral-500">•</span>
              <span>{languageName}</span>
            </div>

            {/* Synopsis */}
            {movie.overview && (
              <p className="text-sm md:text-base text-neutral-300/90 leading-relaxed font-normal line-clamp-3 md:line-clamp-4 max-w-xl">
                {movie.overview}
              </p>
            )}

            {/* Genres Row (pipe separated) */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm font-bold text-white pt-1">
                {movie.genres.map((g: any, i: number) => (
                  <React.Fragment key={g.id}>
                    <span className="hover:text-red-400 transition-colors">{g.name}</span>
                    {i < movie.genres.length - 1 && (
                      <span className="text-neutral-500 font-normal">|</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Action Buttons Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              {/* Watch Now Button */}
              <Link
                href={`/watch/movie/${id}`}
                data-tv-initial="true"
                data-tv-card="true"
                className="inline-flex items-center gap-2.5 px-7 sm:px-8 py-3.5 bg-white hover:bg-neutral-200 text-black font-extrabold text-sm rounded-2xl shadow-[0_4px_24px_rgba(255,255,255,0.25)] transition-all cursor-pointer active:scale-95"
              >
                <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                <span>Watch Now</span>
              </Link>

              {/* Watchlist (+ / ✓) */}
              <button
                onClick={handleToggleFavorite}
                disabled={toggleFavoriteMutation.isPending}
                title={isFavorite ? "In Watchlist" : "Add to Watchlist"}
                aria-label={isFavorite ? "In Watchlist" : "Add to Watchlist"}
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                  isFavorite
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    : "bg-white/[0.08] hover:bg-white/[0.16] border-white/15 text-white backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
                }`}
              >
                {isFavorite ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>

              {/* Trailer Clapperboard */}
              {trailerKey && (
                <button
                  onClick={() => setShowTrailerModal(true)}
                  title="Watch Trailer Preview"
                  aria-label="Watch Trailer Preview"
                  className="w-12 h-12 rounded-2xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 backdrop-blur-xl flex items-center justify-center text-white transition-all cursor-pointer active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
                >
                  <Clapperboard className="w-5 h-5 text-white/90" />
                </button>
              )}

              {/* Download */}
              <a
                href={`https://web.screenscape.fun/download/movie/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Download Options"
                aria-label="Download Options"
                className="w-12 h-12 rounded-2xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 backdrop-blur-xl flex items-center justify-center text-white transition-all cursor-pointer active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
              >
                <Download className="w-5 h-5 text-white/90" />
              </a>

              {/* Share */}
              <button
                onClick={handleShare}
                title="Share Movie"
                aria-label="Share Movie"
                className="w-12 h-12 rounded-2xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 backdrop-blur-xl flex items-center justify-center text-white transition-all cursor-pointer active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
              >
                <Share2 className="w-5 h-5 text-white/90" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      {showTrailerModal && trailerKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6"
          onClick={() => setShowTrailerModal(false)}
        >
          <div
            className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden border border-white/20 bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTrailerModal(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&controls=1`}
              title="Official Trailer"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-xs shadow-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cast Section */}
      {movie.cast && movie.cast.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 sm:px-8 md:px-12 mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-[#A4C8E1] to-[#39AEA9] shadow-[0_0_10px_rgba(57,174,169,0.7)]" />
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight text-[#F0F0F0]">Principal Cast</h3>
              <p className="text-xs text-[#8FA8AD] font-sans">Actors &amp; Roles</p>
            </div>
          </div>
          <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
            {movie.cast.map((c: any, idx: number) => {
              const avatar = ImageService.getProfile(c.profile_path, c.name);
              return (
                <div key={idx} className="flex flex-col items-center shrink-0 w-24 gap-2 text-center">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-white/[0.15] bg-[#0B131B]/60 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
                    <Image src={avatar} alt={c.name} fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-[#F0F0F0] truncate max-w-[90px]">{c.name}</p>
                    <p className="text-[11px] font-sans text-[#8FA8AD] truncate max-w-[90px]">{c.character}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Official Trailer */}
      {trailerKey && (
        <section className="max-w-7xl mx-auto px-6 sm:px-8 md:px-12 mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-[#A4C8E1] to-[#39AEA9] shadow-[0_0_10px_rgba(57,174,169,0.7)]" />
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight text-[#F0F0F0]">Official Preview</h3>
              <p className="text-xs text-[#8FA8AD] font-sans">Cinematic Trailer</p>
            </div>
          </div>
          <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-white/[0.15] bg-[#0B131B]/70 backdrop-blur-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_25px_60px_rgba(0,0,0,0.9)]">
            <iframe
              src={`https://www.youtube.com/embed/${trailerKey}?autoplay=0&mute=1&controls=1`}
              title="Official Trailer"
              className="absolute top-0 left-0 w-full h-full"
              frameBorder="0"
              allowFullScreen
            />
          </div>
        </section>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-20">
          <MovieRow
            title="Recommended Masterpieces"
            items={recommendations.map((m) => ({ ...m, media_type: "movie" }))}
          />
        </div>
      )}

      {/* Editorial Critiques */}
      <section className="max-w-4xl mx-auto px-6 md:px-12 mt-20 space-y-8">
        <div className="border-t border-white/[0.08] pt-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-[#A4C8E1] to-[#39AEA9] shadow-[0_0_10px_rgba(57,174,169,0.7)]" />
            <h3 className="font-display text-2xl font-bold tracking-tight text-[#F0F0F0]">Editorial Critiques</h3>
          </div>
          <p className="text-xs text-[#8FA8AD] font-mono font-medium tracking-wider uppercase ml-4">Viewer Reviews</p>
        </div>

        {user && activeProfile ? (
          <form onSubmit={handleReviewSubmit} className="bg-white/[0.04] backdrop-blur-3xl rounded-3xl p-6 sm:p-8 space-y-5 border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#8FA8AD]">
                <Sparkles className="w-4 h-4 text-[#A4C8E1]" />
                <span>Review as {activeProfile.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="movie-score-select" className="text-xs font-mono text-[#8FA8AD] cursor-pointer">
                  Score:
                </label>
                <select
                  id="movie-score-select"
                  aria-label="Score rating out of 10"
                  value={ratingInput}
                  onChange={(e) => setRatingInput(parseFloat(e.target.value))}
                  className="bg-[#0B131B]/80 border border-white/[0.15] text-[#F0F0F0] rounded-xl px-3 py-1.5 text-xs font-mono backdrop-blur-xl focus:outline-none focus:border-[#39AEA9] focus:ring-1 focus:ring-[#39AEA9]"
                >
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((v) => (
                    <option key={v} value={v.toFixed(1)}>
                      {v.toFixed(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="movie-review-textarea" className="sr-only">
                Write your review
              </label>
              <textarea
                id="movie-review-textarea"
                value={reviewInput}
                onChange={(e) => setReviewInput(e.target.value)}
                placeholder="Share your thoughts on the movie..."
                required
                rows={4}
                className="w-full bg-[#0B131B]/60 border border-white/[0.15] rounded-2xl p-4 text-sm text-[#F0F0F0] placeholder-[#8FA8AD] backdrop-blur-2xl focus:outline-none focus:border-[#39AEA9] focus:ring-1 focus:ring-[#39AEA9] resize-none font-sans shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
              />
            </div>
            <div className="flex items-center justify-between">
              {reviewSuccess ? (
                <span className="text-xs font-mono text-[#39AEA9] font-semibold">Review saved successfully.</span>
              ) : (
                <span />
              )}
              <button
                type="submit"
                disabled={createReviewMutation.isPending}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#F0F0F0]/95 hover:bg-white text-[#0B131B] font-mono font-bold text-xs tracking-wider uppercase backdrop-blur-xl border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_16px_rgba(240,240,240,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
              >
                <span>Submit Review</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white/[0.04] backdrop-blur-2xl rounded-2xl p-8 text-center border border-white/[0.1] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
            <p className="text-xs font-mono text-[#8FA8AD] uppercase tracking-wider">Sign in with a profile to publish a review.</p>
          </div>
        )}

        <div className="space-y-4">
          {reviews.length > 0 ? (
            reviews.map((r) => (
              <div key={r.id} className="bg-white/[0.04] backdrop-blur-2xl rounded-2xl p-5 space-y-3.5 border border-white/[0.1] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.15] flex items-center justify-center text-xs font-mono font-bold text-[#A4C8E1] uppercase shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                      {r.profile_name?.charAt(0) || "A"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#F0F0F0]">{r.profile_name || "Anonymous"}</p>
                      <p className="text-[10px] font-mono text-[#8FA8AD]">
                        {new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] backdrop-blur-xl border border-white/[0.15] text-[#A4C8E1] text-xs font-mono font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{r.rating?.toFixed(1)}</span>
                  </div>
                </div>
                <p className="text-sm font-normal text-[#F0F0F0]/90 leading-relaxed font-sans">{r.review_text}</p>
              </div>
            ))
          ) : (
            <p className="text-xs font-mono text-[#8FA8AD] uppercase tracking-wider text-center py-8">No editorial reviews yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default function MovieDetailsWrapper() {
  return (
    <MovieErrorBoundary>
      <MovieDetailsPage />
    </MovieErrorBoundary>
  );
}