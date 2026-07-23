"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-[#090A0F] border-t border-white/10 pt-12 pb-8 px-6 md:px-12 select-none">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <Link href="/" className="font-extrabold text-lg text-white font-display uppercase tracking-tight">
              Nightcast
            </Link>
            <p className="text-xs text-white/50">Next-Generation Cinematic Streaming Experience.</p>
          </div>

          <div className="flex items-center gap-6 text-xs text-white/70 font-medium">
            <Link href="/" className="hover:text-white transition-colors">For you</Link>
            <Link href="/movies" className="hover:text-white transition-colors">Movies</Link>
            <Link href="/shows" className="hover:text-white transition-colors">Shows</Link>
            <Link href="/f1" className="hover:text-white transition-colors flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E10600]" />
              <span>F1 Live</span>
            </Link>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>© 2026 Nightcast. Designed & Developed by Farhan. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-white">
              TMDB API
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-white">
              4K HDR
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}