import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t border-glass-stroke bg-nexus-darker/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2 select-none">
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-cyan to-cyan-dark shadow-sm">
            <span className="text-black text-[10px] font-black">N</span>
          </span>
          <span className="text-xs font-bold tracking-[0.15em] text-white/80 uppercase">EXUS PLAY</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-wider text-zinc-300">
              NEXUS Core Online
            </span>
          </div>
          <span className="text-nexus-dim hidden sm:inline">|</span>
          <span className="text-[#F5F5F7] font-mono tracking-widest text-[11px] hover:text-[#00D2FF] transition-colors duration-300 cursor-default">
            CRAFTED BY RAI FARHAN
          </span>
        </div>

        <div className="text-[10px] text-nexus-dim font-medium">
          &copy; 2026 NEXUS Platforms
        </div>
      </div>
    </footer>
  );
}
