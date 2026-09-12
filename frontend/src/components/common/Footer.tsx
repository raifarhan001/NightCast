"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-[#0B131B] border-t border-[#4A6E8D]/25 pt-14 pb-12 px-6 md:px-12 select-none text-center relative z-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Nightcast Brand Mark */}
        <div className="flex flex-col items-center justify-center space-y-1.5">
          <Link href="/" className="inline-flex items-center gap-2 group cursor-pointer">
            <div className="w-2.5 h-5 rounded-full bg-gradient-to-b from-[#A4C8E1] to-[#4A6E8D] shadow-[0_0_12px_rgba(164,200,225,0.6)] group-hover:scale-105 transition-transform" />
            <span className="text-[#F0F0F0] font-extrabold text-2xl tracking-tight font-display">
              Night<span className="bg-gradient-to-r from-[#A4C8E1] to-[#4A6E8D] bg-clip-text text-transparent">cast</span>
            </span>
          </Link>
          <p className="text-xs font-sans text-[#4A6E8D]">
            Next-generation cinema & series streaming
          </p>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-sans font-medium text-[#4A6E8D]">
          <Link href="/movies" className="hover:text-[#A4C8E1] transition-colors">Movies</Link>
          <Link href="/shows" className="hover:text-[#A4C8E1] transition-colors">TV Series</Link>
          <Link href="/search" className="hover:text-[#A4C8E1] transition-colors">Discover</Link>
          <Link href="/profile" className="hover:text-[#A4C8E1] transition-colors">Watchlist</Link>
        </div>

        {/* Technical Specification Chips & Copyright */}
        <div className="space-y-3 pt-3 border-t border-[#4A6E8D]/20 text-xs font-sans text-[#4A6E8D]">
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#1B3A57]/60 text-[10px] font-sans font-semibold text-[#A4C8E1] border border-[#4A6E8D]/40 shadow-sm">
              Cinema-Grade 4K
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#1B3A57]/30 text-[10px] font-sans font-medium text-[#F0F0F0]/80 border border-[#4A6E8D]/25">
              Multi-Server Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#1B3A57]/30 text-[10px] font-sans font-medium text-[#F0F0F0]/80 border border-[#4A6E8D]/25">
              TMDB Metadata
            </span>
          </div>
          <p className="text-xs text-[#4A6E8D]/90">
            Designed & Developed by{" "}
            <span className="font-semibold text-[#A4C8E1] hover:text-[#F0F0F0] transition-colors">
              Rai Farhan
            </span>{" "}
            • © 2026 Nightcast. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}