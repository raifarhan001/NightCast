"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Search, User, X, ChevronDown, Film, Tv, Sparkles, Grid } from "lucide-react";
import ProfileSelectorModal from "../profile/ProfileSelectorModal";
import { apiFetch, MediaItem } from "../../lib/api";
import { ImageService } from "../../lib/ImageService";
import { soundFx } from "../../lib/soundEffects";

const CATEGORIES = [
  { id: "28", name: "Action & Adventure", href: "/search?genre=28" },
  { id: "35", name: "Comedy", href: "/search?genre=35" },
  { id: "18", name: "Drama", href: "/search?genre=18" },
  { id: "878", name: "Sci-Fi & Speculative", href: "/search?genre=878" },
  { id: "53", name: "Thriller & Suspense", href: "/search?genre=53" },
  { id: "27", name: "Horror", href: "/search?genre=27" },
  { id: "16", name: "Animation", href: "/search?genre=16" },
  { id: "99", name: "Documentary", href: "/search?genre=99" },
  { id: "10749", name: "Romance", href: "/search?genre=10749" },
];

function HeaderContent() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MediaItem[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentTab = searchParams.get("tab") || "";
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

  // Click outside listener for suggestions and categories dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isOutsideDesktop = searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node);
      const isOutsideMobile = mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node);
      if (isOutsideDesktop && isOutsideMobile) {
        setIsSuggestionsOpen(false);
      }

      if (categoriesRef.current && !categoriesRef.current.contains(event.target as Node)) {
        setIsCategoriesOpen(false);
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
        setIsCategoriesOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getActiveTab = () => {
    if (pathname === "/movies" || pathname.startsWith("/movie")) return "movies";
    if (pathname === "/shows" || pathname.startsWith("/tv")) return "shows";
    if (pathname === "/profile") return "mystuff";
    if (pathname === "/") {
      if (currentTab === "movies" || currentType === "movie") return "movies";
      if (currentTab === "shows" || currentType === "tv") return "shows";
      return "home";
    }
    if (pathname === "/search") {
      if (currentType === "movie") return "movies";
      if (currentType === "tv") return "shows";
    }
    return "home";
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
      <div className="absolute top-full left-0 right-0 mt-2 bg-[#121A1D]/95 backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-[0_20px_40px_-8px_rgba(0,0,0,0.9)] overflow-hidden z-50 py-1 divide-y divide-white/[0.06]">
        {isLoadingSuggestions ? (
          <div className="p-4 flex items-center justify-center gap-2.5 text-xs font-sans font-medium text-[#39AEA9]">
            <div className="w-3.5 h-3.5 border-2 border-[#39AEA9] border-t-transparent animate-spin rounded-full" />
            <span>Searching archive...</span>
          </div>
        ) : suggestions.length > 0 ? (
          suggestions.map((item, idx) => {
            const title = item.title || item.name || "Untitled";
            const date = item.release_date || item.first_air_date;
            const year = date ? new Date(date).getFullYear().toString() : "";
            const mediaType = item.media_type === "tv" ? "TV Series" : "Movie";
            const posterUrl = ImageService.getPoster(item.poster_path, "w500", title);

            return (
              <button
                key={`${item.id}-${idx}`}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-white/[0.06] transition-colors text-left group cursor-pointer"
              >
                <div className="relative w-8 h-11 rounded-lg overflow-hidden bg-[#0A0F11] shrink-0 border border-white/[0.08]">
                  <Image
                    src={posterUrl}
                    alt={title}
                    fill
                    sizes="32px"
                    className="object-cover rounded-lg group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h4 className="text-xs font-sans font-semibold text-[#F8FAFC] truncate group-hover:text-[#A2D5AB] transition-colors tracking-tight">
                    {title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] font-sans text-[#8FA8AD]">
                    {year && <span>{year}</span>}
                    {year && <span className="w-1 h-1 rounded-full bg-[#8FA8AD]/40" />}
                    <span className="px-1.5 py-0.2 bg-[#39AEA9]/15 text-[9px] font-semibold text-[#A2D5AB] rounded-full border border-[#39AEA9]/30">
                      {mediaType}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="p-4 text-center text-xs font-sans text-[#8FA8AD]">
            No matching titles found
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 apple-blur-nav transition-all duration-300 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 h-16 sm:h-17 flex items-center justify-between gap-3 sm:gap-6 min-w-0">
          {/* Brand Logo & Desktop Navigation */}
          <div className="flex items-center gap-4 sm:gap-6 md:gap-8 shrink-0">
            {/* Nightcast Turtle Brand Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 group cursor-pointer z-20 shrink-0"
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-6 rounded-full bg-gradient-to-b from-[#39AEA9] to-[#A2D5AB] shadow-[0_0_15px_rgba(57,174,169,0.6)] group-hover:scale-105 transition-transform duration-200" />
                <span className="text-white font-extrabold text-2xl tracking-tight font-display">
                  Night<span className="bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB] bg-clip-text text-transparent">cast</span>
                </span>
              </div>
            </Link>

            {/* Navigation Tabs (Desktop & Tablet) */}
            <nav className="hidden sm:flex items-center gap-1.5">
              <Link
                href="/"
                className={activeTab === "home" ? "cinema-tab-active" : "cinema-tab"}
              >
                Home
              </Link>
              <Link
                href="/movies"
                className={activeTab === "movies" ? "cinema-tab-active" : "cinema-tab"}
              >
                Movies
              </Link>
              <Link
                href="/shows"
                className={activeTab === "shows" ? "cinema-tab-active" : "cinema-tab"}
              >
                TV Series
              </Link>

              {/* Categories Dropdown */}
              <div ref={categoriesRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                  className={`cinema-tab flex items-center gap-1.5 cursor-pointer ${
                    isCategoriesOpen ? "text-white bg-white/[0.1]" : ""
                  }`}
                >
                  <span>Categories</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#8FA8AD] transition-transform duration-200 ${
                    isCategoriesOpen ? "rotate-180 text-[#39AEA9]" : ""
                  }`} />
                </button>

                {/* Categories Grid Menu */}
                {isCategoriesOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-[#121A1D]/95 backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-[0_20px_40px_-8px_rgba(0,0,0,0.9)] p-2.5 z-50 space-y-1">
                    <div className="px-3 py-1.5 text-[11px] font-sans font-semibold tracking-wide text-[#A2D5AB] border-b border-white/[0.06] mb-1 flex items-center gap-2">
                      <Grid className="w-3.5 h-3.5" />
                      <span>Genre Directory</span>
                    </div>
                    <div className="grid grid-cols-1 gap-0.5 max-h-72 overflow-y-auto no-scrollbar">
                      {CATEGORIES.map((cat, idx) => (
                        <Link
                          key={cat.id}
                          href={cat.href}
                          onClick={() => setIsCategoriesOpen(false)}
                          className="px-3 py-1.5 rounded-xl text-xs font-sans font-medium text-[#CBD5E1] hover:text-white hover:bg-white/[0.08] transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] text-[#8FA8AD] font-mono">{String(idx + 1).padStart(2, '0')}</span>
                            <span>{cat.name}</span>
                          </div>
                          <span className="text-[#39AEA9] opacity-0 group-hover:opacity-100 transition-opacity font-bold">→</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link
                href="/profile"
                className={activeTab === "mystuff" ? "cinema-tab-active" : "cinema-tab"}
              >
                Watchlist
              </Link>
            </nav>
          </div>

          {/* Right Action Icons: Search Bar & Profile */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Search Bar (Desktop) */}
            <div ref={searchContainerRef} className="relative hidden sm:block w-48 lg:w-64">
              <form onSubmit={handleSearchSubmit} className="relative">
                {isLoadingSuggestions ? (
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-[#39AEA9] border-t-transparent animate-spin rounded-full" />
                ) : (
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8FA8AD]" />
                )}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim().length > 2) setIsSuggestionsOpen(true);
                  }}
                  placeholder="Search titles..."
                  className="w-full h-9 pl-9 pr-8 bg-white/[0.06] border border-white/[0.1] rounded-full text-xs font-sans text-white placeholder-[#8FA8AD] focus:outline-none focus:border-[#39AEA9] focus:bg-[#121A1D] transition-all"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setIsSuggestionsOpen(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA8AD] hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <span className="text-[10px] font-sans font-medium text-[#8FA8AD] bg-white/[0.08] px-1.5 py-0.5 rounded border border-white/[0.08]">/</span>
                  </div>
                )}
              </form>

              {/* Desktop Live Suggestions Dropdown Overlay */}
              {renderSuggestionsDropdown()}
            </div>

            {/* Mobile Search Toggle */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="sm:hidden p-2 rounded-full bg-white/[0.06] border border-white/[0.1] text-[#8FA8AD] hover:text-white hover:border-[#39AEA9] transition-colors shrink-0 cursor-pointer"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Profile Avatar Trigger */}
            <button
              type="button"
              onClick={() => {
                soundFx.playTap();
                setIsProfileModalOpen(true);
              }}
              onMouseEnter={() => soundFx.playHover()}
              className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-[#CBD5E1] hover:text-white hover:border-[#39AEA9] hover:bg-white/[0.1] transition-all shadow-sm shrink-0 active:scale-95 group cursor-pointer"
              aria-label="User Profile"
            >
              <User className="w-4 h-4 text-[#8FA8AD] group-hover:text-[#39AEA9] transition-colors" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Strip */}
        <div className="sm:hidden px-3 pb-2 pt-1 overflow-x-auto no-scrollbar scrollbar-none flex items-center gap-1.5 border-t border-white/[0.06] bg-[#0A0F11]/90 backdrop-blur-xl">
          <Link
            href="/"
            className={`${activeTab === "home" ? "cinema-tab-active" : "cinema-tab"} text-[10px] px-3 py-1 shrink-0 rounded-full`}
          >
            Home
          </Link>
          <Link
            href="/movies"
            className={`${activeTab === "movies" ? "cinema-tab-active" : "cinema-tab"} text-[10px] px-3 py-1 shrink-0 rounded-full`}
          >
            Movies
          </Link>
          <Link
            href="/shows"
            className={`${activeTab === "shows" ? "cinema-tab-active" : "cinema-tab"} text-[10px] px-3 py-1 shrink-0 rounded-full`}
          >
            TV Series
          </Link>
          <Link
            href="/search"
            className="cinema-tab text-[10px] px-3 py-1 shrink-0 rounded-full"
          >
            Categories
          </Link>
          <Link
            href="/profile"
            className={`${activeTab === "mystuff" ? "cinema-tab-active" : "cinema-tab"} text-[10px] px-3 py-1 shrink-0 rounded-full`}
          >
            Watchlist
          </Link>
        </div>

        {/* Mobile Search Bar Dropdown */}
        {isSearchOpen && (
          <div ref={mobileSearchRef} className="sm:hidden px-4 pb-3 border-b border-white/[0.06] bg-[#0A0F11]/90 backdrop-blur-xl">
            <div className="relative">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8FA8AD]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim().length > 2) setIsSuggestionsOpen(true);
                  }}
                  placeholder="Search titles..."
                  className="w-full h-9 pl-10 pr-8 bg-white/[0.06] border border-white/[0.1] rounded-full text-xs font-sans text-white placeholder-[#8FA8AD] focus:outline-none focus:border-[#39AEA9] focus:bg-[#121A1D]"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setIsSuggestionsOpen(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA8AD] hover:text-white"
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0F11]/95 border-b border-[#223136] select-none h-16 flex items-center px-6">
        <Link href="/" className="text-white font-black text-xl font-display uppercase tracking-tight flex items-center gap-1.5">
          <span className="w-2 h-5 bg-gradient-to-b from-[#39AEA9] to-[#A2D5AB] rounded-full inline-block" />
          <span>Nightcast</span>
        </Link>
      </header>
    }>
      <HeaderContent />
    </Suspense>
  );
}