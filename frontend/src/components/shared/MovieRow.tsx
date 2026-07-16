'use client';

import React, { useRef } from 'react';
import MovieCard from './MovieCard';
import { MediaItem } from '../../lib/api';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface MovieRowProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  isAiCurated?: boolean;
}

export default function MovieRow({ title, subtitle, items, isAiCurated }: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollContainerRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section ref={rowRef} className="relative px-6 md:px-10 py-8 group">
      <div className="flex items-start gap-3 mb-6">
        <div className={`w-1 h-9 rounded-full mt-0.5 shrink-0 transition-all duration-300 ${
          isAiCurated
            ? 'bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
            : 'bg-cyan shadow-glow-cyan-sm'
        }`} />
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight text-white leading-none">
              {title}
            </h2>
            {isAiCurated && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[7px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
                <Sparkles className="w-2.5 h-2.5 fill-current" />
                <span>AI</span>
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[10px] text-nexus-muted font-semibold tracking-[0.15em] uppercase mt-1.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-glass-stroke bg-nexus-darker/80 backdrop-blur-xl flex items-center justify-center text-zinc-400 opacity-0 group-hover:opacity-100 transition-all duration-400 ease-out-expo hover:bg-nexus-card hover:border-cyan/30 hover:text-cyan hover:scale-105 active:scale-95 focus:outline-none"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1"
        >
          {items.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="snap-start">
              <MovieCard item={item} />
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute -right-1 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-glass-stroke bg-nexus-darker/80 backdrop-blur-xl flex items-center justify-center text-zinc-400 opacity-0 group-hover:opacity-100 transition-all duration-400 ease-out-expo hover:bg-nexus-card hover:border-cyan/30 hover:text-cyan hover:scale-105 active:scale-95 focus:outline-none"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}
