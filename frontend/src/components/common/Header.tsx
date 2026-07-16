"use client";
import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

function NavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navLinks = [
    { name: 'Home', path: '/', match: (p: string) => p === '/' },
    { name: 'Movies', path: '/search?type=movie', match: (p: string) => p.startsWith('/movie') || (p === '/search' && searchParams.get('type') === 'movie') },
    { name: 'TV Shows', path: '/search?type=tv', match: (p: string) => p.startsWith('/tv') || (p === '/search' && searchParams.get('type') === 'tv') },
  ];

  return (
    <>
      {navLinks.map((link) => {
        const isActive = link.match(pathname);
        return (
          <Link
            key={link.name}
            href={link.path}
            className={`group relative py-1.5 px-3.5 text-[11px] font-bold tracking-wider uppercase transition-colors duration-300 ${
              isActive ? 'text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {link.name}
            <span className={`absolute bottom-0 left-3.5 right-3.5 h-[2px] bg-[#00D2FF] transition-transform duration-300 origin-left ${
              isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
            }`} />
          </Link>
        );
      })}
    </>
  );
}

function NavLinksFallback() {
  return (
    <>
      {['Home', 'Movies', 'TV Shows'].map((name) => (
        <span key={name} className="px-4 py-2 text-[11px] font-semibold tracking-wider uppercase rounded-lg text-nexus-muted">
          {name}
        </span>
      ))}
    </>
  );
}

export default function Header() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-black/60 border-b border-glass-stroke transition-all duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs sm:text-sm font-bold tracking-[0.15em] text-white uppercase select-none group"
        >
          <span className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-cyan to-cyan-dark shadow-lg shadow-cyan/30 group-hover:shadow-cyan/50 transition-all duration-300 shrink-0">
            <span className="text-black text-xs font-black drop-shadow-sm">N</span>
          </span>
          <span className="tracking-[0.2em] hidden sm:inline">EXUS</span>
          <span className="text-zinc-500 font-medium tracking-[0.15em] hidden md:inline">PLAY</span>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[50vw] sm:max-w-none whitespace-nowrap">
          <Suspense fallback={<NavLinksFallback />}>
            <NavLinks />
          </Suspense>
        </nav>

        <Link
          href="/search"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 hover:bg-cyan-muted text-nexus-muted hover:text-cyan border border-glass-stroke hover:border-cyan/30 transition-all duration-300 active:scale-90 shrink-0"
        >
          <Search className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}
