"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Star, Calendar, Clock } from "lucide-react";
import { ImageService } from "../../lib/ImageService";

export interface EpisodeData {
  episode_number: number;
  name: string;
  overview?: string;
  still_path?: string | null;
  air_date?: string;
  runtime?: number | null;
  vote_average?: number;
  vote_count?: number;
}

interface EpisodeCardProps {
  episode: EpisodeData;
  isActive?: boolean;
  onClick?: () => void;
  href?: string;
  fallbackBackdrop?: string | null;
  defaultRuntime?: number;
  seasonNumber?: number;
  compact?: boolean;
}

function formatAirDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

function formatRuntime(minutes?: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${m}m`;
}

export default function EpisodeCard({
  episode,
  isActive = false,
  onClick,
  href,
  fallbackBackdrop,
  defaultRuntime = 0,
  seasonNumber = 1,
  compact = false
}: EpisodeCardProps) {
  const [imgError, setImgError] = useState(false);

  // Still Image Resolution
  const rawStill = episode.still_path
    ? `https://image.tmdb.org/t/p/w500${episode.still_path}`
    : fallbackBackdrop
    ? ImageService.getBackdrop(fallbackBackdrop, "w780", episode.name)
    : ImageService.FallbackImage("backdrop", episode.name || `Episode ${episode.episode_number}`);

  const stillUrl = imgError
    ? fallbackBackdrop
      ? ImageService.getBackdrop(fallbackBackdrop, "w780", episode.name)
      : ImageService.FallbackImage("backdrop", episode.name || `Episode ${episode.episode_number}`)
    : rawStill;

  // Rating Display: only show if a valid TMDB rating exists
  const hasRating = typeof episode.vote_average === "number" && episode.vote_average > 0;
  const formattedRating = hasRating ? Number(episode.vote_average).toFixed(1) : null;

  // Metadata strings
  const formattedDate = formatAirDate(episode.air_date);
  const rawRuntime = (episode.runtime && episode.runtime > 0)
    ? episode.runtime
    : (defaultRuntime && defaultRuntime > 0 ? defaultRuntime : null);
  const formattedRuntime = formatRuntime(rawRuntime);

  // Title formatting: if real title exists (e.g. "Reaper Discussions"), format as "Episode 3 • Reaper Discussions"
  const rawName = (episode.name || "").trim();
  const isGenericTitle = !rawName || rawName.toLowerCase() === `episode ${episode.episode_number}`;
  const displayTitle = isGenericTitle
    ? `Episode ${episode.episode_number}`
    : rawName.toLowerCase().startsWith(`episode ${episode.episode_number}`)
    ? rawName
    : `Episode ${episode.episode_number} • ${rawName}`;

  const overviewText = episode.overview && episode.overview.trim().length > 0
    ? episode.overview
    : `Episode ${episode.episode_number} of Season ${seasonNumber}.`;

  const cardContent = compact ? (
    // Compact drawer layout
    <>
      <div className="relative w-28 aspect-video shrink-0 rounded-lg overflow-hidden bg-[#070b12] border border-white/[0.08]">
        <Image
          src={stillUrl}
          alt={episode.name || `Episode ${episode.episode_number}`}
          fill
          sizes="112px"
          onError={() => setImgError(true)}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-1 left-1 z-10 px-1.5 py-0.2 rounded bg-black/85 border border-white/10 text-white font-mono font-bold text-[10px] tracking-wider">
          E{episode.episode_number}
        </div>
        <div
          className={`absolute inset-0 z-10 flex items-center justify-center transition-all duration-200 ${
            isActive
              ? "opacity-100 bg-black/30"
              : "opacity-0 group-hover:opacity-100 bg-black/40"
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-white/25 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-lg">
            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h4
            className={`text-xs font-bold truncate transition-colors ${
              isActive
                ? "text-[#0091ff]"
                : "text-white group-hover:text-purple-400"
            }`}
          >
            {displayTitle}
          </h4>
          {formattedRating && (
            <div className="flex items-center gap-1 text-amber-400 font-bold text-[11px] shrink-0">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{formattedRating}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#8ea2b8] mb-1">
          {formattedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#8ea2b8]" />
              {formattedDate}
            </span>
          )}
          {formattedRuntime && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#8ea2b8]" />
              {formattedRuntime}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 leading-snug line-clamp-1">
          {overviewText}
        </p>
      </div>
    </>
  ) : (
    // Full card layout matching the reference mockup
    <>
      {/* 1. Episode Thumbnail (Left Column) */}
      <div className="relative w-full sm:w-52 md:w-60 aspect-video shrink-0 rounded-xl overflow-hidden bg-[#070b12] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
        <Image
          src={stillUrl}
          alt={episode.name || `Episode ${episode.episode_number}`}
          fill
          sizes="(max-width: 640px) 100vw, 240px"
          onError={() => setImgError(true)}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Bottom subtle shadow vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none" />

        {/* E{number} Badge at Bottom-Left */}
        <div className="absolute bottom-2.5 left-2.5 z-10 px-2 py-0.5 rounded bg-black/85 backdrop-blur-sm border border-white/10 text-white font-mono font-bold text-[11px] tracking-wider shadow-md">
          E{episode.episode_number}
        </div>

        {/* Centered Play Button (Visible on hover and when active) */}
        <div
          className={`absolute inset-0 z-10 flex items-center justify-center transition-all duration-200 ${
            isActive
              ? "opacity-100 bg-black/30"
              : "opacity-0 group-hover:opacity-100 bg-black/40 backdrop-blur-[1px]"
          }`}
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-200 group-hover:scale-110 ${
              isActive
                ? "bg-white/25 backdrop-blur-md border border-white/30 text-white shadow-[0_0_16px_rgba(0,145,255,0.4)]"
                : "bg-white/25 backdrop-blur-md border border-white/30 text-white"
            }`}
          >
            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* 2. Episode Details (Right Column) */}
      <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5 sm:py-1">
        {/* Top Header Row: Episode Title + Gold Star Rating */}
        <div className="flex items-start sm:items-center justify-between gap-3 mb-1.5">
          <h4
            className={`text-base sm:text-lg font-bold font-display tracking-tight truncate transition-colors duration-150 ${
              isActive
                ? "text-[#0091ff] sm:text-white"
                : "text-white group-hover:text-purple-400"
            }`}
          >
            {displayTitle}
          </h4>

          {/* Rating Badge */}
          {formattedRating && (
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs sm:text-sm shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{formattedRating}</span>
            </div>
          )}
        </div>

        {/* Metadata Row: Air Date + Runtime */}
        <div className="flex flex-wrap items-center gap-3.5 sm:gap-4 text-xs font-sans text-[#8ea2b8] mb-2">
          {formattedDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#8ea2b8]" />
              <span>{formattedDate}</span>
            </div>
          )}
          {formattedRuntime && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#8ea2b8]" />
              <span>{formattedRuntime}</span>
            </div>
          )}
        </div>

        {/* Synopsis / Overview (2-3 lines clamped) */}
        <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed font-sans line-clamp-2 sm:line-clamp-3">
          {overviewText}
        </p>
      </div>
    </>
  );

  const containerClasses = compact
    ? `w-full text-left rounded-xl p-2.5 transition-all duration-200 flex items-center gap-3 group cursor-pointer active:scale-[0.99] ${
        isActive
          ? "bg-[#0B1523]/95 border-2 border-[#0091ff] shadow-[0_0_18px_rgba(0,145,255,0.25)]"
          : "bg-[#080d1a]/80 hover:bg-[#0f172a]/90 backdrop-blur-xl border border-white/[0.06] hover:border-white/[0.18]"
      }`
    : `w-full text-left rounded-2xl p-3.5 sm:p-4 transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 group cursor-pointer active:scale-[0.995] ${
        isActive
          ? "bg-[#060b13]/95 border-2 border-[#0091ff] shadow-[0_0_24px_rgba(0,145,255,0.22)]"
          : "bg-[#060913]/90 hover:bg-[#0a0f1d]/90 backdrop-blur-xl border border-white/[0.06] hover:border-white/[0.18] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04),0_8px_24px_rgba(0,0,0,0.5)]"
      }`;

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={containerClasses}>
        {cardContent}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={containerClasses}>
      {cardContent}
    </button>
  );
}
