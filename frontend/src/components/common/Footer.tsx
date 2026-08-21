"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-[#0B1120] border-t border-[#8197A4]/15 pt-12 pb-10 px-6 md:px-12 select-none text-center">
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
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#00A8E1] font-semibold">
          <Link href="/" className="hover:underline hover:text-white transition-colors">Terms and Privacy Notice</Link>
          <Link href="/" className="hover:underline hover:text-white transition-colors">Send Us Feedback</Link>
          <Link href="/" className="hover:underline hover:text-white transition-colors">Help</Link>
          <Link href="/movies" className="hover:underline hover:text-white transition-colors">Movies</Link>
          <Link href="/shows" className="hover:underline hover:text-white transition-colors">TV Shows</Link>
        </div>

        {/* Copyright and TMDB Attribution */}
        <div className="space-y-2 pt-2 border-t border-[#8197A4]/10 text-[11px] text-[#8197A4]">
          <p>© 2026 Nightcast. All rights reserved.</p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="px-2.5 py-0.5 rounded bg-[#192231] text-[10px] font-bold text-[#00A8E1] border border-[#00A8E1]/30">
              PRIME VIDEO EXPERIENCE
            </span>
            <span className="px-2.5 py-0.5 rounded bg-[#192231] text-[10px] font-bold text-[#8197A4] border border-[#8197A4]/20">
              TMDB API
            </span>
            <span className="px-2.5 py-0.5 rounded bg-[#192231] text-[10px] font-bold text-[#8197A4] border border-[#8197A4]/20">
              4K UHD HDR
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}