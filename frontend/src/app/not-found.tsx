import React from 'react';
import Link from 'next/link';
import { Film } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center text-center p-6 select-none">
      <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white mb-6 backdrop-blur-2xl shadow-[0_0_40px_rgba(255,255,255,0.15)]">
        <Film className="w-10 h-10 text-white" />
      </div>
      
      <h1 className="text-6xl font-black text-white font-display tracking-tight mb-2">404</h1>
      <h2 className="text-2xl font-bold text-white mb-4">Scene Not Found</h2>
      <p className="text-sm text-white/60 max-w-md mb-8">
        The title or stream page you requested could not be located in the Apple TV+ library.
      </p>

      <Link
        href="/"
        className="apple-btn-primary"
      >
        Return to Home
      </Link>
    </div>
  );
}
