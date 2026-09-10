"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Star, Plus, Check, ThumbsUp, ChevronDown, X, Sparkles } from "lucide-react";
import { ImageService } from "../../lib/ImageService";
import { soundFx } from "../../lib/soundEffects";
import { useAmbientStore } from "../../store/ambientStore";
import PlatformBadge from "./PlatformBadge";

export const TMDB_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  23: "History",
  24: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romantic",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

interface MovieCardProps {
  item: {
    id: string | number;
    title?: string;
    name?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    vote_average?: number;
    media_type?: string;
    release_date?: string;
    first_air_date?: string;
    overview?: string;
    season?: number;
    episode?: number;
    progress_percent?: number;
    timestamp_seconds?: number;
    duration_seconds?: number;
    runtime?: number;
    genre_ids?: number[];
    genres?: Array<{ id?: number; name?: string } | string>;
    adult?: boolean;
  };
  subtitle?: string;
  isFirst?: boolean;
  isLast?: boolean;
  onRemove?: () => void;
}

function MovieCard({ item, subtitle, isFirst, isLast, onRemove }: MovieCardProps) {
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const type = item.media_type || (item.first_air_date ? "tv" : "movie");
  const title = item.title || item.name || "Untitled";

  const releaseYear = (item.release_date || item.first_air_date || "").slice(0, 4);

  const imageUrl = item.backdrop_path
    ? ImageService.getBackdrop(item.backdrop_path, "w780", title)
    : item.poster_path
    ? ImageService.getPoster(item.poster_path, "w500", title)
    : null;

  const progress = Number(item.progress_percent ?? 0);
  const displayPercent = Math.max(1, Math.min(99, Math.round(progress)));

  const defaultSubtitle = progress > 0
    ? (item.season ? `S${item.season} E${item.episode || 1} • ${displayPercent}% completed` : `${displayPercent}% completed`)
    : item.season
    ? `Season ${item.season}, Episode ${item.episode || 1}`
    : subtitle || (type === "tv" ? "TV Series" : "Movie");

  // Dynamic Match percentage (e.g. 96% match like Netflix reference)
  const matchScore = useMemo(() => {
    if (item.vote_average && item.vote_average > 0) {
      return Math.min(99, Math.max(76, Math.round(70 + (item.vote_average / 10) * 28)));
    }
    const numId = typeof item.id === 'number' ? item.id : parseInt(String(item.id).replace(/\D/g, "") || "85", 10);
    return 88 + (numId % 11);
  }, [item.vote_average, item.id]);

  // Duration or Seasons string
  const durationText = useMemo(() => {
    if (item.duration_seconds && item.duration_seconds > 0) {
      const mins = Math.round(item.duration_seconds / 60);
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return hrs > 0 ? `${hrs}h ${remMins}m` : `${mins}m`;
    }
    if (item.runtime && item.runtime > 0) {
      const hrs = Math.floor(item.runtime / 60);
      const remMins = item.runtime % 60;
      return hrs > 0 ? `${hrs}h ${remMins}m` : `${item.runtime}m`;
    }
    if (type === "tv") {
      return item.season ? (item.season > 1 ? `${item.season} Seasons` : "1 Season") : "1 Season";
    }
    const numId = typeof item.id === 'number' ? item.id : parseInt(String(item.id).replace(/\D/g, "") || "110", 10);
    const hrs = 1 + (numId % 2);
    const mins = 12 + ((numId * 7) % 43);
    return `${hrs}h ${mins}m`;
  }, [item.duration_seconds, item.runtime, item.season, item.id, type]);

  // Dot-separated genres list (up to 3)
  const genresList: string[] = useMemo(() => {
    if (Array.isArray(item.genres) && item.genres.length > 0) {
      const parsed = item.genres
        .map((g: any) => (typeof g === "string" ? g : g?.name))
        .filter(Boolean)
        .slice(0, 3);
      if (parsed.length > 0) return parsed;
    }
    if (Array.isArray(item.genre_ids) && item.genre_ids.length > 0) {
      const mapped = item.genre_ids
        .map((id) => TMDB_GENRES[id])
        .filter(Boolean)
        .slice(0, 3);
      if (mapped.length > 0) return mapped;
    }
    const fallbackSets = [
      ["Action", "Sci-Fi", "Adventure"],
      ["Drama", "Thriller", "Mystery"],
      ["Comedy", "Romantic", "Drama"],
      ["Crime", "Action", "Drama"],
      ["Animation", "Family", "Comedy"]
    ];
    const numId = typeof item.id === "number" ? item.id : parseInt(String(item.id).replace(/\D/g, "") || "0", 10);
    return fallbackSets[numId % fallbackSets.length];
  }, [item.genres, item.genre_ids, item.id]);

  const ageRating = useMemo(() => {
    if (item.adult) return "18+";
    const numId = typeof item.id === 'number' ? item.id : parseInt(String(item.id).replace(/\D/g, "") || "16", 10);
    const ratings = ["U/A 13+", "U/A 16+", "U/A 16+", "U/A 13+", "16+"];
    return ratings[numId % ratings.length];
  }, [item.adult, item.id]);

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    soundFx.playTap();
    setAdded(!added);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    soundFx.playTap();
    setLiked(!liked);
  };

  const handleMouseEnter = () => {
    soundFx.playHover();
    const backdrop = item.backdrop_path || item.poster_path;
    if (backdrop) {
      useAmbientStore.getState().setActiveBackdrop(backdrop, title);
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      if (rect.left < 90 || isFirst) {
        setAlign("left");
      } else if (windowWidth - rect.right < 90 || isLast) {
        setAlign("right");
      } else {
        setAlign("center");
      }
    } else if (isFirst) {
      setAlign("left");
    } else if (isLast) {
      setAlign("right");
    } else {
      setAlign("center");
    }

    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 240);
  };

  const handleMouseLeave = () => {
    useAmbientStore.getState().clearActiveBackdrop(400);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setIsHovered(false);
  };

  const watchUrl = `/watch/${type}/${item.id}` + (item.season ? `?season=${item.season}&episode=${item.episode || 1}` : "");
  const detailUrl = `/${type}/${item.id}`;

  const positionClasses = useMemo(() => {
    if (align === "left") {
      return "-top-10 sm:-top-14 left-0 w-[290px] sm:w-[325px] md:w-[345px] origin-top-left";
    }
    if (align === "right") {
      return "-top-10 sm:-top-14 right-0 w-[290px] sm:w-[325px] md:w-[345px] origin-top-right";
    }
    return "-top-10 sm:-top-14 left-1/2 -translate-x-1/2 w-[290px] sm:w-[325px] md:w-[345px] origin-top";
  }, [align]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="w-[220px] sm:w-[250px] md:w-[270px] min-w-[220px] sm:min-w-[250px] md:min-w-[270px] max-w-[220px] sm:max-w-[250px] md:max-w-[270px] shrink-0 select-none snap-start relative"
    >
      {/* Default Base Card */}
      <Link
        href={watchUrl}
        className="group block cursor-pointer transform-gpu will-change-transform"
      >
        <div className="cinema-card-landscape w-full bg-[#121A1D] border border-[#223136] rounded-2xl group-hover:border-[#39AEA9]/70 group-hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.85),0_0_24px_rgba(57,174,169,0.25)] transition-all duration-300 ease-out relative">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 768px) 250px, 270px"
              className="object-cover rounded-2xl transform-gpu will-change-transform transition-transform duration-500 ease-out group-hover:scale-105 opacity-100 brightness-[0.96]"
              loading="lazy"
              placeholder="blur"
              blurDataURL={ImageService.getBlurHash()}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#8FA8AD] text-xs font-mono font-medium p-3 text-center bg-[#121A1D] rounded-2xl">
              {title}
            </div>
          )}

          {/* Dynamic Streaming Platform Tag Top Left */}
          <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none transform-gpu will-change-transform transition-transform duration-200">
            <PlatformBadge item={item} />
          </div>

          {/* Dismiss from Continue Watching Button */}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
              className="absolute top-2.5 right-2.5 z-40 w-7 h-7 rounded-full bg-[#0A0F11]/85 hover:bg-rose-600 text-white/80 hover:text-white border border-white/[0.15] hover:border-rose-400 flex items-center justify-center transition-all shadow-md group-hover:opacity-100 sm:opacity-0 opacity-100 cursor-pointer"
              title="Remove from Continue Watching"
              aria-label="Remove from Continue Watching"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* IMDb Rating Tag Top Right */}
          {rating && !onRemove && (
            <div className="absolute top-2.5 right-2.5 z-20 px-2 py-0.5 rounded-full bg-[#0A0F11]/75 backdrop-blur-xl border border-white/[0.12] text-[10px] font-sans font-semibold text-[#E5EFC1] flex items-center gap-1 shadow-sm">
              <Star className="w-2.5 h-2.5 fill-current text-[#A2D5AB]" />
              <span>{rating}</span>
            </div>
          )}

          {/* Progress Bar (if watched) */}
          {progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#0A0F11] z-30 overflow-hidden rounded-b-2xl">
              <div
                className="h-full bg-gradient-to-r from-[#557B83] via-[#39AEA9] to-[#A2D5AB] shadow-[0_0_10px_rgba(57,174,169,0.9)] transition-all duration-300"
                style={{ width: `${Math.max(2, Math.min(100, displayPercent))}%` }}
              />
            </div>
          )}
        </div>

        {/* Card Title & Subtitle */}
        <div className="w-full min-w-0 pt-2.5 px-1 space-y-0.5 overflow-hidden">
          <h4 className="text-xs sm:text-sm font-sans font-semibold text-[#F8FAFC] truncate block w-full group-hover:text-[#A2D5AB] transition-colors duration-200">
            {title}
          </h4>
          <p className="text-[11px] font-sans text-[#8FA8AD] truncate block w-full">{defaultSubtitle}</p>
        </div>
      </Link>

      {/* Netflix-Style Hover Preview Pop-Up Card */}
      {isHovered && (
        <div
          className={`absolute ${positionClasses} z-50 bg-[#14181B] rounded-2xl shadow-[0_24px_55px_rgba(0,0,0,0.98),0_0_30px_rgba(57,174,169,0.25)] border border-white/[0.15] overflow-hidden transform-gpu will-change-transform animate-in fade-in zoom-in-95 duration-200 pointer-events-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Banner: High-Res Cinema Artwork / Poster */}
          <div className="relative aspect-video w-full bg-[#0A0F11] overflow-hidden group/thumb">
            <Link href={watchUrl} className="block w-full h-full relative cursor-pointer">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  sizes="360px"
                  className="object-cover transition-transform duration-700 group-hover/thumb:scale-105 brightness-[0.98]"
                  placeholder="blur"
                  blurDataURL={ImageService.getBlurHash()}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[#8FA8AD] font-mono">
                  {title}
                </div>
              )}
            </Link>

            {/* Platform Tag Top Left */}
            <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
              <PlatformBadge item={item} />
            </div>

            {/* Dismiss from Continue Watching if applicable */}
            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  soundFx.playTap();
                  onRemove();
                }}
                className="absolute top-2.5 right-2.5 z-30 w-7 h-7 rounded-full bg-[#0A0F11]/85 hover:bg-rose-600 text-white/80 hover:text-white border border-white/[0.15] flex items-center justify-center transition-all shadow-md cursor-pointer"
                title="Remove from Continue Watching"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Progress bar on popup image */}
            {progress > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0A0F11]/90 z-20">
                <div
                  className="h-full bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB]"
                  style={{ width: `${Math.max(2, Math.min(100, displayPercent))}%` }}
                />
              </div>
            )}
          </div>

          {/* Details Section (Exact Layout matching Reference Image) */}
          <div className="p-3.5 sm:p-4 space-y-2.5 bg-[#14181B]">
            {/* Row 1: Action Controls */}
            <div className="flex items-center gap-2">
              {/* Primary White Play Button with Black Triangle */}
              <Link
                href={watchUrl}
                onClick={() => soundFx.playTap()}
                className="w-9 h-9 rounded-full bg-white hover:bg-white/90 text-black flex items-center justify-center shadow-md transform active:scale-95 transition-all cursor-pointer shrink-0"
                title="Play Now"
              >
                <Play className="w-4 h-4 fill-current text-black ml-0.5" />
              </Link>

              {/* Add to Watchlist Button */}
              <button
                type="button"
                onClick={handleWatchlistClick}
                className="w-9 h-9 rounded-full border border-white/40 hover:border-white text-white flex items-center justify-center transform active:scale-95 transition-all cursor-pointer shrink-0 hover:bg-white/[0.08]"
                title={added ? "In Watchlist" : "Add to Watchlist"}
              >
                {added ? <Check className="w-4 h-4 text-[#A2D5AB]" /> : <Plus className="w-4 h-4 text-white" />}
              </button>

              {/* Like / ThumbsUp Button */}
              <button
                type="button"
                onClick={handleLikeClick}
                className="w-9 h-9 rounded-full border border-white/40 hover:border-white text-white flex items-center justify-center transform active:scale-95 transition-all cursor-pointer shrink-0 hover:bg-white/[0.08]"
                title="Like"
              >
                <ThumbsUp className={`w-4 h-4 ${liked ? "text-[#39AEA9] fill-current" : "text-white"}`} />
              </button>

              {/* Chevron Down Button (Right Aligned - More Info) */}
              <Link
                href={detailUrl}
                onClick={() => soundFx.playTap()}
                className="w-9 h-9 rounded-full border border-white/40 hover:border-white text-white flex items-center justify-center ml-auto transform active:scale-95 transition-all cursor-pointer shrink-0 hover:bg-white/[0.08]"
                title="More info"
              >
                <ChevronDown className="w-4 h-4 text-white" />
              </Link>
            </div>

            {/* Row 2: Match %, Age Rating, Duration, Quality Badge, Audio */}
            <div className="flex items-center gap-2 flex-wrap text-xs font-sans">
              <span className="text-[#46d369] font-bold text-xs">
                {matchScore}% match
              </span>
              <span className="border border-white/35 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white/90">
                {ageRating}
              </span>
              <span className="text-[#CBD5E1] font-medium text-[11px]">
                {durationText}
              </span>
              <span className="border border-[#39AEA9]/50 text-[#A2D5AB] px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider">
                4K UHD
              </span>
              <span className="border border-white/30 text-[#8FA8AD] px-1.5 py-0.5 rounded text-[9px] font-medium">
                Dual Audio
              </span>
            </div>

            {/* Row 3: Genres (Dot-separated) */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs text-white/90 font-sans font-medium pt-0.5">
              {genresList.map((g, idx) => (
                <React.Fragment key={g}>
                  <span>{g}</span>
                  {idx < genresList.length - 1 && (
                    <span className="text-white/40">•</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(MovieCard);