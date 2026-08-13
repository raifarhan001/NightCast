"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Search, User, X } from "lucide-react";
import ProfileSelectorModal from "../profile/ProfileSelectorModal";
import { apiFetch, MediaItem } from "../../lib/api";
import { ImageService } from "../../lib/ImageService";

function HeaderContent() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MediaItem[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentTab = searchParams.get("tab") || "foryou";
  const currentType = searchParams.get("type") || "";

  // Debounce search query for auto-suggestions
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length <= 2) {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      setIsLoadingSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    setIsSuggestionsOpen(true);

    const timer = setTimeout(async () => {
      try {
        const results = await apiFetch(`/api/tmdb/search?query=${encodeURIComponent(trimmed)}&media_type=multi`);
        if (Array.isArray(results)) {
          setSuggestions(results.slice(0, 6));
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Suggestions fetch error", err);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener to dismiss suggestions overlay
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isOutsideDesktop = searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node);
      const isOutsideMobile = mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node);
      if (isOutsideDesktop && isOutsideMobile) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSuggestionsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getActiveTab = () => {
    if (pathname === "/f1") return "f1";
    if (pathname === "/movies" || pathname.startsWith("/movie")) return "movies";
    if (pathname === "/shows" || pathname.startsWith("/tv")) return "shows";
    if (pathname === "/") {
      if (currentTab === "movies" || currentType === "movie") return "movies";
      if (currentTab === "shows" || currentType === "tv") return "shows";
      return "foryou";
    }
    if (pathname === "/search") {
      if (currentType === "movie") return "movies";
      if (currentType === "tv") return "shows";
    }
    return "foryou";
  };

  const activeTab = getActiveTab();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSuggestionsOpen(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    }
  };

  const handleSelectSuggestion = (item: MediaItem) => {
    const mediaType = item.media_type || (item.title ? "movie" : "tv");
    router.push(`/watch/${mediaType}/${item.id}`);
    setIsSuggestionsOpen(false);
    setIsSearchOpen(false);
  };

  const renderSuggestionsDropdown = () => {
    if (!isSuggestionsOpen) return null;
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-[#081E30]/95 backdrop-blur-xl border border-[#5C7C89]/30 rounded-2xl shadow-2xl overflow-hidden z-50 py-2 divide-y divide-[#5C7C89]/10">
        {isLoadingSuggestions ? (
          <div className="p-4 flex items-center justify-center gap-2.5 text-xs font-bold text-[#5C7C89]">
            <div className="w-4 h-4 rounded-full border-2 border-[#5C7C89] border-t-transparent animate-spin" />
            <span>Searching Nightcast...</span>
          </div>
        ) : suggestions.length > 0 ? (
          suggestions.map((item, idx) => {
            const title = item.title || item.name || "Untitled";
            const date = item.release_date || item.first_air_date;
            const year = date ? new Date(date).getFullYear().toString() : "";
            const mediaType = item.media_type === "tv" ? "TV" : "Movie";
            const posterUrl = ImageService.getPoster(item.poster_path, "w500", title);

            return (
              <button
                key={`${item.id}-${idx}`}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[#1F4959]/30 transition-colors text-left group cursor-pointer"
              >
                <div className="relative w-9 h-12 rounded-lg overflow-hidden bg-[#011425] shrink-0 border border-[#5C7C89]/25">
                  <Image
                    src={posterUrl}
                    alt={title}
                    fill
                    sizes="36px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-[#5C7C89] transition-colors">
                    {title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-[#5C7C89] font-medium">
                    {year && <span>{year}</span>}
                    {year && <span className="w-1 h-1 rounded-full bg-[#5C7C89]/40" />}
                    <span className="px-1.5 py-0.2 rounded bg-[#1F4959]/40 text-[9px] font-bold text-white uppercase border border-[#5C7C89]/20">
                      {mediaType}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="p-4 text-center text-xs font-bold text-[#5C7C89]">
            No matches found
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-[#011425]/95 via-[#011425]/85 to-transparent backdrop-blur-md transition-all duration-300 border-b border-[#5C7C89]/15 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          {/* Brand Logo & Integrated Desktop Search */}
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <Link
              href="/"
              className="text-white font-extrabold text-lg sm:text-xl tracking-tight font-display uppercase hover:text-[#5C7C89] transition-colors shrink-0"
            >
              Nightcast
            </Link>

            {/* Ocean Integrated Pill Search Input with Live Suggestions (Desktop) */}
            <div ref={searchContainerRef} className="relative hidden sm:block w-48 md:w-64">
              <form onSubmit={handleSearchSubmit} className="relative">
                {isLoadingSuggestions ? (
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#5C7C89] border-t-transparent animate-spin" />
                ) : (
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C7C89]" />
                )}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim().length > 2) setIsSuggestionsOpen(true);
                  }}
                  placeholder="Search..."
                  className="w-full h-9 pl-10 pr-8 bg-[#081E30]/70 border border-[#5C7C89]/30 rounded-full text-xs text-white placeholder-[#5C7C89] focus:outline-none focus:bg-[#0D2A42] focus:border-[#5C7C89] transition-all font-medium shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setIsSuggestionsOpen(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C7C89] hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>

              {/* Desktop Live Suggestions Dropdown Overlay */}
              {renderSuggestionsDropdown()}
            </div>
          </div>

          {/* Center Navigation Capsule Tabs (Desktop) */}
          <nav className="hidden sm:flex items-center gap-1 sm:gap-1.5 bg-[#081E30]/60 border border-[#5C7C89]/25 p-1 rounded-full shadow-inner">
            <Link
              href="/"
              className={`${activeTab === "foryou" ? "gtv-tab-pill-active" : "gtv-tab-pill"} shrink-0 whitespace-nowrap`}
            >
              For you
            </Link>
            <Link
              href="/movies"
              className={`${activeTab === "movies" ? "gtv-tab-pill-active" : "gtv-tab-pill"} shrink-0 whitespace-nowrap`}
            >
              Movies
            </Link>
            <Link
              href="/shows"
              className={`${activeTab === "shows" ? "gtv-tab-pill-active" : "gtv-tab-pill"} shrink-0 whitespace-nowrap`}
            >
              Shows
            </Link>
            <Link
              href="/f1"
              className={`${activeTab === "f1" ? "gtv-tab-pill-active flex items-center gap-1.5" : "gtv-tab-pill flex items-center gap-1.5"} shrink-0 whitespace-nowrap`}
            >
              <span className="w-2 h-2 rounded-full bg-[#E10600] animate-ping shrink-0" />
              <span>F1 Live</span>
            </Link>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="sm:hidden p-2 rounded-full hover:bg-[#1F4959]/40 text-[#5C7C89] hover:text-white transition-colors shrink-0"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Profile Avatar Button */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#081E30] border border-[#5C7C89]/40 flex items-center justify-center text-white hover:border-[#5C7C89] hover:bg-[#1F4959]/50 transition-all shadow-md shrink-0 active:scale-95"
              aria-label="User Profile"
            >
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#5C7C89] group-hover:text-white" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Strip (Always visible on mobile with horizontal scroll) */}
        <div className="sm:hidden px-4 pb-2 pt-0.5 overflow-x-auto no-scrollbar scrollbar-none flex items-center gap-1.5">
          <Link
            href="/"
            className={`${activeTab === "foryou" ? "gtv-tab-pill-active text-[11px] px-3 py-1" : "gtv-tab-pill text-[11px] px-3 py-1"} shrink-0`}
          >
            For you
          </Link>
          <Link
            href="/movies"
            className={`${activeTab === "movies" ? "gtv-tab-pill-active text-[11px] px-3 py-1" : "gtv-tab-pill text-[11px] px-3 py-1"} shrink-0`}
          >
            Movies
          </Link>
          <Link
            href="/shows"
            className={`${activeTab === "shows" ? "gtv-tab-pill-active text-[11px] px-3 py-1" : "gtv-tab-pill text-[11px] px-3 py-1"} shrink-0`}
          >
            Shows
          </Link>
          <Link
            href="/f1"
            className={`${activeTab === "f1" ? "gtv-tab-pill-active text-[11px] px-3 py-1 flex items-center gap-1" : "gtv-tab-pill text-[11px] px-3 py-1 flex items-center gap-1"} shrink-0`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#E10600] animate-ping shrink-0" />
            <span>F1 Live</span>
          </Link>
        </div>

        {/* Mobile Search Bar Dropdown */}
        {isSearchOpen && (
          <div ref={mobileSearchRef} className="sm:hidden px-4 pb-3 border-b border-[#5C7C89]/20 bg-[#011425]/98">
            <div className="relative">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C7C89]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim().length > 2) setIsSuggestionsOpen(true);
                  }}
                  placeholder="Search movies, shows..."
                  className="w-full h-10 pl-11 pr-8 bg-[#081E30] border border-[#5C7C89]/30 rounded-full text-xs text-white placeholder-[#5C7C89] focus:outline-none focus:border-[#5C7C89]"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setIsSuggestionsOpen(false);
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5C7C89] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </form>

              {/* Mobile Live Suggestions Dropdown Overlay */}
              {renderSuggestionsDropdown()}
            </div>
          </div>
        )}
      </header>

      {/* Profile Selector Modal */}
      <ProfileSelectorModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
}

export default function Header() {
  return (
    <Suspense fallback={
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#011425]/95 border-b border-[#5C7C89]/15 select-none h-16 flex items-center px-6">
        <Link href="/" className="text-white font-extrabold text-xl font-display uppercase">Nightcast</Link>
      </header>
    }>
      <HeaderContent />
    </Suspense>
  );
}