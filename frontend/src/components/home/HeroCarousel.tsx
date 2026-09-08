"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Plus, Info, Star, Check } from "lucide-react";
import { MediaItem } from "../../lib/api";
import { ImageService } from "../../lib/ImageService";

interface HeroCarouselProps {
  items: MediaItem[];
}

function HeroCarousel({ items = [] }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [addedToWatchlist, setAddedToWatchlist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCurrentIndex(0);
  }, [items]);

  const nextSlide = useCallback(() => {
    if (!items || items.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items]);

  useEffect(() => {
    if (isPaused || !items || items.length <= 1) return;
    const interval = setInterval(nextSlide, 8000);
    return () => clearInterval(interval);
  }, [isPaused, items, nextSlide]);

  if (!items || items.length === 0) return null;

  const item = items[currentIndex] || items[0];
  const title = item.title || item.name || "OPPENHEIMER";
  const releaseYear = (item.release_date || item.first_air_date || "").split("-")[0] || "2024";
  const type = item.media_type || (item.first_air_date ? "tv" : "movie");
  const rating = item.vote_average ? item.vote_average.toFixed(1) : "8.4";
  const backdropUrl = ImageService.getBackdrop(item.backdrop_path, "original", title);

  const isTv = type === "tv";
  const ageRating = item.vote_average && item.vote_average > 7.5 ? "16+" : "13+";

  const toggleWatchlist = (e: React.MouseEvent, id: string | number) => {
    e.preventDefault();
    setAddedToWatchlist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div
      className="relative w-full h-[84vh] sm:h-[88vh] overflow-hidden bg-[#0A0F11] select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Featured Backdrop */}
      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 select-none transform-gpu will-change-transform"
        >
          <Image
            src={backdropUrl}
            alt={title}
            fill
            className="object-cover object-center lg:object-top opacity-90 brightness-[0.92]"
            priority
            placeholder="blur"
            blurDataURL={ImageService.getBlurHash()}
          />

          {/* Multi-Stage Scrim Vignettes */}
          {/* Top Header Scrim */}
          <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-[#0A0F11] via-[#0A0F11]/75 to-transparent z-10 pointer-events-none" />

          {/* Left Anamorphic Cinema Scrim */}
          <div className="absolute inset-y-0 left-0 w-full sm:w-4/5 md:w-3/5 bg-gradient-to-r from-[#0A0F11] via-[#0A0F11]/90 to-transparent z-15 pointer-events-none" />

          {/* Bottom Blend Scrim */}
          <div className="absolute bottom-0 inset-x-0 h-56 bg-gradient-to-t from-[#0A0F11] via-[#0A0F11]/85 to-transparent z-15 pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* Hero Content Suite */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`content-${item.id}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-12 sm:bottom-16 left-4 sm:left-8 md:left-14 z-20 max-w-3xl space-y-4 pointer-events-none pr-4 transform-gpu will-change-transform"
        >
          <div className="space-y-3.5 pointer-events-auto">
            {/* Metadata Ribbon */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="cinema-badge-blood">
                Premiere
              </span>
              <span className="cinema-badge-ash">
                {isTv ? "TV Series" : "Movie"}
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.1] text-[10px] font-sans font-semibold text-[#E5EFC1]">
                <Star className="w-2.5 h-2.5 fill-current text-[#A2D5AB]" />
                <span>IMDb {rating}</span>
              </div>
              <span className="text-xs font-sans text-[#8FA8AD]">{releaseYear}</span>
              <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-[#CBD5E1]">
                {ageRating}
              </span>
              <span className="text-[10px] font-sans px-2.5 py-0.5 rounded-full bg-[#39AEA9]/20 border border-[#39AEA9]/40 text-[#A2D5AB] font-semibold">
                4K UHD
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] font-display drop-shadow-[0_12px_24px_rgba(0,0,0,0.9)] max-w-3xl">
              {title}
            </h1>

            {/* Overview */}
            <p className="text-sm sm:text-base text-[#CBD5E1]/90 font-sans font-normal leading-relaxed line-clamp-2 sm:line-clamp-3 max-w-2xl drop-shadow">
              {item.overview || "Experience state-of-the-art streaming with full master audio and high definition fidelity."}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-3">
              {/* Primary Watch Button */}
              <Link
                href={`/watch/${type}/${item.id}`}
                className="cinema-btn-primary"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Play Now</span>
              </Link>

              {/* Add to Watchlist Action */}
              <button
                onClick={(e) => toggleWatchlist(e, item.id)}
                className="cinema-btn-secondary"
                title="Add to Watchlist"
                aria-label="Add to Watchlist"
              >
                {addedToWatchlist[item.id] ? (
                  <>
                    <Check className="w-4 h-4 text-[#A2D5AB]" />
                    <span>In Watchlist</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-white/80" />
                    <span>Watchlist</span>
                  </>
                )}
              </button>

              {/* Details Button */}
              <Link
                href={`/watch/${type}/${item.id}`}
                className="w-11 h-11 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] hover:bg-white/[0.15] hover:border-white/20 text-white/90 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                title="Details"
                aria-label="Details"
              >
                <Info className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Slide Indicators */}
      <div className="absolute bottom-6 sm:bottom-10 right-4 sm:right-8 md:right-14 z-20 flex items-center gap-2 pointer-events-auto">
        {items.slice(0, 7).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transform-gpu will-change-transform transition-all duration-300 cursor-pointer ${
              idx === currentIndex
                ? "w-8 bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB] shadow-[0_0_12px_rgba(57,174,169,0.6)]"
                : "w-2.5 bg-white/20 hover:bg-white/40"
            }`}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default React.memo(HeroCarousel);