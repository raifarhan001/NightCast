"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { ImageService } from "../../lib/ImageService";
import { soundFx } from "../../lib/soundEffects";
import { useAmbientStore } from "../../store/ambientStore";
import PlatformBadge from "../shared/PlatformBadge";

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

  const top10Items = items.slice(0, 10);

  const checkScrollPosition = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
      try {
        sessionStorage.setItem("nc_row_scroll_top10", String(scrollLeft));
      } catch {}
    }
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
            className={`w-10 h-10 rounded-full border border-white/[0.12] bg-white/[0.08] hover:bg-white/[0.18] backdrop-blur-2xl backdrop-saturate-150 text-[#F0F0F0] hover:text-white flex items-center justify-center transform-gpu transition-all duration-200 cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.7)] hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] ${
              !showLeftArrow ? "opacity-30 cursor-not-allowed" : ""
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            disabled={!showRightArrow}
            className={`w-10 h-10 rounded-full border border-white/[0.12] bg-white/[0.08] hover:bg-white/[0.18] backdrop-blur-2xl backdrop-saturate-150 text-[#F0F0F0] hover:text-white flex items-center justify-center transform-gpu transition-all duration-200 cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.7)] hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] ${
              !showRightArrow ? "opacity-30 cursor-not-allowed" : ""
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
        className="flex items-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar scrollbar-hide scroll-smooth snap-x snap-mandatory pt-2 pb-6 px-1"
      >
        {top10Items.map((item, index) => (
          <RankedCardItem key={`${item.id}-${index + 1}`} item={item} rank={index + 1} />
        ))}
      </div>
    </section>
  );
}

function RankedCardItem({ item, rank }: { item: RankedItem; rank: number }) {
  const [imgError, setImgError] = useState(false);
  const displayTitle = item.title || item.name || "Untitled";
  const type = item.media_type || (item.first_air_date ? "tv" : "movie");
  const posterUrl = imgError
    ? ImageService.FallbackImage("poster", displayTitle)
    : ImageService.getPoster(item.poster_path, "w500", displayTitle);

  const isTwoDigits = rank >= 10;
  const svgViewBox = isTwoDigits ? "0 0 160 180" : "0 0 95 180";

  return (
    <Link
      href={`/watch/${type}/${item.id}`}
      onClick={() => soundFx.playTap()}
      onMouseEnter={() => {
        soundFx.playHover();
        const backdrop = item.backdrop_path || item.poster_path;
        if (backdrop) {
          useAmbientStore.getState().setActiveBackdrop(backdrop, displayTitle);
        }
      }}
      aria-label={`Rank ${rank}: Watch ${displayTitle}`}
      className="group/item relative flex items-center shrink-0 snap-start select-none cursor-pointer transform-gpu will-change-transform transition-all duration-200 ease-out hover:-translate-y-1 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B131B]"
    >
      {/* Monumental Modern Rank Number */}
      <div className="relative z-0 select-none pointer-events-none shrink-0 transform-gpu will-change-transform transition-transform duration-300 group-hover/item:scale-105">
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
            className="font-extrabold group-hover/item:stroke-[#39AEA9] group-hover/item:fill-[#39AEA9]/20 transition-colors duration-300"
            style={{
              fontSize: isTwoDigits ? "140px" : "165px",
              fontFamily: "Syne, sans-serif",
            }}
          >
            {rank}
          </text>
        </svg>
      </div>

      {/* Vertical Poster Card with Rounded-2xl */}
      <div className="relative z-10 -ml-7 sm:-ml-9 md:-ml-12 w-28 sm:w-36 md:w-40 aspect-[2/3] rounded-2xl overflow-hidden bg-white/[0.04] backdrop-blur-2xl border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_32px_rgba(0,0,0,0.75)] transform-gpu transition-all duration-300 ease-out group-hover/item:scale-[1.03] group-hover/item:border-white/[0.28] group-hover/item:shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_16px_40px_rgba(0,0,0,0.9),0_0_24px_rgba(57,174,169,0.25)]">
        <Image
          src={posterUrl}
          alt={`${displayTitle} - Rank #${rank} poster`}
          fill
          sizes="(max-width: 768px) 144px, 160px"
          className="object-cover rounded-2xl transform-gpu transition-transform duration-500 ease-out group-hover/item:scale-105 opacity-100 brightness-[0.96]"
          loading="lazy"
          placeholder="blur"
          blurDataURL={ImageService.getBlurHash()}
          onError={() => setImgError(true)}
        />

        {/* Top-Left Platform Badge */}
        <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
          <PlatformBadge item={item} />
        </div>

        {/* Play Icon on Hover with White Pill Glass Effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-[#0B131B]/95 via-[#0B131B]/40 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[#F0F0F0] text-[#0B131B] flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_16px_rgba(240,240,240,0.35)] transform-gpu group-hover/item:scale-110 active:scale-95 transition-transform duration-200">
            <Play className="w-4 h-4 fill-[#0B131B] text-[#0B131B] ml-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

