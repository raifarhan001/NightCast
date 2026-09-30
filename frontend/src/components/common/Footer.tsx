"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-[#0B131B]/60 backdrop-blur-2xl backdrop-saturate-150 border-t border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] pt-14 pb-12 px-6 md:px-12 text-center relative z-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Nightcast Brand Mark */}
        <div className="flex flex-col items-center justify-center space-y-1.5">
          <Link href="/" className="inline-flex items-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] rounded-xl p-1">
            <div className="w-2.5 h-5 rounded-full bg-gradient-to-b from-[#A4C8E1] to-[#39AEA9] shadow-[0_0_12px_rgba(57,174,169,0.6)] group-hover:scale-105 transition-transform" />
            <span className="text-[#F0F0F0] font-extrabold text-2xl tracking-tight font-display">
              Night<span className="bg-gradient-to-r from-[#A4C8E1] to-[#39AEA9] bg-clip-text text-transparent">cast</span>
            </span>
          </Link>
          <p className="text-xs font-sans text-[#8FA8AD]">
            Next-generation cinema & series streaming
          </p>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-sans font-medium text-[#8FA8AD]">
          <Link href="/movies" className="hover:text-[#F0F0F0] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] rounded px-1.5 py-0.5">Movies</Link>
          <Link href="/shows" className="hover:text-[#F0F0F0] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] rounded px-1.5 py-0.5">TV Series</Link>
          <Link href="/search" className="hover:text-[#F0F0F0] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] rounded px-1.5 py-0.5">Discover</Link>
          <Link href="/profile" className="hover:text-[#F0F0F0] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] rounded px-1.5 py-0.5">Watchlist</Link>
        </div>

        {/* Technical Specification Chips & Copyright */}
        <div className="space-y-3 pt-3 border-t border-white/[0.08] text-xs font-sans text-[#8FA8AD]">
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] backdrop-blur-2xl text-[10px] font-sans font-semibold text-[#A4C8E1] border border-white/[0.12] shadow-sm">
              Cinema-Grade 4K
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] backdrop-blur-2xl text-[10px] font-sans font-medium text-[#F0F0F0]/80 border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
              Multi-Server Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] backdrop-blur-2xl text-[10px] font-sans font-medium text-[#F0F0F0]/80 border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
              TMDB Metadata
            </span>
          </div>
          <p className="text-xs text-[#8FA8AD]/90">
            Designed & Developed by{" "}
            <span className="font-semibold text-[#A4C8E1]">
              Rai Farhan
            </span>{" "}
            • © 2026 Nightcast. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}