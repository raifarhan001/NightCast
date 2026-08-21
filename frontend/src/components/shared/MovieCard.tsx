"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Star, Plus, Check, ThumbsUp } from "lucide-react";
import { ImageService } from "../../lib/ImageService";

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
    season?: number;
    episode?: number;
    progress_percent?: number;
  };
  subtitle?: string;
}

export default function MovieCard({ item, subtitle }: MovieCardProps) {
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);

  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const type = item.media_type || (item.first_air_date ? "tv" : "movie");
  const title = item.title || item.name || "Untitled";

  const imageUrl = item.backdrop_path
    ? item.backdrop_path.startsWith("http") ? item.backdrop_path : `https://image.tmdb.org/t/p/w500${item.backdrop_path}`
    : item.poster_path
    ? item.poster_path.startsWith("http") ? item.poster_path : `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : null;

  const defaultSubtitle = item.season
    ? `Season ${item.season}, Episode ${item.episode || 1}`
    : subtitle || (type === "tv" ? "TV Series" : "Movie");

  const progress = item.progress_percent || 0;

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAdded(!added);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked(!liked);
  };

  return (
    <Link
      href={`/watch/${type}/${item.id}` + (item.season ? `?season=${item.season}&episode=${item.episode}` : "")}
      className="group min-w-[220px] sm:min-w-[260px] md:min-w-[280px] shrink-0 block select-none snap-start cursor-pointer transform-gpu will-change-transform"
    >
      {/* 16:9 Amazon Prime Video Hardware-Accelerated Landscape Card */}
      <div className="gtv-card-landscape bg-[#192231] border border-[#8197A4]/20 group-hover:border-[#00A8E1] group-hover:shadow-[0_12px_32px_rgba(0,168,225,0.4),0_15px_40px_rgba(11,17,32,0.9)]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 260px, 280px"
            className="object-cover transform-gpu will-change-transform transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] group-hover:scale-105 opacity-100 brightness-[1.02]"
            loading="lazy"
            placeholder="blur"
            blurDataURL={ImageService.getBlurHash()}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#8197A4] text-xs font-bold p-3 text-center bg-gradient-to-br from-[#192231] to-[#232E42]">
            {title}
          </div>
        )}

        {/* Prime Video Tag Ribbon Top Left */}
        <div className="absolute top-2 left-2 z-20 pointer-events-none transform-gpu will-change-transform transition-transform duration-200 group-hover:scale-105">
          <span className="prime-badge-cyan text-[9px] font-black tracking-wider flex items-center gap-0.5 px-2 py-0.5 rounded shadow-md">
            <span>prime</span>
          </span>
        </div>

        {/* IMDb Rating Tag Top Right */}
        {rating && (
          <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded bg-[#0B1120]/90 border border-[#8197A4]/30 text-[9px] font-bold text-white flex items-center gap-1 transform-gpu will-change-transform transition-transform duration-200 group-hover:scale-105">
            <Star className="w-2.5 h-2.5 fill-current text-[#E5B800]" />
            <span>{rating}</span>
          </div>
        )}

        {/* Dark Scrim Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

        {/* Prime Video Hover Preview Quick Action Buttons */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] flex flex-col justify-between p-3.5 z-30">
          <div />

          {/* Center Play Button & Action Controls */}
          <div className="flex items-center justify-center gap-3 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)]">
            {/* Primary Play Button */}
            <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_20px_rgba(0,168,225,0.8)] transform-gpu will-change-transform group-hover:scale-110 active:scale-95 transition-transform duration-200">
              <Play className="w-4 h-4 fill-current ml-0.5 text-black" />
            </div>

            {/* Add to Watchlist Circle Button */}
            <button
              onClick={handleWatchlistClick}
              className="w-9 h-9 rounded-full bg-[#192231] hover:bg-[#232E42] border border-[#8197A4]/40 hover:border-[#00A8E1] text-white flex items-center justify-center transform-gpu will-change-transform transition-all duration-150 hover:scale-110 active:scale-95"
              title="Add to Watchlist"
            >
              {added ? <Check className="w-4 h-4 text-[#00A8E1]" /> : <Plus className="w-4 h-4 text-white" />}
            </button>

            {/* Like Circle Button */}
            <button
              onClick={handleLikeClick}
              className="w-9 h-9 rounded-full bg-[#192231] hover:bg-[#232E42] border border-[#8197A4]/40 hover:border-[#00A8E1] text-white flex items-center justify-center transform-gpu will-change-transform transition-all duration-150 hover:scale-110 active:scale-95"
              title="Like"
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${liked ? "text-[#00A8E1] fill-current" : "text-white"}`} />
            </button>
          </div>

          <div />
        </div>

        {/* Prime Cyan Progress Bar */}
        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0B1120]/80 z-30">
            <div
              className="h-full bg-[#00A8E1] shadow-[0_0_10px_rgba(0,168,225,0.9)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Card Title & Subtitle */}
      <div className="pt-2 px-0.5 space-y-0.5">
        <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#00A8E1] transition-colors duration-150 font-sans">
          {title}
        </h4>
        <p className="text-[11px] text-[#8197A4] font-medium truncate">{defaultSubtitle}</p>
      </div>
    </Link>
  );
}