"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-[#0A0F11] border-t border-white/[0.08] pt-14 pb-12 px-6 md:px-12 select-none text-center relative z-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Nightcast Brand Mark */}
        <div className="flex flex-col items-center justify-center space-y-1.5">
          <Link href="/" className="inline-flex items-center gap-2 group cursor-pointer">
            <div className="w-2.5 h-5 rounded-full bg-gradient-to-b from-[#39AEA9] to-[#A2D5AB] shadow-[0_0_12px_rgba(57,174,169,0.6)] group-hover:scale-105 transition-transform" />
            <span className="text-white font-extrabold text-2xl tracking-tight font-display">
              Night<span className="bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB] bg-clip-text text-transparent">cast</span>
            </span>
          </Link>
          <p className="text-xs font-sans text-[#8FA8AD]">
            Next-generation cinema & series streaming
          </p>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-sans font-medium text-[#8FA8AD]">
          <Link href="/movies" className="hover:text-white transition-colors">Movies</Link>
          <Link href="/shows" className="hover:text-white transition-colors">TV Series</Link>
          <Link href="/search" className="hover:text-white transition-colors">Discover</Link>
          <Link href="/profile" className="hover:text-white transition-colors">Watchlist</Link>
        </div>

        {/* Technical Specification Chips & Copyright */}
        <div className="space-y-3 pt-3 border-t border-white/[0.06] text-xs font-sans text-[#8FA8AD]">
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#39AEA9]/15 to-[#A2D5AB]/15 text-[10px] font-sans font-semibold text-[#A2D5AB] border border-[#39AEA9]/30">
              Cinema-Grade 4K
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] text-[10px] font-sans font-medium text-[#CBD5E1] border border-white/[0.08]">
              Multi-Server Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] text-[10px] font-sans font-medium text-[#CBD5E1] border border-white/[0.08]">
              TMDB Metadata
            </span>
          </div>
          <p className="text-xs text-[#8FA8AD]/80">
            Designed & Developed by{" "}
            <span className="font-semibold text-[#A2D5AB] hover:text-[#39AEA9] transition-colors">
              Rai Farhan
            </span>{" "}
            • © 2026 Nightcast. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}