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
import { Play, Star, Bookmark, BookmarkCheck, Clock, Calendar, Languages, Send, Sparkles, RotateCcw, Film } from "lucide-react";

function MovieDetailsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useParams() as { id: string };
  const { user, activeProfile } = useUserStore();

  const [ratingInput, setRatingInput] = useState<number>(8.0);
  const [reviewInput, setReviewInput] = useState<string>("");
  const [reviewSuccess, setReviewSuccess] = useState<boolean>(false);

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

  return (
    <div className="w-full min-h-screen bg-[#0B131B] text-[#F0F0F0] pb-28">
      {/* Immersive Backdrop Banner */}
      <div className="relative w-full h-[68vh] md:h-[82vh] select-none border-b border-white/[0.08]">
        <Image
          src={backdropUrl}
          alt={`${movie.title} backdrop cinematic artwork`}
          fill
          priority
          placeholder="blur"
          blurDataURL={ImageService.getBlurHash()}
          className="object-cover object-top opacity-40 grayscale-[20%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B131B] via-[#0B131B]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B131B] via-transparent to-[#0B131B]/80" />
      </div>

      {/* Main Movie Card & Info Content */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-12 -mt-48 md:-mt-72 relative z-10 grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
        <div className="space-y-4 flex flex-col items-center md:items-stretch">
          <div className="relative w-56 md:w-full aspect-[2/3] rounded-3xl overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_25px_60px_rgba(0,0,0,0.9)] border border-white/[0.15] bg-[#0B131B]/60 backdrop-blur-2xl">
            <Image
              src={posterUrl}
              alt={`${movie.title} official movie poster`}
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
                router.push("/profile");
                return;
              }
              toggleFavoriteMutation.mutate();
            }}
            disabled={toggleFavoriteMutation.isPending}
            aria-label={isFavorite ? "Remove from watchlist" : "Add to watchlist"}
            className={`w-full py-3.5 px-6 rounded-2xl border font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] ${
              isFavorite
                ? "bg-[#A4C8E1] text-[#0B131B] border-[#A4C8E1] shadow-[0_0_24px_rgba(164,200,225,0.4),inset_0_1px_1px_rgba(255,255,255,0.5)]"
                : "bg-white/[0.06] backdrop-blur-2xl text-[#F0F0F0] border-white/[0.15] hover:bg-white/[0.12] hover:border-white/[0.25] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
            }`}
          >
            {isFavorite ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-[#0B131B]" />
                <span>In Watchlist</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 text-white/80" />
                <span>Add to Watchlist</span>
              </>
            )}
          </button>
        </div>

        <div className="md:col-span-3 space-y-6">
          {/* Metadata Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full bg-[#39AEA9]/15 border border-[#39AEA9]/35 text-[#39AEA9] text-[10px] font-sans font-semibold backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
              Nightcast Exclusive
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.12] text-[10px] font-sans font-medium text-[#F0F0F0]/90 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
              4K Ultra HD
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.12] text-[10px] font-sans font-medium text-[#F0F0F0]/90 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
              Dolby Vision
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#F0F0F0] leading-[0.95]">
              {movie.title}
            </h1>
            {movie.tagline && (
              <p className="text-sm italic text-[#8FA8AD] font-light">"{movie.tagline}"</p>
            )}
          </div>

          <div className="flex flex-wrap gap-5 text-xs font-sans text-[#8FA8AD] items-center pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#8FA8AD]" />
              <span>{releaseYear}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#8FA8AD]" />
              <span>{duration}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#F0F0F0]">
              <Star className="w-3.5 h-3.5 fill-current text-[#A4C8E1]" />
              <span className="font-bold">{rating}</span>
              <span className="text-[#8FA8AD]">/ 10</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-[#8FA8AD]" />
              <span>English, Dual Audio</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-wider text-[#8FA8AD] font-sans font-semibold">Synopsis</h3>
            <p className="text-sm md:text-base font-normal text-[#F0F0F0]/90 leading-relaxed font-sans max-w-3xl">
              {movie.overview}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {movie.genres?.map((g: any) => (
              <span key={g.id} className="px-3 py-1 rounded-full border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] text-xs font-sans text-[#F0F0F0]/90 hover:text-white hover:border-[#39AEA9]/50 hover:bg-white/[0.08] transition-all">
                {g.name}
              </span>
            ))}
          </div>

          <div className="pt-2">
            <Link
              href={`/watch/movie/${id}`}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-[#F0F0F0]/95 hover:bg-white text-[#0B131B] text-xs font-sans font-bold tracking-wide rounded-full backdrop-blur-xl border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_24px_rgba(240,240,240,0.3)] transition-all cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
            >
              <Play className="w-4 h-4 fill-current ml-0.5 text-[#0B131B]" aria-hidden="true" />
              <span>Stream in 4K</span>
            </Link>
          </div>
        </div>
      </div>

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
            subtitle="Titles Selected for You"
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