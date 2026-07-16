"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info, Star } from 'lucide-react';
import { MediaItem } from '../../lib/api';
import { ImageService } from '../../lib/ImageService';

interface HeroCarouselProps {
  items: MediaItem[];
}

export default function HeroCarousel({ items }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (isPaused || items.length <= 1) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [isPaused, items.length, nextSlide]);

  if (!items || items.length === 0) return null;

  const item = items[currentIndex];
  const title = item.title || item.name || 'Untitled';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
  const matchPercent = item.vote_average ? Math.round(item.vote_average * 10) : 0;
  const releaseYear = (item.release_date || item.first_air_date || '').split('-')[0] || 'N/A';
  const type = item.media_type || 'movie';
  const backdropUrl = ImageService.getBackdrop(item.backdrop_path, 'w1280', title);

  return (
    <div
      className="relative w-full h-[80vh] md:h-[90vh] flex items-end overflow-hidden bg-black border-b border-glass-stroke"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 z-0 select-none"
        >
          <Image
            src={backdropUrl}
            alt={title}
            fill
            priority
            placeholder="blur"
            blurDataURL={ImageService.getBlurHash()}
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-hero z-10" />
          <div className="absolute inset-0 bg-gradient-radial-cyan z-10" />
          <div className="absolute inset-0 bg-gradient-fade-right z-10" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-20 max-w-7xl mx-auto px-6 md:px-10 pb-20 md:pb-28 w-full">
        <motion.div
          key={currentIndex}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl space-y-5"
        >
          <div className="flex items-center gap-3 text-[11px] tracking-[0.15em] font-semibold uppercase">
            <span className="px-3 py-1 rounded-full bg-cyan-muted border border-cyan/20 text-cyan text-[10px]">
              {type === 'movie' ? 'Film' : 'Series'}
            </span>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="text-sm font-bold">{matchPercent}%</span>
              <span className="text-[9px] tracking-wider">Match</span>
            </div>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
              <span className="text-white font-semibold">{rating}</span>
            </div>
            <span className="text-white/20">|</span>
            <span className="text-zinc-500">{releaseYear}</span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl md:text-8xl font-black tracking-tight text-white leading-[0.95] text-glow">
            {title}
          </h1>

          {item.overview && (
            <p className="text-sm md:text-base text-zinc-400 font-light leading-relaxed line-clamp-3 max-w-xl">
              {item.overview}
            </p>
          )}

          <div className="flex flex-wrap gap-4 pt-3">
            <Link
              href={`/watch/${type}/${item.id}`}
              className="group relative flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-bold text-sm tracking-wide transition-all duration-300 hover:shadow-glow-cyan-lg active:scale-[0.97] overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-cyan to-cyan-dark opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Play className="relative w-4 h-4 fill-black group-hover:fill-white transition-colors duration-300" />
              <span className="relative">Watch Now</span>
            </Link>

            <Link
              href={`/${type}/${item.id}`}
              className="group flex items-center gap-2.5 px-7 py-4 rounded-full border border-glass-stroke bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md text-white font-semibold text-sm tracking-wide transition-all duration-300 active:scale-[0.97] hover:border-cyan/30 hover:shadow-glow-cyan-sm"
            >
              <Info className="w-4 h-4 text-cyan group-hover:text-cyan transition-colors" />
              <span>Details</span>
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        {items.slice(0, 6).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className="group relative"
          >
            <div
              className={`rounded-full transition-all duration-500 ${
                idx === currentIndex
                  ? 'w-10 h-1.5 bg-cyan shadow-glow-cyan-sm'
                  : 'w-1.5 h-1.5 bg-zinc-600 group-hover:bg-zinc-400'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
