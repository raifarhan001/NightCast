"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Star, Flame, Sparkles, TrendingUp, Film, X, Loader2 } from "lucide-react";
import { MediaItem, apiFetch } from "../../lib/api";
import { ImageService } from "../../lib/ImageService";
import { soundFx } from "../../lib/soundEffects";
import { useAmbientStore } from "../../store/ambientStore";

interface BentoShowcaseProps {
  items: MediaItem[];
}

export default function BentoShowcase({ items = [] }: BentoShowcaseProps) {
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isTrailerLoading, setIsTrailerLoading] = useState(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);

  if (!items || items.length < 3) return null;

  const primary = items[0];
  const second = items[1];
  const third = items[2];
  const fourth = items[3] || items[0];

  const primaryType = primary.media_type || (primary.first_air_date ? "tv" : "movie");
  const secondType = second.media_type || (second.first_air_date ? "tv" : "movie");
  const thirdType = third.media_type || (third.first_air_date ? "tv" : "movie");
  const fourthType = fourth.media_type || (fourth.first_air_date ? "tv" : "movie");

  const primaryTitle = primary.title || primary.name || "Featured Title";
  const secondTitle = second.title || second.name || "Spotlight";
  const thirdTitle = third.title || third.name || "Trending";
  const fourthTitle = fourth.title || fourth.name || "Must Watch";

  const primaryImg = ImageService.getBackdrop(primary.backdrop_path, "original", primaryTitle);
  const secondImg = ImageService.getBackdrop(second.backdrop_path, "w780", secondTitle);
  const thirdImg = ImageService.getBackdrop(third.backdrop_path, "w780", thirdTitle);
  const fourthImg = ImageService.getBackdrop(fourth.backdrop_path, "w780", fourthTitle);

  const handleOpenTrailer = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    soundFx.playChime();
    setIsTrailerModalOpen(true);
    if (trailerKey) return;

    setIsTrailerLoading(true);
    try {
      const data = await apiFetch(`/api/tmdb/${primaryType}/${primary.id}`);
      const trailer = data?.videos?.results?.find(
        (v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
      );
      if (trailer?.key) {
        setTrailerKey(trailer.key);
      } else {
        const anyYt = data?.videos?.results?.find((v: any) => v.site === "YouTube");
        if (anyYt?.key) setTrailerKey(anyYt.key);
      }
    } catch {
      // Fallback
    } finally {
      setIsTrailerLoading(false);
    }
  };

  return (
    <section className="w-full px-4 sm:px-8 md:px-14 py-8 select-none relative">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-[#39AEA9]/20 border border-[#39AEA9]/40 text-[#A2D5AB] shadow-[0_0_12px_rgba(57,174,169,0.3)]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-display font-bold text-white tracking-tight flex items-center gap-2">
              <span>Curator&apos;s VIP Spotlight</span>
              <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB] text-[#0A0F11] shadow-sm">
                4K HDR
              </span>
            </h3>
            <p className="text-xs text-[#8FA8AD] font-sans">Personal cinema vault • Highest rated master titles</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-sans text-[#8FA8AD]">
          <span className="w-2 h-2 rounded-full bg-[#A2D5AB] animate-ping" />
          <span className="text-[#A2D5AB] font-medium">Dolby Vision &amp; Atmos Ready</span>
        </div>
      </div>

      {/* Bento Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* 1. Master Spotlight Card (Span 7 cols) */}
        <div
          onMouseEnter={() => useAmbientStore.getState().setActiveBackdrop(primary.backdrop_path, primaryTitle)}
          onMouseLeave={() => useAmbientStore.getState().clearActiveBackdrop(400)}
          className="lg:col-span-7 relative h-[400px] sm:h-[480px] rounded-3xl overflow-hidden group bg-[#121A1D] border border-white/[0.1] hover:border-[#39AEA9]/60 shadow-[0_20px_50px_rgba(0,0,0,0.9)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(57,174,169,0.25)] transition-all duration-500"
        >
          {/* Ambient Glow behind Card on Hover */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#39AEA9]/20 via-[#5B8FB9]/10 to-[#A2D5AB]/20 rounded-[32px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none -z-10" />

          <Image
            src={primaryImg}
            alt={primaryTitle}
            fill
            className="object-cover object-center group-hover:scale-105 transition-transform duration-700 brightness-[0.82]"
            priority
          />
          {/* Cinema Vignette Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F11] via-[#0A0F11]/45 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0F11]/95 via-[#0A0F11]/40 to-transparent" />

          {/* Top VIP Hardware Badges */}
          <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/[0.15] text-[11px] font-bold text-[#E5EFC1] flex items-center gap-1.5 shadow-lg">
              <Flame className="w-3.5 h-3.5 text-[#E11D48] fill-current animate-pulse" />
              #1 Master Selection
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[#39AEA9]/25 backdrop-blur-md border border-[#39AEA9]/50 text-[10px] font-bold text-[#A2D5AB] shadow-sm">
              IMAX ENHANCED
            </span>
            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/[0.12] text-[10px] font-bold text-white/90">
              DOLBY VISION
            </span>
          </div>

          {/* Master Card Bottom Content */}
          <div className="absolute bottom-6 left-6 right-6 z-20 space-y-3.5">
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#CBD5E1]">
              <div className="flex items-center gap-1 text-[#A2D5AB] font-bold">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{primary.vote_average ? primary.vote_average.toFixed(1) : "8.7"}</span>
              </div>
              <span>•</span>
              <span className="capitalize">{primaryType === "tv" ? "TV Series" : "Movie"}</span>
              <span>•</span>
              <span>{(primary.release_date || primary.first_air_date || "2024").slice(0, 4)}</span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-semibold backdrop-blur-md border border-white/10">
                Dolby Atmos 7.1
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-white tracking-tight drop-shadow-lg">
              {primaryTitle}
            </h2>

            {primary.overview && (
              <p className="text-xs sm:text-sm text-[#CBD5E1]/90 font-sans line-clamp-2 max-w-xl leading-relaxed drop-shadow">
                {primary.overview}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href={`/watch/${primaryType}/${primary.id}`}
                onClick={() => soundFx.playTap()}
                onMouseEnter={() => soundFx.playHover()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB] hover:opacity-95 text-[#0A0F11] font-sans font-bold text-xs flex items-center gap-2 shadow-[0_0_24px_rgba(57,174,169,0.55)] transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Stream in 4K</span>
              </Link>

              <button
                type="button"
                onClick={handleOpenTrailer}
                onMouseEnter={() => soundFx.playHover()}
                className="px-4 py-2.5 rounded-xl bg-white/[0.1] hover:bg-white/[0.18] text-white border border-white/[0.15] font-sans font-semibold text-xs flex items-center gap-2 backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <Film className="w-3.5 h-3.5 text-[#A2D5AB]" />
                <span>Watch Trailer</span>
              </button>

              <Link
                href={`/${primaryType}/${primary.id}`}
                onClick={() => soundFx.playTap()}
                onMouseEnter={() => soundFx.playHover()}
                className="px-4 py-2.5 rounded-xl bg-black/40 hover:bg-black/60 text-[#CBD5E1] hover:text-white border border-white/[0.08] font-sans font-medium text-xs transition-all active:scale-95 cursor-pointer backdrop-blur-md"
              >
                Details
              </Link>
            </div>
          </div>
        </div>

        {/* 2. Right Column (Span 5 cols): 3 Real Blockbuster Titles */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4 sm:gap-5">
          {/* Top Landscape Blockbuster (Item 2) */}
          <Link
            href={`/watch/${secondType}/${second.id}`}
            onClick={() => soundFx.playTap()}
            onMouseEnter={() => {
              soundFx.playHover();
              useAmbientStore.getState().setActiveBackdrop(second.backdrop_path, secondTitle);
            }}
            onMouseLeave={() => useAmbientStore.getState().clearActiveBackdrop(400)}
            className="group relative h-[190px] sm:h-[228px] rounded-3xl overflow-hidden bg-[#121A1D] border border-white/[0.08] hover:border-[#39AEA9]/60 hover:shadow-[0_15px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(57,174,169,0.25)] transition-all duration-300 block cursor-pointer"
          >
            <Image
              src={secondImg}
              alt={secondTitle}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700 brightness-[0.78]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F11] via-[#0A0F11]/35 to-transparent" />

            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/[0.1] text-[10px] font-bold text-[#A2D5AB] flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Featured Premiere
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#39AEA9]/20 border border-[#39AEA9]/40 text-[9px] font-bold text-[#A2D5AB]">
                4K
              </span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 z-10 space-y-1">
              <div className="flex items-center gap-2 text-[11px] text-[#A2D5AB]">
                <Star className="w-3 h-3 fill-current" />
                <span className="font-bold">{second.vote_average ? second.vote_average.toFixed(1) : "8.3"}</span>
                <span className="text-white/40">•</span>
                <span className="text-white/70 capitalize">{secondType}</span>
                <span className="text-white/40">•</span>
                <span className="text-[#8FA8AD]">{(second.release_date || second.first_air_date || "").slice(0, 4)}</span>
              </div>
              <h4 className="text-lg font-display font-bold text-white truncate group-hover:text-[#A2D5AB] transition-colors">
                {secondTitle}
              </h4>
            </div>
          </Link>

          {/* Bottom Row: 2 Pure Cinematic Cards (Item 3 & Item 4) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Third Title Card */}
            <Link
              href={`/watch/${thirdType}/${third.id}`}
              onClick={() => soundFx.playTap()}
              onMouseEnter={() => {
                soundFx.playHover();
                useAmbientStore.getState().setActiveBackdrop(third.backdrop_path, thirdTitle);
              }}
              onMouseLeave={() => useAmbientStore.getState().clearActiveBackdrop(400)}
              className="group relative h-[190px] sm:h-[228px] rounded-3xl overflow-hidden bg-[#121A1D] border border-white/[0.08] hover:border-[#39AEA9]/60 hover:shadow-[0_15px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(57,174,169,0.25)] transition-all duration-300 block cursor-pointer"
            >
              <Image
                src={thirdImg}
                alt={thirdTitle}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700 brightness-[0.78]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F11] via-[#0A0F11]/35 to-transparent" />

              <div className="absolute top-3 left-3 z-10">
                <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/[0.1] text-[9px] font-bold text-[#E5EFC1]">
                  Top Rated
                </span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 z-10 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#A2D5AB] font-semibold">
                  <Star className="w-3 h-3 fill-current" />
                  <span>{third.vote_average ? third.vote_average.toFixed(1) : "8.1"}</span>
                  <span className="text-white/40">•</span>
                  <span className="text-white/70 capitalize">{thirdType}</span>
                </div>
                <h4 className="text-sm font-display font-bold text-white truncate group-hover:text-[#A2D5AB] transition-colors">
                  {thirdTitle}
                </h4>
              </div>
            </Link>

            {/* Fourth Title Card (Replaced the fake live user counter!) */}
            <Link
              href={`/watch/${fourthType}/${fourth.id}`}
              onClick={() => soundFx.playTap()}
              onMouseEnter={() => {
                soundFx.playHover();
                useAmbientStore.getState().setActiveBackdrop(fourth.backdrop_path, fourthTitle);
              }}
              onMouseLeave={() => useAmbientStore.getState().clearActiveBackdrop(400)}
              className="group relative h-[190px] sm:h-[228px] rounded-3xl overflow-hidden bg-[#121A1D] border border-white/[0.08] hover:border-[#39AEA9]/60 hover:shadow-[0_15px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(57,174,169,0.25)] transition-all duration-300 block cursor-pointer"
            >
              <Image
                src={fourthImg}
                alt={fourthTitle}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700 brightness-[0.78]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F11] via-[#0A0F11]/35 to-transparent" />

              <div className="absolute top-3 left-3 z-10">
                <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/[0.1] text-[9px] font-bold text-[#A2D5AB]">
                  Must Stream
                </span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 z-10 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#A2D5AB] font-semibold">
                  <Star className="w-3 h-3 fill-current" />
                  <span>{fourth.vote_average ? fourth.vote_average.toFixed(1) : "8.0"}</span>
                  <span className="text-white/40">•</span>
                  <span className="text-white/70 capitalize">{fourthType}</span>
                </div>
                <h4 className="text-sm font-display font-bold text-white truncate group-hover:text-[#A2D5AB] transition-colors">
                  {fourthTitle}
                </h4>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Instant In-Page Cinema Trailer Preview Modal */}
      {isTrailerModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 sm:p-8 animate-in fade-in duration-300">
          <div
            className="fixed inset-0 cursor-pointer"
            onClick={() => setIsTrailerModalOpen(false)}
          />
          <div className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden border border-[#39AEA9]/40 bg-black shadow-[0_0_80px_rgba(57,174,169,0.35)] z-10 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsTrailerModalOpen(false)}
              className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all cursor-pointer"
              title="Close Trailer [Esc]"
            >
              <X className="w-4 h-4" />
            </button>
            {isTrailerLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white">
                <Loader2 className="w-8 h-8 animate-spin text-[#39AEA9]" />
                <p className="text-xs font-sans text-[#8FA8AD]">Loading Trailer Stream...</p>
              </div>
            ) : trailerKey ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`${primaryTitle} Trailer`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/70 text-sm font-sans">
                No official trailer found for this title.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
