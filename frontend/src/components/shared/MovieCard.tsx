"use client";

import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Plus, Check, ThumbsUp, ChevronDown, X } from "lucide-react";
import { ImageService } from "../../lib/ImageService";
import { soundFx } from "../../lib/soundEffects";
import { useAmbientStore } from "../../store/ambientStore";
import { useUserStore } from "../../store/userStore";
import { apiFetch } from "../../lib/api";
import { triggerToast } from "../common/ToastNotification";
import { getCleanMediaId } from "../../lib/progress";
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
    content_rating?: string;
  };
  subtitle?: string;
  isFirst?: boolean;
  isLast?: boolean;
  onRemove?: () => void;
}

function MovieCard({ item, subtitle, isFirst, isLast, onRemove }: MovieCardProps) {
  const [added, setAdded] = useState<boolean>(() => {
    if (typeof window !== "undefined" && item.id) {
      try {
        const stored = localStorage.getItem("nightcast_watchlist");
        if (stored) {
          const map = JSON.parse(stored);
          const val = map[String(item.id)];
          if (val) return true;
        }
      } catch {}
    }
    return false;
  });

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string | number; added: boolean }>;
      if (customEvent.detail && String(customEvent.detail.id) === String(item.id)) {
        setAdded(customEvent.detail.added);
      }
    };
    window.addEventListener("nightcast:watchlist-update", handleSync);
    return () => window.removeEventListener("nightcast:watchlist-update", handleSync);
  }, [item.id]);

  const [liked, setLiked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  const [openDownward, setOpenDownward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const type = item.media_type || (item.first_air_date ? "tv" : "movie");
  const title = item.title || item.name || "Untitled";

  const [imgError, setImgError] = useState(false);

  const rawImageUrl = item.backdrop_path
    ? ImageService.getBackdrop(item.backdrop_path, "w780", title)
    : item.poster_path
    ? ImageService.getPoster(item.poster_path, "w500", title)
    : null;

  const imageUrl = imgError ? ImageService.FallbackImage('backdrop', title) : rawImageUrl;

  const progress = Number(item.progress_percent ?? 0);
  const displayPercent = Math.max(1, Math.min(99, Math.round(progress)));

  const defaultSubtitle = progress > 0
    ? (item.season ? `S${item.season} E${item.episode || 1} • ${displayPercent}% completed` : `${displayPercent}% completed`)
    : item.season
    ? `Season ${item.season}, Episode ${item.episode || 1}`
    : subtitle || (type === "tv" ? "TV Series" : "Movie");

  // Dynamic Match percentage based on genuine TMDB vote average
  const matchScore = useMemo(() => {
    if (item.vote_average && item.vote_average > 0) {
      return Math.min(99, Math.max(50, Math.round((item.vote_average / 10) * 100)));
    }
    return null;
  }, [item.vote_average]);

  // Genuine duration or seasons string
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
    if (type === "tv" && item.season) {
      return item.season > 1 ? `${item.season} Seasons` : "1 Season";
    }
    return null;
  }, [item.duration_seconds, item.runtime, item.season, type]);

  // Genuine dot-separated genres list (up to 3)
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
    return [];
  }, [item.genres, item.genre_ids]);

  const ageRating = useMemo(() => {
    if (item.adult) return "18+";
    if (item.content_rating) return item.content_rating;
    return null;
  }, [item.adult, item.content_rating]);

  const handleWatchlistClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    soundFx.playTap();

    const nextState = !added;
    setAdded(nextState);

    // 1. Update localStorage nightcast_watchlist
    try {
      const stored = localStorage.getItem("nightcast_watchlist");
      const map = stored ? JSON.parse(stored) : {};
      const cleanId = String(item.id);

      if (nextState) {
        map[cleanId] = {
          id: item.id,
          media_id: cleanId,
          title: title,
          poster_path: item.poster_path || null,
          backdrop_path: item.backdrop_path || null,
          media_type: type,
          vote_average: item.vote_average || 0,
          release_date: item.release_date || item.first_air_date,
        };
      } else {
        delete map[cleanId];
      }
      localStorage.setItem("nightcast_watchlist", JSON.stringify(map));
    } catch (err) {
      console.error("Failed to update local watchlist:", err);
    }

    // 2. Call backend /api/user/favorites if logged in
    const activeProfile = useUserStore.getState().activeProfile;
    if (activeProfile && item.id) {
      const cleanId = String(item.id);
      if (nextState) {
        apiFetch("/api/user/favorites", {
          method: "POST",
          headers: { "X-Profile-ID": activeProfile.id },
          body: JSON.stringify({
            media_id: cleanId,
            media_type: type,
            title: title,
            poster_path: item.poster_path || "",
          }),
        }).catch((err) => console.error("Failed to save backend favorite:", err));
      } else {
        apiFetch(`/api/user/favorites/${cleanId}`, {
          method: "DELETE",
          headers: { "X-Profile-ID": activeProfile.id },
        }).catch((err) => console.error("Failed to delete backend favorite:", err));
      }
    }

    // 3. Dispatch real-time custom event for all cards and pages
    window.dispatchEvent(
      new CustomEvent("nightcast:watchlist-update", {
        detail: { id: item.id, added: nextState },
      })
    );

    // 4. Trigger visual feedback toast
    triggerToast(nextState ? `Added "${title}" to Watchlist` : `Removed "${title}" from Watchlist`, "success");
  }, [added, item, title, type]);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    soundFx.playTap();
    setLiked(!liked);
  };

  const handleMouseEnter = () => {
    soundFx.playHover();
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      const backdrop = item.backdrop_path || item.poster_path;
      if (backdrop) {
        useAmbientStore.getState().setActiveBackdrop(backdrop, title);
      }
      setIsHovered(true);
    }, 280);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      setOpenDownward(rect.top < 120);
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
  };

  const handleMouseLeave = () => {
    useAmbientStore.getState().clearActiveBackdrop(400);
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setIsHovered(false);
  };

  const cleanId = useMemo(() => getCleanMediaId(item.id), [item.id]);

  const watchUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (item.season) params.set("season", item.season.toString());
    if (item.episode) params.set("episode", (item.episode || 1).toString());
    if (item.timestamp_seconds && Number(item.timestamp_seconds) > 3) {
      params.set("time", Math.floor(Number(item.timestamp_seconds)).toString());
    }
    const qs = params.toString();
    return `/watch/${type}/${cleanId}${qs ? `?${qs}` : ""}`;
  }, [type, cleanId, item.season, item.episode, item.timestamp_seconds]);
  const detailUrl = `/${type}/${cleanId}`;

  const positionClasses = useMemo(() => {
    const vOffset = openDownward ? "top-2 sm:top-4" : "-top-10 sm:-top-12";
    if (align === "left") {
      return `${vOffset} left-0 w-[280px] sm:w-[310px] md:w-[330px] origin-top-left`;
    }
    if (align === "right") {
      return `${vOffset} right-0 w-[280px] sm:w-[310px] md:w-[330px] origin-top-right`;
    }
    return `${vOffset} left-1/2 -translate-x-1/2 w-[280px] sm:w-[310px] md:w-[330px] origin-top`;
  }, [align, openDownward]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`w-[220px] sm:w-[250px] md:w-[270px] min-w-[220px] sm:min-w-[250px] md:min-w-[270px] max-w-[220px] sm:max-w-[250px] md:max-w-[270px] shrink-0 select-none snap-start relative ${
        isHovered ? "z-50" : "z-10"
      }`}
    >
      {/* Default Base Card */}
      <Link
        href={watchUrl}
        aria-label={`Watch ${title}`}
        className="group block cursor-pointer transform-gpu rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B131B]"
      >
        <div className="cinema-card-landscape w-full bg-white/[0.04] backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.6)] group-hover:border-white/[0.28] group-hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_16px_40px_rgba(0,0,0,0.85),0_0_24px_rgba(57,174,169,0.2)] transition-all duration-300 ease-out relative">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`${title} poster`}
              fill
              sizes="(max-width: 768px) 250px, 270px"
              className="object-cover rounded-2xl transform-gpu will-change-transform transition-transform duration-300 ease-out group-hover:scale-105 opacity-100 brightness-[0.96]"
              loading="lazy"
              placeholder="blur"
              blurDataURL={ImageService.getBlurHash()}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#A4C8E1]/60 text-xs font-mono font-medium p-3 text-center bg-white/[0.04] backdrop-blur-md rounded-2xl">
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
              className="absolute top-2.5 right-2.5 z-40 w-7 h-7 rounded-full bg-[#0B131B]/70 hover:bg-rose-600/90 text-[#F0F0F0]/80 hover:text-white border border-white/[0.15] hover:border-rose-400 backdrop-blur-xl flex items-center justify-center transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_12px_rgba(0,0,0,0.5)] group-hover:opacity-100 sm:opacity-0 opacity-100 cursor-pointer"
              title="Remove from Continue Watching"
              aria-label="Remove from Continue Watching"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}



          {/* Progress Bar (if watched) */}
          {progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#0B131B]/80 z-30 overflow-hidden rounded-b-2xl">
              <div
                className="h-full bg-[#A4C8E1] shadow-[0_0_8px_rgba(164,200,225,0.8)] transition-all duration-300"
                style={{ width: `${Math.max(2, Math.min(100, displayPercent))}%` }}
              />
            </div>
          )}
        </div>

        {/* Card Title & Subtitle */}
        <div className="w-full min-w-0 pt-2.5 px-2.5 sm:px-3 space-y-0.5 overflow-hidden">
          <h4 className="text-xs sm:text-sm font-sans font-semibold text-[#F0F0F0] truncate block w-full group-hover:text-[#A4C8E1] transition-colors duration-200">
            {title}
          </h4>
          <p className="text-[11px] font-sans text-[#8FA8AD] group-hover:text-[#A4C8E1]/75 truncate block w-full transition-colors">{defaultSubtitle}</p>
        </div>
      </Link>

      {/* Netflix-Style Hover Preview Pop-Up Card */}
      {isHovered && (
        <div
          className={`absolute ${positionClasses} z-50 bg-[#0B131B]/85 backdrop-blur-3xl backdrop-saturate-150 rounded-2xl sm:rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_24px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(57,174,169,0.2)] border border-white/[0.12] overflow-hidden transform-gpu animate-in fade-in zoom-in-95 duration-200 pointer-events-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Banner: High-Res Cinema Artwork / Poster */}
          <div className="relative aspect-video w-full bg-[#0B131B] overflow-hidden group/thumb">
            <Link href={watchUrl} aria-label={`Play ${title}`} className="block w-full h-full relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={`${title} preview cover`}
                  fill
                  sizes="340px"
                  className="object-cover transition-transform duration-500 group-hover/thumb:scale-105 brightness-[0.98]"
                  placeholder="blur"
                  blurDataURL={ImageService.getBlurHash()}
                  onError={() => setImgError(true)}
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
                className="absolute top-2.5 right-2.5 z-30 w-7 h-7 rounded-full bg-[#0B131B]/70 hover:bg-rose-600/90 text-[#F0F0F0]/80 hover:text-white border border-white/[0.15] backdrop-blur-xl flex items-center justify-center transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_12px_rgba(0,0,0,0.5)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                title="Remove from Continue Watching"
                aria-label="Remove from Continue Watching"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Progress bar on popup image */}
            {progress > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0B131B]/80 z-20">
                <div
                  className="h-full bg-[#39AEA9] shadow-[0_0_8px_rgba(57,174,169,0.8)]"
                  style={{ width: `${Math.max(2, Math.min(100, displayPercent))}%` }}
                />
              </div>
            )}
          </div>

          {/* Details Section (Frosted Glass Layout with Rounded Bottom) */}
          <div className="p-3 sm:p-3.5 space-y-2.5 bg-white/[0.04] backdrop-blur-2xl rounded-b-2xl sm:rounded-b-3xl border-t border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
            {/* Row 1: Action Controls */}
            <div className="flex items-center gap-2">
              {/* Primary Platinum Play Button */}
              <Link
                href={watchUrl}
                onClick={() => soundFx.playTap()}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#F0F0F0] hover:bg-white text-[#0B131B] flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_0_16px_rgba(240,240,240,0.35)] transform active:scale-95 transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                title="Play Now"
                aria-label={`Play ${title} now`}
              >
                <Play className="w-4 h-4 fill-[#0B131B] text-[#0B131B] ml-0.5" />
              </Link>

              {/* Add to Watchlist Button */}
              <button
                type="button"
                onClick={handleWatchlistClick}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.12] hover:border-white/[0.28] text-[#F0F0F0] hover:text-white flex items-center justify-center transform active:scale-95 transition-all cursor-pointer shrink-0 backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_16px_rgba(0,0,0,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                title={added ? "In Watchlist" : "Add to Watchlist"}
                aria-label={added ? "Remove from Watchlist" : "Add to Watchlist"}
              >
                {added ? <Check className="w-4 h-4 text-[#39AEA9]" /> : <Plus className="w-4 h-4 text-[#F0F0F0]" />}
              </button>

              {/* Like / ThumbsUp Button */}
              <button
                type="button"
                onClick={handleLikeClick}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.12] hover:border-white/[0.28] text-[#F0F0F0] hover:text-white flex items-center justify-center transform active:scale-95 transition-all cursor-pointer shrink-0 backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_16px_rgba(0,0,0,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                title="Like"
                aria-label="Like title"
              >
                <ThumbsUp className={`w-4 h-4 ${liked ? "text-[#39AEA9] fill-current" : "text-[#F0F0F0]"}`} />
              </button>

              {/* Chevron Down Button (Right Aligned - More Info) */}
              <Link
                href={detailUrl}
                onClick={() => soundFx.playTap()}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.12] hover:border-white/[0.28] text-[#F0F0F0] hover:text-white flex items-center justify-center ml-auto transform active:scale-95 transition-all cursor-pointer shrink-0 backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_16px_rgba(0,0,0,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                title="More info"
                aria-label={`More info about ${title}`}
              >
                <ChevronDown className="w-4 h-4 text-[#F0F0F0]" />
              </Link>
            </div>

            {/* Row 2: Match %, Age Rating, Duration, Quality Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs font-sans">
              {matchScore !== null && (
                <span className="text-[#39AEA9] font-bold text-xs drop-shadow-[0_0_8px_rgba(57,174,169,0.5)]">
                  {matchScore}% match
                </span>
              )}
              {ageRating && (
                <span className="border border-white/[0.12] bg-white/[0.08] px-1.5 py-0.5 rounded text-[10px] font-semibold text-[#F0F0F0] backdrop-blur-md">
                  {ageRating}
                </span>
              )}
              {durationText && (
                <span className="text-[#8FA8AD] font-medium text-[11px]">
                  {durationText}
                </span>
              )}
              <span className="border border-white/[0.12] bg-white/[0.08] text-[#A4C8E1] px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider backdrop-blur-md">
                4K UHD
              </span>
            </div>

            {/* Row 3: Genres (Dot-separated) */}
            {genresList.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[#F0F0F0]/85 font-sans font-medium pt-0.5 pb-1">
                {genresList.map((g, idx) => (
                  <React.Fragment key={g}>
                    <span>{g}</span>
                    {idx < genresList.length - 1 && (
                      <span className="text-[#8FA8AD]">•</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(MovieCard);