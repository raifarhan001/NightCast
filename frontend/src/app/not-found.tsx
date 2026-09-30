import React from 'react';
import Link from 'next/link';
import { Film } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0B131B] flex flex-col items-center justify-center text-center p-6 select-none">
      <div className="w-20 h-20 rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.15] flex items-center justify-center text-[#A4C8E1] mb-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_10px_30px_rgba(0,0,0,0.8)]">
        <Film className="w-10 h-10 text-[#A4C8E1]" />
      </div>
      
      <h1 className="text-6xl font-black text-white font-display tracking-tight mb-2">404</h1>
      <h2 className="text-2xl font-bold text-white mb-4">Scene Not Found</h2>
      <p className="text-sm text-[#8FA8AD] max-w-md mb-8">
        The title or stream page you requested could not be located in the NightCast library.
      </p>

      <Link
        href="/"
        className="px-6 py-3 rounded-full bg-[#F0F0F0]/95 hover:bg-white text-[#0B131B] font-semibold text-xs tracking-wide backdrop-blur-xl border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_20px_rgba(255,255,255,0.25)] transition-all cursor-pointer active:scale-95"
      >
        Return to Home
      </Link>
    </div>
  );
}
