"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Star, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { MediaItem } from "../../lib/api";
import { ImageService } from "../../lib/ImageService";
import { soundFx } from "../../lib/soundEffects";

interface WidescreenRowProps {
  title: string;
  badge?: string;
  subtitle?: string;
  items: MediaItem[];
}

export default function WidescreenRow({ title, badge, subtitle, items = [] }: WidescreenRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  const handleScroll = (direction: "left" | "right") => {
    soundFx.playTap();
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const scrollAmount = clientWidth * 0.75;
    scrollRef.current.scrollTo({
      left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="w-full py-6 select-none relative group/row">
      {/* Header */}
      <div className="px-4 sm:px-8 md:px-14 flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-display font-bold text-white tracking-tight">
              {title}
            </h3>
            {badge && (
              <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-[#39AEA9]/20 text-[#A2D5AB] border border-[#39AEA9]/35">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-[#8FA8AD] font-sans mt-0.5">{subtitle}</p>}
        </div>

        {/* Carousel Navigation Buttons */}
        <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity duration-300">
          <button
            onClick={() => handleScroll("left")}
            className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.18] border border-white/[0.1] text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleScroll("right")}
            className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.18] border border-white/[0.1] text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={scrollRef}
        className="flex items-center gap-4 sm:gap-5 overflow-x-auto no-scrollbar scrollbar-none px-4 sm:px-8 md:px-14 snap-x snap-mandatory"
      >
        {items.map((item) => {
          const type = item.media_type || (item.first_air_date ? "tv" : "movie");
          const itemTitle = item.title || item.name || "Untitled";
          const backdrop = ImageService.getBackdrop(item.backdrop_path, "w780", itemTitle);
          const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
          const year = (item.release_date || item.first_air_date || "2024").slice(0, 4);

          return (
            <Link
              key={item.id}
              href={`/watch/${type}/${item.id}`}
              onClick={() => soundFx.playTap()}
              onMouseEnter={() => soundFx.playHover()}
              className="group relative w-[280px] sm:w-[340px] md:w-[380px] h-[170px] sm:h-[200px] md:h-[220px] shrink-0 rounded-2xl overflow-hidden bg-[#121A1D] border border-white/[0.08] hover:border-[#39AEA9]/60 hover:shadow-[0_16px_36px_rgba(0,0,0,0.85),0_0_24px_rgba(57,174,169,0.25)] transition-all duration-300 block cursor-pointer snap-start"
            >
              <Image
                src={backdrop}
                alt={itemTitle}
                fill
                sizes="380px"
                className="object-cover group-hover:scale-105 transition-transform duration-700 brightness-[0.85]"
              />

              {/* Scrim Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F11] via-[#0A0F11]/40 to-transparent" />

              {/* Top Badges */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/[0.1] text-white">
                  CINEMA 16:9
                </span>
                {rating && (
                  <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/[0.1] text-[#A2D5AB] flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    {rating}
                  </span>
                )}
              </div>

              {/* Play Button Icon on Hover */}
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-12 h-12 rounded-full bg-[#39AEA9] text-[#0A0F11] flex items-center justify-center shadow-[0_0_24px_rgba(57,174,169,0.8)] scale-90 group-hover:scale-100 transition-transform">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </div>

              {/* Bottom Content */}
              <div className="absolute bottom-3.5 left-3.5 right-3.5 z-10">
                <div className="flex items-center gap-2 text-[10px] text-[#CBD5E1] font-sans mb-1">
                  <span className="capitalize">{type}</span>
                  <span>•</span>
                  <span>{year}</span>
                  <span>•</span>
                  <span className="text-[#A2D5AB] font-semibold">4K Ultra HD</span>
                </div>
                <h4 className="text-sm sm:text-base font-display font-bold text-white truncate group-hover:text-[#A2D5AB] transition-colors">
                  {itemTitle}
                </h4>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
