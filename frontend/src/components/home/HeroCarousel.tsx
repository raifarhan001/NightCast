"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";
import { MediaItem } from "../../lib/api";
import { ImageService } from "../../lib/ImageService";

interface HeroCarouselProps {
  items: MediaItem[];
}

export default function HeroCarousel({ items }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
  }, [items]);

  const nextSlide = useCallback(() => {
    if (!items || items.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items]);

  useEffect(() => {
    if (isPaused || !items || items.length <= 1) return;
    const interval = setInterval(nextSlide, 7000);
    return () => clearInterval(interval);
  }, [isPaused, items, nextSlide]);

  if (!items || items.length === 0) return null;

  const item = items[currentIndex] || items[0];
  const title = item.title || item.name || "OPPENHEIMER";
  const releaseYear = (item.release_date || item.first_air_date || "").split("-")[0] || "2023";
  const type = item.media_type || (item.first_air_date ? "tv" : "movie");
  const backdropUrl = ImageService.getBackdrop(item.backdrop_path, "original", title);

  const calloutText = type === "movie" ? "FEATURED CINEMA RELEASE" : "EXCLUSIVE NIGHTCAST SHOW";
  const genreSubmeta = `${type === "tv" ? "TV Series" : "Movie"} • ${releaseYear} • 4K Ultra HD`;

  return (
    <div
      className="relative w-full h-[85vh] overflow-hidden bg-transparent select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Dynamic Ambient Backlight Glow Effect (Blurred, Scaled Underlay) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`ambient-${currentIndex}-${item.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.65 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
        >
          <Image
            src={backdropUrl}
            alt="ambient-blur"
            fill
            className="object-cover scale-150 filter blur-[100px] brightness-125 saturate-200"
            priority
          />
        </motion.div>
      </AnimatePresence>

      {/* Main Full-Screen Backdrop Artwork */}
      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-0 select-none"
        >
          <Image
            src={backdropUrl}
            alt={title}
            fill
            className="object-cover object-center sm:object-top opacity-100 brightness-[1.05]"
            priority
            placeholder="blur"
            blurDataURL={ImageService.getBlurHash()}
          />

          {/* Top Navbar Subtle Gradient Fade */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#011425]/90 via-[#011425]/30 to-transparent z-15 pointer-events-none" />

          {/* Left Text Scrim (Left-only so center and right posters are 100% visible) */}
          <div className="absolute inset-y-0 left-0 w-full sm:w-3/4 md:w-2/3 bg-gradient-to-r from-[#011425] via-[#011425]/75 to-transparent z-15 pointer-events-none" />

          {/* Smooth Bottom Blend */}
          <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#011425] via-[#011425]/60 to-transparent z-15 pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* Hero Content Suite */}
      <div className="absolute bottom-10 sm:bottom-16 left-4 sm:left-6 md:left-12 z-20 max-w-2xl space-y-2.5 sm:space-y-3.5 pointer-events-none pr-4">
        <div className="space-y-2 sm:space-y-3 pointer-events-auto">
          {/* Category Callout Tagline */}
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-[#5C7C89] drop-shadow-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1F4959]" />
            <span>{calloutText}</span>
          </p>

          {/* Responsive Bold Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.05] sm:leading-[0.95] font-display uppercase drop-shadow-2xl">
            {title}
          </h1>

          {/* Sub-meta Line */}
          <p className="text-[11px] sm:text-xs font-semibold text-[#5C7C89] tracking-wide font-mono">
            {genreSubmeta}
          </p>

          {/* Synopsis Overview (Compact 2 lines on mobile) */}
          <p className="text-xs sm:text-sm text-white/80 font-normal line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-xl drop-shadow-md">
            {item.overview || "Stream high-definition cinema and exclusive television series directly on Nightcast."}
          </p>

          {/* High-Contrast Watch Now Pill Button */}
          <div className="pt-1.5 sm:pt-2">
            <Link
              href={`/watch/${type}/${item.id}`}
              className="gtv-btn-primary inline-flex text-xs sm:text-sm px-5 py-2.5"
            >
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5" />
              <span>Watch Now</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Carousel Indicator Dots */}
      <div className="absolute bottom-6 sm:bottom-10 right-4 sm:right-6 md:right-12 z-20 flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        {items.slice(0, 7).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 ${
              idx === currentIndex
                ? "w-6 sm:w-8 bg-gradient-to-r from-[#1F4959] to-[#5C7C89] shadow-lg shadow-[#1F4959]/50 border border-[#5C7C89]/60"
                : "w-2 sm:w-2.5 bg-[#5C7C89]/30 hover:bg-[#5C7C89]/60"
            }`}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}