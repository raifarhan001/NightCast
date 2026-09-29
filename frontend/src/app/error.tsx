'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected segment errors to console
    console.error('NightCast App Segment Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0B131B] text-[#F0F0F0] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-16 h-16 rounded-full bg-[#1B3A57]/60 border border-[#4A6E8D]/40 flex items-center justify-center text-[#A4C8E1] mb-6 backdrop-blur-xl shadow-[0_0_30px_rgba(164,200,225,0.2)]">
        <AlertTriangle className="w-8 h-8 text-[#A4C8E1]" />
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-[#F0F0F0] mb-3">
        Playback Interrupted
      </h1>

      <p className="text-sm text-[#4A6E8D] max-w-md mb-8 leading-relaxed">
        {error?.message && !error.message.includes('Minified React error')
          ? error.message
          : 'An unexpected playback or network error occurred while communicating with NightCast services.'}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#F0F0F0] hover:bg-[#A4C8E1] text-[#0B131B] text-xs font-sans font-bold shadow-[0_0_16px_rgba(240,240,240,0.3)] transition-all active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Try Again</span>
        </button>

        <Link
          href="/"
          className="inline-flex items-center px-6 py-2.5 rounded-full bg-[#1B3A57]/60 hover:bg-[#2C3E50]/70 border border-[#4A6E8D]/40 text-xs font-sans font-semibold text-[#F0F0F0] hover:text-white transition-all active:scale-95 cursor-pointer backdrop-blur-md"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
