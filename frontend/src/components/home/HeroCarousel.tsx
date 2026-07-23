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
          key={`backdrop-${currentIndex}-${item.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 z-10"
        >
          <Image
            src={backdropUrl}
            alt={title}
            fill
            className="object-cover object-top opacity-90"
            priority
            placeholder="blur"
            blurDataURL={ImageService.getBlurHash()}
          />

          {/* Top Navbar Seamless Gradient Fade */}
          <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#050508] via-[#050508]/60 to-transparent z-15 pointer-events-none" />

          {/* Fiery & Dark Bottom & Side Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/70 to-transparent z-15" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050508] via-[#050508]/80 to-transparent z-15" />
        </motion.div>
      </AnimatePresence>

      {/* Hero Content Suite */}
      <div className="absolute bottom-20 left-6 md:left-12 z-20 max-w-2xl space-y-3.5 pointer-events-none">
        <div className="space-y-3 pointer-events-auto">
          {/* Director / Category Callout Tagline */}
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-400 drop-shadow-md">
            {calloutText}
          </p>

          {/* Massive Bold Title */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[0.95] font-display uppercase drop-shadow-2xl">
            {title}
          </h1>

          {/* Sub-meta Line */}
          <p className="text-xs font-semibold text-white/70 tracking-wide font-mono">
            {genreSubmeta}
          </p>

          {/* Synopsis Overview */}
          <p className="text-xs sm:text-sm text-white/85 font-normal line-clamp-3 leading-relaxed max-w-xl drop-shadow-md">
            {item.overview || "Stream high-definition cinema and exclusive television series directly on Nightcast."}
          </p>

          {/* High-Contrast Watch Now Pill Button */}
          <div className="pt-2">
            <Link
              href={`/watch/${type}/${item.id}`}
              className="gtv-btn-primary"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Watch Now</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Carousel Indicator Dots */}
      <div className="absolute bottom-12 right-6 md:right-12 z-20 flex items-center gap-2 pointer-events-auto">
        {items.slice(0, 7).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? "w-7 bg-white shadow-lg shadow-white/30" : "w-2.5 bg-white/40 hover:bg-white/70"
            }`}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}