import React from "react";

const shimmer = "relative overflow-hidden bg-white/[0.03] border border-white/5 rounded-2xl before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent";

export function PosterSkeleton() {
  return (
    <div className={`w-[155px] sm:w-[180px] md:w-[210px] shrink-0 aspect-[2/3] ${shimmer}`} />
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative w-full h-[70vh] md:h-[80vh] bg-[#030308] border-b border-white/5 flex items-end p-8 md:p-16">
      <div className="space-y-5 max-w-xl w-full">
        <div className={`h-5 w-32 ${shimmer}`} />
        <div className={`h-20 w-4/5 ${shimmer}`} />
        <div className={`h-4 w-full ${shimmer}`} />
        <div className={`h-4 w-2/3 ${shimmer}`} />
        <div className="flex gap-4 pt-3">
          <div className={`h-12 w-36 rounded-xl ${shimmer}`} />
          <div className={`h-12 w-32 rounded-xl ${shimmer}`} />
        </div>
      </div>
    </div>
  );
}

export function MovieRowSkeleton() {
  return (
    <div className="px-6 md:px-16 lg:px-20 py-8 space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-1 h-8 rounded-full ${shimmer}`} />
        <div className={`h-6 w-48 ${shimmer}`} />
      </div>
      <div className="flex gap-5 overflow-x-auto no-scrollbar py-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <PosterSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 space-y-12">
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <div className={`h-12 w-64 mx-auto ${shimmer}`} />
        <div className={`h-4 w-80 mx-auto ${shimmer}`} />
      </div>
      <div className={`max-w-2xl mx-auto h-16 rounded-full ${shimmer}`} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] w-full rounded-2xl overflow-hidden">
            <PosterSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailsSkeleton() {
  return (
    <div className="w-full min-h-screen bg-[#030308] pb-20 space-y-16">
      <div className={`w-full h-[65vh] md:h-[80vh] ${shimmer} rounded-none`} />
      <div className="max-w-7xl mx-auto px-6 md:px-12 -mt-48 md:-mt-72 relative z-10 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-5">
          <div className={`aspect-[2/3] w-full rounded-2xl ${shimmer}`} />
          <div className={`h-12 w-full rounded-xl ${shimmer}`} />
        </div>
        <div className="md:col-span-3 space-y-6">
          <div className={`h-16 w-3/4 ${shimmer}`} />
          <div className={`h-4 w-1/2 ${shimmer}`} />
          <div className="flex gap-4 pb-4 border-b border-white/10">
            <div className={`h-5 w-24 ${shimmer}`} />
            <div className={`h-5 w-24 ${shimmer}`} />
            <div className={`h-5 w-24 ${shimmer}`} />
          </div>
          <div className="space-y-3">
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
    <div className="max-w-7xl mx-auto px-6 md:px-12 space-y-4">
      <div className={`h-6 w-32 ${shimmer}`} />
      <div className="flex gap-6 overflow-x-auto no-scrollbar">
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

export function PlayerSkeleton() {
  return (
    <div className={`relative aspect-video w-full rounded-2xl overflow-hidden bg-[#000000] border border-white/10 flex flex-col items-center justify-center gap-4 ${shimmer}`}>
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
        <div className="absolute w-8 h-8 rounded-full bg-orange-500/20 blur-md animate-pulse" />
      </div>
      <div className="space-y-1.5 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-white/80 animate-pulse font-mono">
          Initializing Nightcast Stream...
        </p>
        <p className="text-[10px] text-white/40 font-medium">Connecting to primary high-speed CDN buffer</p>
      </div>
    </div>
  );
}