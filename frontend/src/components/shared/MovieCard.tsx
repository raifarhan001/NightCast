"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Star } from "lucide-react";
import { ImageService } from "../../lib/ImageService";
import PlatformBadge from "./PlatformBadge";

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

  return (
    <Link
      href={`/watch/${type}/${item.id}` + (item.season ? `?season=${item.season}&episode=${item.episode}` : "")}
      className="group min-w-[220px] sm:min-w-[260px] md:min-w-[290px] shrink-0 block select-none snap-start cursor-pointer"
    >
      {/* 16:9 Google TV Landscape Poster Card with Ambient Glow */}
      <div className="gtv-card-landscape group-hover:shadow-[0_10px_35px_-5px_rgba(31,73,89,0.5),0_0_25px_rgba(92,124,137,0.3)]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 260px, 290px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105 opacity-100 brightness-[1.03]"
            loading="lazy"
            placeholder="blur"
            blurDataURL={ImageService.getBlurHash()}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#5C7C89] text-xs font-bold p-3 text-center bg-gradient-to-br from-[#081E30] to-[#0D2A42]">
            {title}
          </div>
        )}

        {/* Ambient Soft Backlight Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#011425]/90 via-[#011425]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Hover Play Trigger */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-[#1F4959] text-white border border-[#5C7C89]/60 flex items-center justify-center shadow-[0_0_20px_rgba(31,73,89,0.8)] transform group-hover:scale-110 transition-transform duration-300">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
        </div>

        {/* Studio / Platform Brand Logo Badge Top Left */}
        <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
          <PlatformBadge item={item} />
        </div>

        {/* Rating Pill Top Right */}
        {rating && (
          <div className="absolute top-2.5 right-2.5 z-20 px-2 py-0.5 rounded-full bg-[#011425]/85 backdrop-blur-md border border-[#5C7C89]/30 text-[9px] font-bold text-white flex items-center gap-1">
            <Star className="w-2.5 h-2.5 fill-current text-yellow-400" />
            <span>{rating}</span>
          </div>
        )}

        {/* Progress Bar overlay if continuing */}
        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#011425]/60">
            <div
              className="h-full bg-gradient-to-r from-[#1F4959] to-[#5C7C89] shadow-[0_0_8px_#5C7C89] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Title & Subtitle */}
      <div className="pt-2 px-0.5 space-y-0.5">
        <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#5C7C89] transition-colors font-display">
          {title}
        </h4>
        <p className="text-[11px] text-[#5C7C89] font-medium truncate">{defaultSubtitle}</p>
      </div>
    </Link>
  );
}