"use client";

import React, { useRef } from "react";
import MovieCard from "./MovieCard";
import { MediaItem } from "../../lib/api";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

interface MovieRowProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  onRemoveItem?: (item: any) => void;
  isAi?: boolean;
}

function MovieRow({ title, items, onRemoveItem, isAi }: MovieRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Restore & save horizontal scroll offset for this row
  React.useEffect(() => {
    if (!scrollContainerRef.current) return;
    const storageKey = `nc_row_scroll_${title.replace(/\s+/g, '_')}`;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        scrollContainerRef.current.scrollLeft = parseFloat(saved);
      }
    } catch {}

    let timeoutId: any;
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        try {
          if (scrollContainerRef.current) {
            sessionStorage.setItem(storageKey, String(scrollContainerRef.current.scrollLeft));
          }
        } catch {}
      }, 150);
    };

    const container = scrollContainerRef.current;
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      container.removeEventListener("scroll", handleScroll);
    };
  }, [title]);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.75;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="py-3 sm:py-4 px-4 sm:px-6 md:px-12 space-y-3 relative group/row select-none hover:z-40">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight font-display text-[#F0F0F0] flex items-center gap-2.5 flex-wrap">
          <span className={`w-1.5 h-5 rounded-full shrink-0 ${
            isAi
              ? "bg-gradient-to-b from-[#A2D5AB] to-[#39AEA9] shadow-[0_0_12px_rgba(162,213,171,0.8)]"
              : "bg-gradient-to-b from-[#A4C8E1] to-[#39AEA9] shadow-[0_0_12px_rgba(57,174,169,0.7)]"
          }`} />
          <span>{title}</span>
          {isAi && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold tracking-wider uppercase bg-gradient-to-r from-[#39AEA9]/20 via-[#A2D5AB]/20 to-[#39AEA9]/10 text-[#A2D5AB] border border-[#39AEA9]/40 shadow-[0_0_12px_rgba(57,174,169,0.25)]">
              <Sparkles className="w-3 h-3 text-[#A2D5AB] animate-pulse" />
              AI Curated
            </span>
          )}
        </h2>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => scroll("left")}
          className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full border border-white/[0.12] bg-[#0B131B]/80 hover:bg-[#39AEA9]/30 hover:border-[#39AEA9]/70 backdrop-blur-2xl backdrop-saturate-150 items-center justify-center text-[#F0F0F0] hover:text-white opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] transform-gpu transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-115 active:scale-90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.7)] hover:shadow-[0_0_24px_rgba(57,174,169,0.55)] cursor-pointer"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div
          ref={scrollContainerRef}
          style={{ contain: "layout style paint", WebkitOverflowScrolling: "touch" }}
          className="flex items-start gap-3 sm:gap-4 md:gap-5 overflow-x-auto py-3 scrollbar-hide snap-x scroll-smooth no-scrollbar px-1 overscroll-x-contain touch-pan-x transform-gpu"
        >
          {items.map((item, idx) => (
            <div
              key={`${item.id}-${item.season || 0}-${item.episode || 0}-${idx}`}
              className="snap-start shrink-0 relative hover:z-50 transform-gpu"
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
          type="button"
          onClick={() => scroll("right")}
          className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full border border-white/[0.12] bg-[#0B131B]/80 hover:bg-[#39AEA9]/30 hover:border-[#39AEA9]/70 backdrop-blur-2xl backdrop-saturate-150 items-center justify-center text-[#F0F0F0] hover:text-white opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] transform-gpu transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-115 active:scale-90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.7)] hover:shadow-[0_0_24px_rgba(57,174,169,0.55)] cursor-pointer"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default React.memo(MovieRow);