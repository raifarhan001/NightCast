"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Star } from "lucide-react";
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
      <div className="gtv-card-landscape group-hover:shadow-[0_10px_35px_-5px_rgba(99,102,241,0.35),0_0_25px_rgba(249,115,22,0.25)]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 260px, 290px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105 opacity-90"
            loading="lazy"
            placeholder="blur"
            blurDataURL={ImageService.getBlurHash()}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/50 text-xs font-bold p-3 text-center bg-gradient-to-br from-[#12141F] to-[#1A1D2D]">
            {title}
          </div>
        )}

        {/* Ambient Soft Backlight Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Hover Play Trigger */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.4)] transform group-hover:scale-110 transition-transform duration-300">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
        </div>

        {/* Rating Pill Top Right */}
        {rating && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[9px] font-bold text-white flex items-center gap-1">
            <Star className="w-2.5 h-2.5 fill-current text-yellow-400" />
            <span>{rating}</span>
          </div>
        )}

        {/* Progress Bar overlay if continuing */}
        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-white shadow-[0_0_8px_#FFF] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Title & Subtitle */}
      <div className="pt-2 px-0.5 space-y-0.5">
        <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-white/90 transition-colors font-display">
          {title}
        </h4>
        <p className="text-[11px] text-white/50 font-medium truncate">{defaultSubtitle}</p>
      </div>
    </Link>
  );
}