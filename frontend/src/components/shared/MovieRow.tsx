"use client";

import React from "react";
import MovieCard from "./MovieCard";
import CarouselContainer from "./CarouselContainer";
import { MediaItem } from "../../lib/api";

interface MovieRowProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  onRemoveItem?: (item: any) => void;
}

function MovieRow({ title, subtitle, items, onRemoveItem }: MovieRowProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="content-auto py-3 sm:py-4 px-4 sm:px-6 md:px-12 space-y-3.5 relative group select-none hover:z-40">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight font-display text-[#F0F0F0] flex items-center gap-2.5">
          <span className="w-1.5 h-5 rounded-full bg-[#A4C8E1] shadow-[0_0_12px_rgba(164,200,225,0.6)] shrink-0" />
          <span>{title}</span>
        </h2>
        {subtitle && (
          <span className="text-xs font-sans font-medium text-[#4A6E8D] tracking-normal hidden sm:inline-block">
            {subtitle}
          </span>
        )}
      </div>

      <CarouselContainer posterType="landscape" itemCount={items.length} className="pt-4 pb-20 -mb-16">
        {items.map((item, idx) => (
          <div
            key={`${item.id}-${item.season || 0}-${item.episode || 0}-${idx}`}
            className="snap-start shrink-0 relative hover:z-50"
          >
            <MovieCard
              item={item}
              isFirst={idx === 0}
              isLast={idx === items.length - 1}
              onRemove={onRemoveItem ? () => onRemoveItem(item) : undefined}
            />
          </div>
        ))}
      </CarouselContainer>
    </div>
  );
}

export default React.memo(MovieRow);