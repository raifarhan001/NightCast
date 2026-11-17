"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, Star } from "lucide-react";
import { ImageService } from "../../lib/ImageService";
import { soundFx } from "../../lib/soundEffects";

interface RankedItem {
  id: string | number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  media_type?: string;
  release_date?: string;
  first_air_date?: string;
}

interface Top10RankedRowProps {
  title?: string;
  items: RankedItem[];
}

export default function Top10RankedRow({
  title = "Top 10 Movies & Shows",
  items = [],
}: Top10RankedRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const scrollRafId = useRef<number | null>(null);
  const storageTimeoutId = useRef<any>(null);

  const top10Items = items.slice(0, 10);

  const checkScrollPosition = () => {
    if (scrollRafId.current) return;
    scrollRafId.current = requestAnimationFrame(() => {
      scrollRafId.current = null;
      if (rowRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
        setShowLeftArrow(scrollLeft > 10);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);

        if (storageTimeoutId.current) clearTimeout(storageTimeoutId.current);
        storageTimeoutId.current = setTimeout(() => {
          try {
            sessionStorage.setItem("nc_row_scroll_top10", String(scrollLeft));
          } catch {}
        }, 200);
      }
    });
  };

  useEffect(() => {
    checkScrollPosition();
    if (rowRef.current) {
      try {
        const saved = sessionStorage.getItem("nc_row_scroll_top10");
        if (saved) {
          rowRef.current.scrollLeft = parseFloat(saved);
        }
      } catch {}
    }
    return () => {
      if (scrollRafId.current) cancelAnimationFrame(scrollRafId.current);
      if (storageTimeoutId.current) clearTimeout(storageTimeoutId.current);
    };
  }, [items]);

  const handleScroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (!top10Items || top10Items.length === 0) return null;

  return (
    <section className="space-y-4 px-4 sm:px-6 md:px-12 select-none relative group/row">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight font-display text-[#F0F0F0] flex items-center gap-2.5">
          <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-[#A4C8E1] to-[#39AEA9] shadow-[0_0_12px_rgba(57,174,169,0.7)] inline-block shrink-0" />
          <span>{title}</span>
        </h2>

        {/* Desktop Navigation Controls */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            disabled={!showLeftArrow}
            className={`w-10 h-10 rounded-full border border-white/[0.12] bg-[#0B131B]/80 hover:bg-[#39AEA9]/30 hover:border-[#39AEA9]/70 backdrop-blur-2xl backdrop-saturate-150 text-[#F0F0F0] hover:text-white flex items-center justify-center transform-gpu transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.7)] hover:shadow-[0_0_24px_rgba(57,174,169,0.55)] hover:scale-115 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] ${
              !showLeftArrow ? "opacity-30 cursor-not-allowed pointer-events-none" : ""
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            disabled={!showRightArrow}
            className={`w-10 h-10 rounded-full border border-white/[0.12] bg-[#0B131B]/80 hover:bg-[#39AEA9]/30 hover:border-[#39AEA9]/70 backdrop-blur-2xl backdrop-saturate-150 text-[#F0F0F0] hover:text-white flex items-center justify-center transform-gpu transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.7)] hover:shadow-[0_0_24px_rgba(57,174,169,0.55)] hover:scale-115 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] ${
              !showRightArrow ? "opacity-30 cursor-not-allowed pointer-events-none" : ""
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Ranked Items Carousel */}
      <div
        ref={rowRef}
        onScroll={checkScrollPosition}
        className="flex items-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar scrollbar-hide scroll-smooth snap-x snap-mandatory pt-2 pb-6 px-1 overscroll-x-contain touch-pan-x transform-gpu"
        style={{ contain: "layout style paint", WebkitOverflowScrolling: "touch" }}
      >
        {top10Items.map((item, index) => (
          <RankedCardItem key={`${item.id}-${index + 1}`} item={item} rank={index + 1} />
        ))}
      </div>
    </section>
  );
}

const RankedCardItem = React.memo(function RankedCardItem({ item, rank }: { item: RankedItem; rank: number }) {
  const [imgError, setImgError] = useState(false);
  const displayTitle = item.title || item.name || "Untitled";
  const type = item.media_type || (item.first_air_date ? "tv" : "movie");
  const posterUrl = imgError
    ? ImageService.FallbackImage("poster", displayTitle)
    : ImageService.getPoster(item.poster_path, "w500", displayTitle);

  const releaseYear = (item.release_date || item.first_air_date || "").split("-")[0] || "";
  const typeLabel = type === "tv" ? "SERIES" : "MOVIE";
  const rating = item.vote_average && item.vote_average > 0 ? item.vote_average.toFixed(1) : null;

  const isTwoDigits = rank >= 10;
  const svgViewBox = isTwoDigits ? "0 0 160 180" : "0 0 95 180";

  return (
    <Link
      href={`/${type}/${item.id}`}
      onClick={() => soundFx.playTap()}
      aria-label={`Rank ${rank}: Watch ${displayTitle}`}
      data-tv-card="true"
      className="group/item relative flex items-center shrink-0 snap-start select-none cursor-pointer transform-gpu rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B131B]"
    >
      {/* Monumental Modern Rank Number */}
      <div className="relative z-0 select-none pointer-events-none shrink-0 transform-gpu transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/item:scale-105 group-hover/item:-translate-x-1">
        <svg
          className="h-[175px] sm:h-[215px] md:h-[245px] w-auto shrink-0 drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]"
          viewBox={svgViewBox}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <text
            x="50%"
            y="88%"
            textAnchor="middle"
            fill="#0B131B"
            stroke="#8FA8AD"
            strokeWidth="3.5"
            strokeLinejoin="round"
            className="font-extrabold group-hover/item:stroke-[#39AEA9] group-hover/item:fill-[#39AEA9]/25 transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              fontSize: isTwoDigits ? "140px" : "165px",
              fontFamily: "Syne, sans-serif",
            }}
          >
            {rank}
          </text>
        </svg>
      </div>

      {/* Vertical Poster Card with Rounded-2xl and 3D Floating Motion */}
      <div
        style={{ transform: "translate3d(0, 0, 0)", contain: "paint layout" }}
        className="relative z-10 -ml-7 sm:-ml-9 md:-ml-12 w-28 sm:w-36 md:w-40 aspect-[2/3] rounded-2xl overflow-hidden bg-[#0F1A24] border border-white/[0.12] shadow-[0_8px_24px_rgba(0,0,0,0.75)] transform-gpu transition-all duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/item:-translate-y-2 group-hover/item:scale-[1.035] group-hover/item:border-[#39AEA9]/60 group-hover/item:shadow-[0_24px_48px_-10px_rgba(0,0,0,0.95),0_0_30px_rgba(57,174,169,0.4)] will-change-transform"
      >
        <Image
          src={posterUrl}
          alt={`${displayTitle} - Rank #${rank} poster`}
          fill
          sizes="(max-width: 768px) 144px, 160px"
          decoding="async"
          draggable={false}
          className="object-cover rounded-2xl opacity-100 brightness-[0.96] select-none pointer-events-none transform-gpu will-change-transform transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/item:scale-108 group-hover/item:brightness-[1.03]"
          loading="lazy"
          placeholder="blur"
          blurDataURL={ImageService.getBlurHash()}
          onError={() => setImgError(true)}
        />

        {/* Hover Overlay: Shows ONLY on hover with title, play button, and metadata */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/95 via-black/55 to-black/20 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 ease-out flex flex-col justify-between p-2.5 sm:p-3 pointer-events-none">
          {/* Top row: Rating Pill */}
          <div className="w-full flex items-center justify-end transform-gpu -translate-y-2 opacity-0 group-hover/item:translate-y-0 group-hover/item:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
            {rating && rating !== "0.0" && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-black/75 backdrop-blur-md text-amber-400 border border-amber-400/30 shadow-sm">
                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400 text-amber-400 shrink-0" />
                <span className="text-white">{rating}</span>
              </span>
            )}
          </div>

          {/* Center: Play Icon with Spring bounce */}
          <div className="self-center my-auto">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-black flex items-center justify-center shadow-[0_4px_20px_rgba(255,255,255,0.45)] transform-gpu scale-75 opacity-0 group-hover/item:scale-100 group-hover/item:opacity-100 active:scale-90 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-black text-black ml-0.5" />
            </div>
          </div>

          {/* Bottom: Title & Details with smooth slide-up */}
          <div className="space-y-0.5 text-left transform-gpu translate-y-2 opacity-0 group-hover/item:translate-y-0 group-hover/item:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] delay-75">
            <h4 className="text-white font-bold text-[11px] sm:text-xs leading-tight line-clamp-2 drop-shadow-md">
              {displayTitle}
            </h4>
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-neutral-300 font-medium drop-shadow flex-wrap">
              {releaseYear && <span>{releaseYear}</span>}
              {releaseYear && <span className="text-neutral-500">•</span>}
              <span className="uppercase tracking-wider font-semibold text-[#A4C8E1]">{typeLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
});

