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
  title = "Trending Right Now",
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
        <h2 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight flex items-center gap-2.5">
          <span>{title}</span>
        </h2>

        {/* Desktop Navigation Arrow Controls */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => handleScroll("left")}
            disabled={!showLeftArrow}
            className={`w-8 h-8 rounded-full bg-[#081E30] border border-[#5C7C89]/30 text-[#5C7C89] hover:text-white hover:bg-[#1F4959] flex items-center justify-center transition-all cursor-pointer ${
              !showLeftArrow ? "opacity-30 cursor-not-allowed" : "hover:border-[#5C7C89]"
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleScroll("right")}
            disabled={!showRightArrow}
            className={`w-8 h-8 rounded-full bg-[#081E30] border border-[#5C7C89]/30 text-[#5C7C89] hover:text-white hover:bg-[#1F4959] flex items-center justify-center transition-all cursor-pointer ${
              !showRightArrow ? "opacity-30 cursor-not-allowed" : "hover:border-[#5C7C89]"
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ranked Items Carousel (Netflix Authentic Hollow Numbers + Overlapping Poster Cards) */}
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

          // Calculate SVG viewBox based on single or double digits
          const isTwoDigits = rank >= 10;
          const svgWidth = isTwoDigits ? 140 : 90;
          const svgViewBox = isTwoDigits ? "0 0 140 180" : "0 0 90 180";

          return (
            <Link
              key={`${item.id}-${rank}`}
              href={`/watch/${type}/${item.id}`}
              className="group/item relative flex items-center shrink-0 snap-start select-none cursor-pointer"
            >
              {/* 1. Authentic Hollow Outlined Rank Number (Netflix Top 10 Signature Style) */}
              <div className="relative z-0 select-none pointer-events-none shrink-0 transition-transform duration-300 group-hover/item:scale-105">
                <svg
                  className="h-[175px] sm:h-[215px] md:h-[245px] w-auto shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                  viewBox={svgViewBox}
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <text
                    x="50%"
                    y="88%"
                    textAnchor="middle"
                    fill="#011425"
                    stroke="#595959"
                    strokeWidth="5"
                    strokeLinejoin="round"
                    className="font-black font-sans group-hover/item:stroke-[#5C7C89] transition-colors"
                    style={{
                      fontSize: isTwoDigits ? "140px" : "165px",
                      fontFamily: "Impact, 'Arial Black', sans-serif",
                    }}
                  >
                    {rank}
                  </text>
                </svg>
              </div>

              {/* 2. Vertical 2:3 Poster Card (Overlapping the Right Side of the Number) */}
              <div className="relative z-10 -ml-7 sm:-ml-9 md:-ml-12 w-28 sm:w-36 md:w-40 aspect-[2/3] rounded-lg sm:rounded-xl overflow-hidden bg-[#081E30] border border-[#5C7C89]/30 shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all duration-300 group-hover/item:scale-105 group-hover/item:border-[#5C7C89] group-hover/item:shadow-[0_15px_35px_rgba(31,73,89,0.5),0_0_20px_rgba(92,124,137,0.3)]">
                <Image
                  src={posterUrl}
                  alt={displayTitle}
                  fill
                  sizes="(max-width: 768px) 144px, 160px"
                  className="object-cover transition-transform duration-500 group-hover/item:scale-110 opacity-100 brightness-[1.03]"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL={ImageService.getBlurHash()}
                />

                {/* Top-Left Platform Brand Badge (Netflix, Prime, Disney+, Apple TV, HBO) */}
                <div className="absolute top-1.5 left-1.5 z-20 pointer-events-none">
                  <PlatformBadge item={item} />
                </div>

                {/* Play Icon on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#011425]/90 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-[#1F4959] text-white border border-[#5C7C89] flex items-center justify-center shadow-[0_0_15px_rgba(31,73,89,0.8)] transform group-hover/item:scale-110 transition-transform duration-300">
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
