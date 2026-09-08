"use client";

import React, { useRef } from "react";
import MovieCard from "./MovieCard";
import { MediaItem } from "../../lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MovieRowProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  onRemoveItem?: (item: any) => void;
}

function MovieRow({ title, subtitle, items, onRemoveItem }: MovieRowProps) {
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
    <div className="py-3 sm:py-4 px-4 sm:px-6 md:px-12 space-y-3.5 relative group select-none hover:z-30">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight font-display text-white flex items-center gap-2.5">
          <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-[#39AEA9] to-[#A2D5AB] shadow-[0_0_12px_rgba(57,174,169,0.6)] shrink-0" />
          <span>{title}</span>
        </h2>
        {subtitle && (
          <span className="text-xs font-sans font-medium text-[#8FA8AD] tracking-normal hidden sm:inline-block">
            {subtitle}
          </span>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full border border-white/[0.15] bg-[#0A0F11]/75 backdrop-blur-xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-gradient-to-r hover:from-[#39AEA9] hover:to-[#A2D5AB] hover:border-transparent hover:text-[#0A0F11] hover:scale-105 active:scale-95 shadow-[0_8px_24px_rgba(0,0,0,0.8)] cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div
          ref={scrollContainerRef}
          className="flex items-start gap-3.5 sm:gap-4 md:gap-5 overflow-x-auto pt-16 pb-20 -mt-14 -mb-16 scrollbar-hide snap-x scroll-smooth no-scrollbar"
        >
          {items.map((item, idx) => (
            <div
              key={`${item.id}-${item.season || 0}-${item.episode || 0}-${idx}`}
              className="snap-start shrink-0 w-[220px] sm:w-[250px] md:w-[270px] min-w-[220px] sm:min-w-[250px] md:min-w-[270px] max-w-[220px] sm:max-w-[250px] md:max-w-[270px] relative hover:z-50"
            >
              <MovieCard
                item={item}
                isFirst={idx === 0}
                isLast={idx === items.length - 1}
                onRemove={onRemoveItem ? () => onRemoveItem(item) : undefined}
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-white/[0.15] bg-[#0A0F11]/75 backdrop-blur-xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-gradient-to-r hover:from-[#39AEA9] hover:to-[#A2D5AB] hover:border-transparent hover:text-[#0A0F11] hover:scale-105 active:scale-95 shadow-[0_8px_24px_rgba(0,0,0,0.8)] cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default React.memo(MovieRow);