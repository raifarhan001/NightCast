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
      <div className="w-full min-h-screen bg-[#000000] flex justify-center items-center text-center">
        <p className="text-sm text-white/50">Movie details not found.</p>
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
    <div className="w-full min-h-screen bg-[#000000] pb-28">
      {/* Immersive Apple TV Backdrop Banner */}
      <div className="relative w-full h-[68vh] md:h-[82vh] select-none border-b border-white/10">
        <Image
          src={backdropUrl}
          alt={movie.title}
          fill
          priority
          placeholder="blur"
          blurDataURL={ImageService.getBlurHash()}
          className="object-cover object-top opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-transparent to-[#000000]/70" />
      </div>

      {/* Main Movie Card & Info Content */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-12 -mt-48 md:-mt-72 relative z-10 grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
        <div className="space-y-5 flex flex-col items-center md:items-stretch">
          <div className="relative w-56 md:w-full aspect-[2/3] rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] border border-white/15 bg-[#0A0A0C]">
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
            className={`w-full apple-btn-secondary ${isFavorite ? "bg-white text-black font-extrabold hover:bg-white/90" : ""}`}
          >
            {isFavorite ? (
              <>
                <BookmarkCheck className="w-4 h-4" />
                <span>In Watchlist</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4" />
                <span>Add to Watchlist</span>
              </>
            )}
          </button>
        </div>

        <div className="md:col-span-3 space-y-6">
          {/* Apple TV Metadata Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md border border-white/20 text-[10px] font-extrabold tracking-widest text-white uppercase">
              APPLE TV+ EXCLUSIVE
            </span>
            <span className="px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-bold tracking-wider text-white">
              4K HDR
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[0.95]">
              {movie.title}
            </h1>
            {movie.tagline && (
              <p className="text-sm italic text-white/60 font-light">"{movie.tagline}"</p>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-bold text-white/70 items-center pb-4 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-white" />
              <span>{releaseYear}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-white" />
              <span>{duration}</span>
            </div>
            <div className="flex items-center gap-1.5 text-white">
              <Star className="w-4 h-4 fill-current" />
              <span>{rating} / 10</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-white" />
              <span>English, Dual Audio</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-black">Synopsis</h3>
            <p className="text-sm md:text-base font-normal text-white/80 leading-relaxed">
              {movie.overview}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {movie.genres?.map((g: any) => (
              <span key={g.id} className="px-4 py-1.5 rounded-full border border-white/15 bg-white/5 text-[11px] font-bold text-white tracking-wide">
                {g.name}
              </span>
            ))}
          </div>

          <div className="pt-2">
            <Link
              href={`/watch/movie/${id}`}
              className="apple-btn-primary inline-flex"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" aria-hidden="true" />
              <span>Stream in 4K</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Cast Section */}
      {movie.cast && movie.cast.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 sm:px-8 md:px-12 mt-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-6 w-1 rounded-full bg-white shadow-[0_0_10px_#FFF]" />
            <div>
              <h3 className="font-display text-xl font-black tracking-tight text-white">Starring Cast</h3>
              <p className="text-[10px] text-white/50 font-bold tracking-widest uppercase mt-0.5">Key Performers</p>
            </div>
          </div>
          <div className="flex gap-6 overflow-x-auto no-scrollbar pb-2">
            {movie.cast.map((c: any, idx: number) => {
              const avatar = ImageService.getProfile(c.profile_path, c.name);
              return (
                <div key={idx} className="flex flex-col items-center shrink-0 w-24 gap-2.5 text-center">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/15 ring-2 ring-white/20">
                    <Image src={avatar} alt={c.name} fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white truncate max-w-[90px]">{c.name}</p>
                    <p className="text-[10px] text-white/60 truncate max-w-[90px]">{c.character}</p>
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
          <div className="flex items-center gap-3 mb-8">
            <div className="h-6 w-1 rounded-full bg-white shadow-[0_0_10px_#FFF]" />
            <div>
              <h3 className="font-display text-xl font-black tracking-tight text-white">Official Trailer</h3>
              <p className="text-[10px] text-white/50 font-bold tracking-widest uppercase mt-0.5">4K Preview</p>
            </div>
          </div>
          <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-white/15 bg-[#000000] shadow-[0_25px_60px_rgba(0,0,0,0.9)]">
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
        <div className="mt-16">
          <MovieRow
            title="Recommended Masterpieces"
            subtitle="Titles You Might Enjoy"
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