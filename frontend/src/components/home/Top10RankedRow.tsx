"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { ImageService } from "../../lib/ImageService";
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
    }
  };

  useEffect(() => {
    checkScrollPosition();
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
      {/* Header with Title and Scroll Arrows */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-black text-white font-sans tracking-tight flex items-center gap-2.5">
          <span className="prime-badge-cyan text-xs font-black uppercase tracking-wider shadow-[0_0_10px_rgba(0,168,225,0.6)]">TOP 10</span>
          <span>{title}</span>
        </h2>

        {/* Desktop Navigation Controls */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => handleScroll("left")}
            disabled={!showLeftArrow}
            className={`w-8 h-8 rounded-full bg-[#192231] border border-[#8197A4]/30 text-white hover:bg-[#00A8E1] hover:border-[#00A8E1] hover:scale-105 active:scale-95 flex items-center justify-center transform-gpu will-change-transform transition-all duration-200 cursor-pointer ${
              !showLeftArrow ? "opacity-30 cursor-not-allowed" : ""
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleScroll("right")}
            disabled={!showRightArrow}
            className={`w-8 h-8 rounded-full bg-[#192231] border border-[#8197A4]/30 text-white hover:bg-[#00A8E1] hover:border-[#00A8E1] hover:scale-105 active:scale-95 flex items-center justify-center transform-gpu will-change-transform transition-all duration-200 cursor-pointer ${
              !showRightArrow ? "opacity-30 cursor-not-allowed" : ""
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ranked Items Carousel (Amazon Prime Gold/Cyan Rank Numbers + Overlapping Poster Cards) */}
      <div
        ref={rowRef}
        onScroll={checkScrollPosition}
        className="flex items-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pt-3 pb-6 px-1"
      >
        {top10Items.map((item, index) => {
          const rank = index + 1;
          const displayTitle = item.title || item.name || "Untitled";
          const type = item.media_type || (item.first_air_date ? "tv" : "movie");
          const posterUrl = ImageService.getPoster(item.poster_path, "w500", displayTitle);

          const isTwoDigits = rank >= 10;
          const svgViewBox = isTwoDigits ? "0 0 140 180" : "0 0 90 180";

          return (
            <Link
              key={`${item.id}-${rank}`}
              href={`/watch/${type}/${item.id}`}
              className="group/item relative flex items-center shrink-0 snap-start select-none cursor-pointer transform-gpu will-change-transform transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] hover:-translate-y-1"
            >
              {/* Outlined Gold Rank Number */}
              <div className="relative z-0 select-none pointer-events-none shrink-0 transform-gpu will-change-transform transition-transform duration-200 group-hover/item:scale-105">
                <svg
                  className="h-[175px] sm:h-[215px] md:h-[245px] w-auto shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
                  viewBox={svgViewBox}
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <text
                    x="50%"
                    y="88%"
                    textAnchor="middle"
                    fill="#0B1120"
                    stroke="#00A8E1"
                    strokeWidth="5"
                    strokeLinejoin="round"
                    className="font-black font-sans group-hover/item:stroke-[#E5B800] transition-colors duration-200"
                    style={{
                      fontSize: isTwoDigits ? "140px" : "165px",
                      fontFamily: "Impact, 'Arial Black', sans-serif",
                    }}
                  >
                    {rank}
                  </text>
                </svg>
              </div>

              {/* Vertical Poster Card */}
              <div className="relative z-10 -ml-7 sm:-ml-9 md:-ml-12 w-28 sm:w-36 md:w-40 aspect-[2/3] rounded-2xl overflow-hidden bg-[#141C2E]/80 backdrop-blur-xl border border-white/15 shadow-[0_12px_36px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.2)] transform-gpu will-change-transform transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/item:scale-[1.05] group-hover/item:border-[#00A8E1]/80 group-hover/item:shadow-[0_16px_40px_rgba(0,168,225,0.4),inset_0_1px_0_0_rgba(255,255,255,0.3)]">
                <Image
                  src={posterUrl}
                  alt={displayTitle}
                  fill
                  sizes="(max-width: 768px) 144px, 160px"
                  className="object-cover transform-gpu will-change-transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/item:scale-105 opacity-100 brightness-[1.02]"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL={ImageService.getBlurHash()}
                />

                {/* Top-Left Platform Badge */}
                <div className="absolute top-2 left-2 z-20 pointer-events-none">
                  <PlatformBadge item={item} />
                </div>

                {/* Play Icon on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050811]/90 via-[#050811]/40 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_25px_rgba(0,168,225,0.8),inset_0_1px_0_0_rgba(255,255,255,0.8)] transform-gpu will-change-transform group-hover/item:scale-110 transition-transform duration-200">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
