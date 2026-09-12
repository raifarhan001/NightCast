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
import { Play, Star, Bookmark, BookmarkCheck, Clock, Calendar, Languages } from "lucide-react";

function MovieDetailsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useParams() as { id: string };
  const { user, activeProfile } = useUserStore();

  const { data: movie, isLoading } = useQuery<MovieDetail>({
    queryKey: ["movie-details", id],
    queryFn: () => apiFetch(`/api/tmdb/movie/${id}`),
  });

  const { data: recommendations = [] } = useQuery<MediaItem[]>({
    queryKey: ["movie-recommendations", id],
    queryFn: () => apiFetch(`/api/tmdb/movie/${id}/recommendations`),
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

  if (isLoading) return <DetailsSkeleton />;
  if (!movie) {
    return (
      <div className="w-full min-h-screen bg-[#0D0E11] flex justify-center items-center text-center">
        <p className="text-xs font-mono text-[#87878A] uppercase tracking-widest">Movie details not found.</p>
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
      <div className="relative w-full h-[68vh] md:h-[82vh] select-none border-b border-[#4A6E8D]/25">
        <Image
          src={backdropUrl}
          alt={movie.title}
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
          <div className="relative w-56 md:w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_25px_60px_rgba(11,19,27,0.95)] border border-[#4A6E8D]/30 bg-[#1B3A57]/30">
            <Image
              src={posterUrl}
              alt={movie.title}
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
            className={`w-full py-3.5 px-6 rounded-xl border font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isFavorite
                ? "bg-[#A4C8E1] text-[#0B131B] border-[#A4C8E1] shadow-[0_0_20px_rgba(164,200,225,0.4)]"
                : "bg-[#1B3A57]/60 text-[#4A6E8D] border-[#4A6E8D]/40 hover:text-[#F0F0F0] hover:bg-[#2C3E50]/70 hover:border-[#A4C8E1]/60"
            }`}
          >
            {isFavorite ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-[#0B131B]" />
                <span>In Watchlist</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 text-[#4A6E8D]" />
                <span>Add to Watchlist</span>
              </>
            )}
          </button>
        </div>

        <div className="md:col-span-3 space-y-6">
          {/* Metadata Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#1B3A57]/70 border border-[#4A6E8D]/40 text-[#A4C8E1] text-[10px] font-sans font-semibold">
              Nightcast Exclusive
            </span>
            <span className="px-3 py-1 rounded-full bg-[#1B3A57]/30 border border-[#4A6E8D]/25 text-[10px] font-sans font-medium text-[#F0F0F0]/80 backdrop-blur-md">
              4K Ultra HD
            </span>
            <span className="px-3 py-1 rounded-full bg-[#1B3A57]/30 border border-[#4A6E8D]/25 text-[10px] font-sans font-medium text-[#F0F0F0]/80 backdrop-blur-md">
              Dolby Vision
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#F0F0F0] leading-[0.95]">
              {movie.title}
            </h1>
            {movie.tagline && (
              <p className="text-sm italic text-[#4A6E8D] font-light">"{movie.tagline}"</p>
            )}
          </div>

          <div className="flex flex-wrap gap-5 text-xs font-sans text-[#4A6E8D] items-center pb-4 border-b border-[#4A6E8D]/20">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#4A6E8D]" />
              <span>{releaseYear}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#4A6E8D]" />
              <span>{duration}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#F0F0F0]">
              <Star className="w-3.5 h-3.5 fill-current text-[#A4C8E1]" />
              <span className="font-bold">{rating}</span>
              <span className="text-[#4A6E8D]">/ 10</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-[#4A6E8D]" />
              <span>English, Dual Audio</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-wider text-[#4A6E8D] font-sans font-semibold">Synopsis</h3>
            <p className="text-sm md:text-base font-normal text-[#F0F0F0]/90 leading-relaxed font-sans max-w-3xl">
              {movie.overview}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {movie.genres?.map((g: any) => (
              <span key={g.id} className="px-3 py-1 rounded-full border border-[#4A6E8D]/25 bg-[#1B3A57]/30 text-xs font-sans text-[#F0F0F0]/80 hover:text-[#F0F0F0] hover:border-[#A4C8E1]/60 transition-colors">
                {g.name}
              </span>
            ))}
          </div>

          <div className="pt-2">
            <Link
              href={`/watch/movie/${id}`}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-[#F0F0F0] hover:bg-[#A4C8E1] text-[#0B131B] text-xs font-sans font-bold tracking-wide rounded-full shadow-[0_4px_24px_rgba(240,240,240,0.3)] transition-all cursor-pointer active:scale-[0.97]"
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
            <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-[#A4C8E1] to-[#4A6E8D]" />
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight text-[#F0F0F0]">Principal Cast</h3>
              <p className="text-xs text-[#4A6E8D] font-sans">Actors &amp; Roles</p>
            </div>
          </div>
          <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
            {movie.cast.map((c: any, idx: number) => {
              const avatar = ImageService.getProfile(c.profile_path, c.name);
              return (
                <div key={idx} className="flex flex-col items-center shrink-0 w-24 gap-2 text-center">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-[#4A6E8D]/30 bg-[#1B3A57]/30">
                    <Image src={avatar} alt={c.name} fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-[#F0F0F0] truncate max-w-[90px]">{c.name}</p>
                    <p className="text-[11px] font-sans text-[#4A6E8D] truncate max-w-[90px]">{c.character}</p>
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
            <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-[#A4C8E1] to-[#4A6E8D]" />
            <div>
              <h3 className="font-display text-xl font-bold tracking-tight text-[#F0F0F0]">Official Preview</h3>
              <p className="text-xs text-[#4A6E8D] font-sans">Cinematic Trailer</p>
            </div>
          </div>
          <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-[#4A6E8D]/30 bg-[#0B131B] shadow-[0_25px_60px_rgba(11,19,27,0.95)]">
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