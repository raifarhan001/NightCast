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

export default function HeroCarousel({ items }: HeroCarouselProps) {
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
      className="relative w-full h-[82vh] sm:h-[86vh] overflow-hidden bg-[#0B1120] select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Prime Video Main Featured Backdrop Artwork with Hardware Accelerated Motion */}
      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
          className="absolute inset-0 select-none transform-gpu will-change-transform"
        >
          <Image
            src={backdropUrl}
            alt={title}
            fill
            className="object-cover object-center lg:object-top opacity-100 brightness-[1.02]"
            priority
            placeholder="blur"
            blurDataURL={ImageService.getBlurHash()}
          />

          {/* Prime Video Multi-stage Gradient Vignette Overlays */}
          {/* Top Navbar Dark Fade */}
          <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-[#0B1120] via-[#0B1120]/60 to-transparent z-10 pointer-events-none" />

          {/* Left Side Content Gradient Scrim (Amazon Prime Video signature left scrim) */}
          <div className="absolute inset-y-0 left-0 w-full sm:w-4/5 md:w-3/5 bg-gradient-to-r from-[#0B1120] via-[#0B1120]/90 to-transparent z-15 pointer-events-none" />

          {/* Bottom Blend Gradient */}
          <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/75 to-transparent z-15 pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* Prime Video Hero Content Suite with Hardware-Accelerated Staggered Motion */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`content-${item.id}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
          className="absolute bottom-12 sm:bottom-16 left-4 sm:left-6 md:left-12 z-20 max-w-2xl space-y-3.5 sm:space-y-4 pointer-events-none pr-4 transform-gpu will-change-transform"
        >
          <div className="space-y-3 sm:space-y-3.5 pointer-events-auto">
            {/* Prime Video Tag Ribbon */}
            <div className="flex items-center gap-2">
              <span className="prime-badge-cyan flex items-center gap-1 shadow-[0_0_10px_rgba(0,168,225,0.6)]">
                <span className="font-sans font-black lowercase tracking-tighter">prime</span>
                <span className="text-[9px] font-extrabold uppercase">INCLUDED WITH PRIME</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#192231] text-[#8197A4] border border-[#8197A4]/20 uppercase">
                {isTv ? "TV Series" : "Movie"}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.05] font-sans drop-shadow-2xl">
              {title}
            </h1>

            {/* Metadata Bar: IMDb score, Year, Age, 4K UHD, HDR */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-white/90 font-medium">
              {/* IMDb Rating Badge */}
              <div className="flex items-center gap-1 bg-[#E5B800] text-black font-extrabold px-1.5 py-0.5 rounded text-[11px] shadow-sm">
                <Star className="w-3 h-3 fill-current text-black" />
                <span>IMDb {rating}</span>
              </div>

              <span className="text-[#8197A4]">{releaseYear}</span>
              <span className="w-1 h-1 rounded-full bg-[#8197A4]/40" />

              {/* Maturity Rating Tag */}
              <span className="px-1.5 py-0.2 rounded border border-[#8197A4]/40 text-[10px] font-bold text-[#8197A4]">
                {ageRating}
              </span>

              <span className="w-1 h-1 rounded-full bg-[#8197A4]/40" />

              {/* Video Quality Badges */}
              <span className="px-1.5 py-0.2 rounded bg-[#192231] border border-[#8197A4]/30 text-[10px] font-bold text-[#00A8E1]">
                4K UHD
              </span>
              <span className="px-1.5 py-0.2 rounded bg-[#192231] border border-[#8197A4]/30 text-[10px] font-bold text-[#8197A4]">
                HDR
              </span>
              <span className="px-1.5 py-0.2 rounded bg-[#192231] border border-[#8197A4]/30 text-[10px] font-bold text-[#8197A4]">
                5.1
              </span>
            </div>

            {/* Overview */}
            <p className="text-xs sm:text-sm text-gray-300 font-normal line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-xl drop-shadow">
              {item.overview || "Stream high-definition movies and exclusive television series with Prime Video."}
            </p>

            {/* Prime Video CTA Buttons */}
            <div className="flex items-center gap-3 pt-2">
              {/* Watch Now Primary Pill */}
              <Link
                href={`/watch/${type}/${item.id}`}
                className="gtv-btn-primary inline-flex text-xs sm:text-sm px-6 py-3 shadow-[0_0_20px_rgba(0,168,225,0.5)] hover:shadow-[0_0_30px_rgba(0,168,225,0.8)]"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Watch Now</span>
              </Link>

              {/* Add to Watchlist Circle Button */}
              <button
                onClick={(e) => toggleWatchlist(e, item.id)}
                className="w-11 h-11 rounded-full bg-[#192231] hover:bg-[#232E42] border border-[#8197A4]/30 hover:border-[#00A8E1] hover:shadow-[0_0_15px_rgba(0,168,225,0.4)] text-white flex items-center justify-center transform-gpu will-change-transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-md group/btn cursor-pointer"
                title="Add to Watchlist"
                aria-label="Add to Watchlist"
              >
                {addedToWatchlist[item.id] ? (
                  <Check className="w-5 h-5 text-[#00A8E1]" />
                ) : (
                  <Plus className="w-5 h-5 text-white group-hover/btn:text-[#00A8E1] transition-colors" />
                )}
              </button>

              {/* Details / Trailer Circle Button */}
              <Link
                href={`/watch/${type}/${item.id}`}
                className="w-11 h-11 rounded-full bg-[#192231] hover:bg-[#232E42] border border-[#8197A4]/30 hover:border-[#00A8E1] hover:shadow-[0_0_15px_rgba(0,168,225,0.4)] text-white flex items-center justify-center transform-gpu will-change-transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-md group/btn cursor-pointer"
                title="Details & Episodes"
                aria-label="Details"
              >
                <Info className="w-5 h-5 text-white group-hover/btn:text-[#00A8E1] transition-colors" />
              </Link>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Prime Carousel Indicator Dots */}
      <div className="absolute bottom-6 sm:bottom-10 right-4 sm:right-6 md:right-12 z-20 flex items-center gap-2 pointer-events-auto">
        {items.slice(0, 7).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transform-gpu will-change-transform transition-all duration-200 ${
              idx === currentIndex
                ? "w-8 bg-[#00A8E1] shadow-[0_0_12px_rgba(0,168,225,0.8)] scale-105"
                : "w-2 bg-[#8197A4]/30 hover:bg-[#8197A4]/70"
            }`}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}