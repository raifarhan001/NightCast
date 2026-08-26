"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-[#050811] border-t border-white/10 pt-14 pb-12 px-6 md:px-12 select-none text-center relative z-10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Nightcast Branded Logo Footer Header */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <Link href="/" className="inline-flex flex-col items-center">
            <span className="text-white font-black text-2xl tracking-tight uppercase font-display">
              Nightcast
            </span>
            <svg
              className="w-24 h-3 text-[#00A8E1] -mt-1"
              viewBox="0 0 100 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M 5 5 Q 50 22 92 6"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M 86 2 L 95 7 L 90 14"
                fill="currentColor"
              />
            </svg>
          </Link>
        </div>

        {/* Footer Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#00A8E1] font-bold">
          <Link href="/" className="hover:underline hover:text-white transition-colors">Terms and Privacy Notice</Link>
          <Link href="/" className="hover:underline hover:text-white transition-colors">Send Us Feedback</Link>
          <Link href="/" className="hover:underline hover:text-white transition-colors">Help</Link>
          <Link href="/movies" className="hover:underline hover:text-white transition-colors">Movies</Link>
          <Link href="/shows" className="hover:underline hover:text-white transition-colors">TV Shows</Link>
        </div>

        {/* Copyright and TMDB Attribution */}
        <div className="space-y-3 pt-3 border-t border-white/10 text-[11px] text-[#8197A4]">
          <p>© 2026 Nightcast. All rights reserved. Grounded in Apple HIG Principles.</p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="px-3 py-1 rounded-md bg-[#00A8E1]/20 backdrop-blur-md text-[10px] font-extrabold text-[#00D2FF] border border-[#00A8E1]/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)]">
              APPLE HIG DESIGN
            </span>
            <span className="px-3 py-1 rounded-md bg-[#141C2E]/80 backdrop-blur-md text-[10px] font-bold text-[#8197A4] border border-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
              TMDB API
            </span>
            <span className="px-3 py-1 rounded-md bg-[#141C2E]/80 backdrop-blur-md text-[10px] font-bold text-[#8197A4] border border-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
              4K UHD HDR
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}