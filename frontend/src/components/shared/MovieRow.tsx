"use client";

import React, { useRef } from "react";
import MovieCard from "./MovieCard";
import { MediaItem } from "../../lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MovieRowProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
}

function MovieRow({ title, items }: MovieRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollAmount = clientWidth * 0.8;
      scrollContainerRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="py-3 sm:py-4 px-4 sm:px-6 md:px-12 space-y-3.5 relative group select-none">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight font-display flex items-center gap-2.5">
          <span className="w-1.5 h-5 rounded-full bg-[#00A8E1] shadow-[0_0_12px_rgba(0,168,225,0.8)]" />
          <span>{title}</span>
        </h2>
      </div>

      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-white/20 bg-[#141C2E]/90 backdrop-blur-xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#00A8E1] hover:border-[#00A8E1] hover:scale-110 active:scale-95 shadow-[0_8px_24px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.3)] focus:outline-none cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div
          ref={scrollContainerRef}
          className="flex items-start gap-4 md:gap-5 overflow-x-auto pb-3 pt-1 scrollbar-hide snap-x scroll-smooth no-scrollbar"
        >
          {items.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="snap-start">
              <MovieCard item={item} />
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-white/20 bg-[#141C2E]/90 backdrop-blur-xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#00A8E1] hover:border-[#00A8E1] hover:scale-110 active:scale-95 shadow-[0_8px_24px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.3)] focus:outline-none cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default React.memo(MovieRow);