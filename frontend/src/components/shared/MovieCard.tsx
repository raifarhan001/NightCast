"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Play, Star } from "lucide-react";
import { ImageService } from "../../lib/ImageService";
import { soundFx } from "../../lib/soundEffects";
import { getCleanMediaId } from "../../lib/progress";

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
    ai_pitch?: string;
    ai_vibe_tag?: string;
    has_en_title_backdrop?: boolean;
    logo_path?: string | null;
  };
  subtitle?: string;
  isFirst?: boolean;
  isLast?: boolean;
  onRemove?: () => void;
}

function MovieCard({ item, subtitle, onRemove }: MovieCardProps) {
  const type = item.media_type || (item.season ? "tv" : (item.first_air_date ? "tv" : "movie"));
  const title = item.title || item.name || "Untitled";
  const [imgError, setImgError] = useState(false);

  const cleanId = useMemo(() => getCleanMediaId(item.id), [item.id]);
  const detailUrl = `/${type}/${cleanId}`;

  // Horizontal style: Priority on English title-treated backdrop
  const rawImageUrl = item.backdrop_path
    ? ImageService.getBackdrop(item.backdrop_path, "w780", title)
    : item.poster_path
    ? ImageService.getPoster(item.poster_path, "w500", title)
    : null;

  const imageUrl = imgError ? ImageService.FallbackImage("backdrop", title) : rawImageUrl;

  const progress = Number(item.progress_percent ?? 0);
  const displayPercent = Math.max(1, Math.min(99, Math.round(progress)));

  const releaseYear = (item.release_date || item.first_air_date || "").split("-")[0] || "";
  const typeLabel = type === "tv" ? "SERIES" : "MOVIE";
  const rating = item.vote_average && item.vote_average > 0 ? item.vote_average.toFixed(1) : null;

  return (
    <div className="w-[240px] sm:w-[280px] md:w-[310px] min-w-[240px] sm:min-w-[280px] md:min-w-[310px] max-w-[240px] sm:max-w-[280px] md:max-w-[310px] shrink-0 select-none snap-start relative transform-gpu">
      {/* Isolated per-card group: group/card ensures hover only affects THIS specific card */}
      <Link
        href={detailUrl}
        onClick={() => soundFx.playTap()}
        aria-label={`View details for ${title}`}
        data-tv-card="true"
        className="group/card block cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B131B] transform-gpu"
      >
        <div className="cinema-card-landscape w-full rounded-2xl relative overflow-hidden transform-gpu will-change-transform">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`${title} backdrop`}
              fill
              sizes="(max-width: 768px) 280px, 310px"
              decoding="async"
              draggable={false}
              className="object-cover rounded-2xl opacity-100 brightness-[0.96] select-none pointer-events-none transform-gpu will-change-transform transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:scale-106 group-hover/card:brightness-[1.03]"
              loading="lazy"
              placeholder="blur"
              blurDataURL={ImageService.getBlurHash()}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/60 text-xs font-mono font-medium p-3 text-center bg-white/[0.04] backdrop-blur-md rounded-2xl">
              {title}
            </div>
          )}

          {/* Fallback Studio Logo or Clean Title for cards without English-treated backdrops */}
          {!item.has_en_title_backdrop && (
            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-3.5 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none z-10 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:opacity-0 group-hover/card:translate-y-2">
              {item.logo_path ? (
                <div className="relative h-6 sm:h-7 w-auto max-w-[160px] sm:max-w-[200px] aspect-[3/1]">
                  <Image
                    src={item.logo_path.startsWith("http") ? item.logo_path : `https://image.tmdb.org/t/p/w300${item.logo_path}`}
                    alt={title}
                    fill
                    sizes="200px"
                    className="object-contain object-left filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
                  />
                </div>
              ) : (
                <h4 className="text-white font-black text-xs sm:text-sm uppercase tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] line-clamp-1">
                  {title}
                </h4>
              )}
            </div>
          )}

          {/* Hover Overlay: ONLY shows on the single hovered card with smooth staggered entrance */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 ease-out pointer-events-none flex items-end p-3 sm:p-3.5 z-20">
            <div className="w-full flex items-center gap-2.5 min-w-0 transform-gpu translate-y-3 opacity-0 group-hover/card:translate-y-0 group-hover/card:opacity-100 transition-all duration-320 ease-[cubic-bezier(0.22,1,0.36,1)]">
              {/* White Circular Play Button with spring bounce */}
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white flex items-center justify-center shrink-0 shadow-[0_4px_16px_rgba(255,255,255,0.4)] transform-gpu scale-75 group-hover/card:scale-100 active:scale-90 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
                <Play className="w-3.5 h-3.5 fill-black text-black ml-0.5" />
              </div>

              {/* Title & Metadata Details */}
              <div className="min-w-0 flex-1 space-y-0.5 transform-gpu translate-y-1 group-hover/card:translate-y-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] delay-75">
                <h4 className="text-white font-bold text-xs sm:text-sm leading-snug truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                  {title}
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-neutral-300 font-medium drop-shadow">
                  {releaseYear && <span>{releaseYear}</span>}
                  {releaseYear && <span className="text-neutral-500">•</span>}
                  <span className="uppercase tracking-wider font-semibold text-[#A4C8E1]">{typeLabel}</span>
                  {rating && rating !== "0.0" && (
                    <>
                      <span className="text-neutral-500">•</span>
                      <span className="flex items-center gap-1 text-amber-400 font-semibold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                        <span className="text-neutral-200">{rating}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dismiss from Continue Watching Button */}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundFx.playTap();
                onRemove();
              }}
              className="absolute top-2.5 right-2.5 z-30 w-7 h-7 rounded-full bg-black/75 hover:bg-rose-600 text-white/80 hover:text-white border border-white/15 opacity-0 group-hover/card:opacity-100 flex items-center justify-center transition-all cursor-pointer shadow-md pointer-events-auto"
              title="Remove from Continue Watching"
              aria-label="Remove from Continue Watching"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Progress Bar (if in continue watching) */}
          {progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/80 z-30 overflow-hidden">
              <div
                className="h-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)] origin-left transition-transform duration-300 ease-out"
                style={{ transform: `scaleX(${Math.max(0.02, Math.min(1, displayPercent / 100))})` }}
              />
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

export default React.memo(MovieCard, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.backdrop_path === next.item.backdrop_path &&
    prev.item.poster_path === next.item.poster_path &&
    prev.item.logo_path === next.item.logo_path &&
    prev.item.has_en_title_backdrop === next.item.has_en_title_backdrop &&
    prev.item.progress_percent === next.item.progress_percent
  );
});
