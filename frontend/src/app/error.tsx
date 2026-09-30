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
      <div className="w-16 h-16 rounded-3xl bg-white/[0.04] border border-white/[0.15] flex items-center justify-center text-[#A4C8E1] mb-6 backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_10px_30px_rgba(0,0,0,0.8)]">
        <AlertTriangle className="w-8 h-8 text-[#A4C8E1]" />
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-[#F0F0F0] mb-3">
        Playback Interrupted
      </h1>

      <p className="text-sm text-[#8FA8AD] max-w-md mb-8 leading-relaxed">
        {error?.message && !error.message.includes('Minified React error')
          ? error.message
          : 'An unexpected playback or network error occurred while communicating with NightCast services.'}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#F0F0F0]/95 hover:bg-white text-[#0B131B] text-xs font-sans font-bold backdrop-blur-xl border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_20px_rgba(255,255,255,0.2)] transition-all active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Try Again</span>
        </button>

        <Link
          href="/"
          className="inline-flex items-center px-6 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.15] text-xs font-sans font-semibold text-[#F0F0F0] hover:text-white transition-all active:scale-95 cursor-pointer backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
