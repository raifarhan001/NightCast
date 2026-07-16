"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface MovieCardProps {
  item: {
    id: string | number;
    title?: string;
    name?: string;
    poster_path?: string | null;
    vote_average?: number;
    media_type?: string;
    release_date?: string;
    first_air_date?: string;
  };
}

export default function MovieCard({ item }: MovieCardProps) {
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
  const title = item.title || item.name || "Untitled";
  const posterUrl = item.poster_path
    ? (item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w342${item.poster_path}`)
    : null;

  return (
    <Link
      href={`/watch/${type}/${item.id}`}
      className="group block relative flex-shrink-0 w-[130px] sm:w-[160px] md:w-[190px] aspect-[2/3] rounded-2xl overflow-hidden bg-nexus-card border border-glass-stroke transition-all duration-400 ease-out-expo hover:scale-[1.03] hover:shadow-card-hover hover:border-cyan/20 transform-gpu will-change-transform"
    >
      {posterUrl ? (
        <Image
          alt={title}
          className="object-cover transition-all duration-500 group-hover:scale-110"
          fill
          sizes="(max-width: 640px) 130px, (max-width: 768px) 160px, 190px"
          src={posterUrl}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-nexus-dim text-[10px] text-center p-3 bg-gradient-to-br from-nexus-card to-nexus-surface">
          <span className="font-semibold tracking-wider uppercase">{title}</span>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

      <div className="absolute top-2 left-2 z-10">
        <span className="px-1 sm:px-2 py-0.5 rounded-md bg-gradient-to-r from-red-600/90 to-orange-600/90 text-[7px] sm:text-[8px] font-black tracking-[0.15em] text-white shadow-lg backdrop-blur-sm uppercase">
          Dual Audio
        </span>
      </div>

      {rating && (
        <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/5">
          <span className="text-[9px] font-bold text-yellow-400">★ {rating}</span>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-10 p-3.5 bg-gradient-to-t from-black via-black/80 to-transparent translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-400 ease-out-expo">
        <h4 className="text-white text-xs font-bold truncate mb-1.5">{title}</h4>
        <div className="flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-wider font-semibold text-cyan">{type}</span>
        </div>
      </div>
    </Link>
  );
}
