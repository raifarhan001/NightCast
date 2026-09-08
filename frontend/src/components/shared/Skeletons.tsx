import React from "react";

const shimmer = "relative overflow-hidden bg-[#121A1D] border border-[#223136] rounded-2xl before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent";

export function PosterSkeleton() {
  return (
    <div className={`w-[220px] sm:w-[250px] md:w-[270px] shrink-0 aspect-video rounded-2xl ${shimmer}`} />
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative w-full h-[70vh] md:h-[80vh] bg-[#0A0F11] border-b border-[#223136] flex items-end p-8 md:p-16">
      <div className="space-y-5 max-w-xl w-full">
        <div className={`h-5 w-32 rounded-full ${shimmer}`} />
        <div className={`h-20 w-4/5 rounded-2xl ${shimmer}`} />
        <div className={`h-4 w-full rounded-full ${shimmer}`} />
        <div className={`h-4 w-2/3 rounded-full ${shimmer}`} />
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
    <div className="px-4 sm:px-6 md:px-12 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-[#39AEA9] to-[#A2D5AB]" />
        <div className={`h-6 w-48 rounded-full ${shimmer}`} />
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
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
      <div className={`max-w-2xl mx-auto h-12 rounded-xl ${shimmer}`} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-video w-full overflow-hidden">
            <PosterSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailsSkeleton() {
  return (
    <div className="w-full min-h-screen bg-[#0A0F11] pb-20 space-y-16">
      <div className={`w-full h-[65vh] md:h-[80vh] ${shimmer}`} />
      <div className="max-w-7xl mx-auto px-6 md:px-12 -mt-48 md:-mt-72 relative z-10 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-5">
          <div className={`aspect-[2/3] w-full ${shimmer}`} />
          <div className={`h-12 w-full ${shimmer}`} />
        </div>
        <div className="md:col-span-3 space-y-6">
          <div className={`h-16 w-3/4 ${shimmer}`} />
          <div className={`h-4 w-1/2 ${shimmer}`} />
          <div className="flex gap-4 pb-4 border-b border-[#223136]">
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
    <div className={`relative aspect-video w-full rounded-2xl overflow-hidden bg-[#0A0F11] border border-[#223136] flex flex-col items-center justify-center gap-4 ${shimmer}`}>
      <div className="relative flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#223136] border-t-[#39AEA9] animate-spin rounded-full" />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[#39AEA9] font-mono">
          INITIALIZING STREAM...
        </p>
        <p className="text-[10px] font-mono text-[#8FA8AD]">Connecting to high-speed stream server</p>
      </div>
    </div>
  );
}