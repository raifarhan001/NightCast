import React from 'react';

const shimmer = "relative overflow-hidden bg-white/[0.03] rounded-xl before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/[0.04] before:to-transparent";

export function PosterSkeleton() {
  return (
    <div className={`w-44 md:w-56 shrink-0 aspect-[2/3] border border-glass-stroke ${shimmer}`} />
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative w-full h-[80vh] md:h-[90vh] bg-black border-b border-glass-stroke flex items-end p-10 md:p-16">
      <div className="space-y-5 max-w-xl w-full">
        <div className={`h-5 w-28 ${shimmer}`} />
        <div className={`h-20 w-3/4 ${shimmer}`} />
        <div className={`h-4 w-full ${shimmer}`} />
        <div className={`h-4 w-2/3 ${shimmer}`} />
        <div className="flex gap-4 pt-2">
          <div className={`h-14 w-36 rounded-full ${shimmer}`} />
          <div className={`h-14 w-32 rounded-full ${shimmer}`} />
        </div>
      </div>
    </div>
  );
}

export function MovieRowSkeleton() {
  return (
    <div className="px-6 md:px-10 py-8 space-y-5">
      <div className="space-y-2.5">
        <div className={`h-6 w-52 ${shimmer}`} />
        <div className={`h-3.5 w-28 ${shimmer}`} />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <PosterSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 space-y-10">
      <div className="max-w-2xl mx-auto text-center space-y-3">
        <div className={`h-12 w-56 mx-auto ${shimmer}`} />
        <div className={`h-4 w-80 mx-auto ${shimmer}`} />
      </div>
      <div className={`max-w-3xl mx-auto h-14 rounded-full ${shimmer}`} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] w-full rounded-xl overflow-hidden">
            <PosterSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailsSkeleton() {
  return (
    <div className="w-full min-h-screen bg-black pb-20 space-y-16">
      <div className={`w-full h-[60vh] md:h-[75vh] ${shimmer} rounded-none`} />
      <div className="max-w-7xl mx-auto px-6 md:px-10 -mt-40 md:-mt-64 relative z-10 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-5">
          <div className={`aspect-[2/3] w-full shadow-card border border-glass-stroke ${shimmer}`} />
          <div className={`h-12 w-full rounded-full ${shimmer}`} />
        </div>
        <div className="md:col-span-3 space-y-5">
          <div className={`h-20 w-3/4 ${shimmer}`} />
          <div className={`h-4 w-1/2 ${shimmer}`} />
          <div className="flex gap-3 pb-2 border-b border-glass-stroke">
            <div className={`h-5 w-20 ${shimmer}`} />
            <div className={`h-5 w-20 ${shimmer}`} />
            <div className={`h-5 w-20 ${shimmer}`} />
          </div>
          <div className="space-y-2">
            <div className={`h-4 w-full ${shimmer}`} />
            <div className={`h-4 w-full ${shimmer}`} />
            <div className={`h-4 w-2/3 ${shimmer}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CastSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 space-y-4">
      <div className={`h-6 w-28 ${shimmer}`} />
      <div className="flex gap-6 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2.5 w-24 shrink-0">
            <div className={`w-16 h-16 rounded-full ${shimmer}`} />
            <div className={`h-3 w-16 ${shimmer}`} />
            <div className={`h-2.5 w-12 ${shimmer}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
