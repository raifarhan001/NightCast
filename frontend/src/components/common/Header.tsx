"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Search, User, X, ChevronDown, Film, Tv, Sparkles, Grid } from "lucide-react";
import ProfileSelectorModal from "../profile/ProfileSelectorModal";
import { apiFetch, MediaItem } from "../../lib/api";
import { ImageService } from "../../lib/ImageService";

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
      <div className="absolute top-full left-0 right-0 mt-2 bg-[#192231]/98 backdrop-blur-xl border border-[#00A8E1]/30 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.9)] overflow-hidden z-50 py-2 divide-y divide-[#8197A4]/15">
        {isLoadingSuggestions ? (
          <div className="p-4 flex items-center justify-center gap-2.5 text-xs font-bold text-[#00A8E1]">
            <div className="w-4 h-4 rounded-full border-2 border-[#00A8E1] border-t-transparent animate-spin" />
            <span>Searching Nightcast...</span>
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
                className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[#232E42] transition-colors text-left group cursor-pointer"
              >
                <div className="relative w-9 h-12 rounded-md overflow-hidden bg-[#0B1120] shrink-0 border border-[#8197A4]/20">
                  <Image
                    src={posterUrl}
                    alt={title}
                    fill
                    sizes="36px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-[#00A8E1] transition-colors">
                    {title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-[#8197A4] font-medium">
                    {year && <span>{year}</span>}
                    {year && <span className="w-1 h-1 rounded-full bg-[#8197A4]/40" />}
                    <span className="px-1.5 py-0.2 rounded bg-[#00A8E1]/20 text-[9px] font-bold text-[#00A8E1] uppercase border border-[#00A8E1]/30">
                      {mediaType}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="p-4 text-center text-xs font-bold text-[#8197A4]">
            No titles found
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B1120]/95 via-[#0B1120]/90 to-transparent backdrop-blur-md transition-all duration-300 border-b border-[#8197A4]/15 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 h-16 sm:h-18 flex items-center justify-between gap-3 sm:gap-6 min-w-0">
          {/* Brand Logo & Desktop Navigation */}
          <div className="flex items-center gap-4 sm:gap-6 md:gap-8 shrink-0">
            {/* Nightcast Branded Logo */}
            <Link
              href="/"
              className="flex items-center gap-1.5 text-white font-extrabold text-xl tracking-tight shrink-0 group cursor-pointer z-20"
            >
              <div className="relative flex flex-col items-start leading-none">
                <span className="text-white font-black text-2xl tracking-tight font-display uppercase">
                  Nightcast
                </span>
                {/* Amazon Signature Prime Smile Curve */}
                <svg
                  className="w-24 h-2.5 text-[#00A8E1] -mt-0.5 group-hover:scale-105 transition-transform"
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
              </div>
            </Link>

            {/* Navigation Bar Links (Desktop & Tablet) */}
            <nav className="hidden sm:flex items-center gap-1 md:gap-2">
              <Link
                href="/"
                className={`${activeTab === "home" ? "gtv-tab-pill-active" : "gtv-tab-pill"}`}
              >
                Home
              </Link>
              <Link
                href="/movies"
                className={`${activeTab === "movies" ? "gtv-tab-pill-active" : "gtv-tab-pill"}`}
              >
                Movies
              </Link>
              <Link
                href="/shows"
                className={`${activeTab === "shows" ? "gtv-tab-pill-active" : "gtv-tab-pill"}`}
              >
                TV Shows
              </Link>

              {/* Categories Dropdown Trigger & Modal Menu */}
              <div ref={categoriesRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                  className={`gtv-tab-pill flex items-center gap-1 cursor-pointer ${
                    isCategoriesOpen ? "border-[#00A8E1]/50 text-white bg-[#192231]" : ""
                  }`}
                >
                  <span>Categories</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#8197A4] transition-transform duration-200 ${
                    isCategoriesOpen ? "rotate-180 text-[#00A8E1]" : ""
                  }`} />
                </button>

                {/* Categories Grid Dropdown Menu */}
                {isCategoriesOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-[#192231]/98 backdrop-blur-xl border border-[#00A8E1]/40 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.9)] p-2.5 z-50 space-y-1 animate-in fade-in slide-in-from-top-2">
                    <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#00A8E1] border-b border-[#8197A4]/20 mb-1 flex items-center gap-1.5">
                      <Grid className="w-3 h-3" />
                      <span>Browse Categories</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 max-h-72 overflow-y-auto no-scrollbar">
                      {CATEGORIES.map((cat) => (
                        <Link
                          key={cat.id}
                          href={cat.href}
                          onClick={() => setIsCategoriesOpen(false)}
                          className="px-3 py-2 rounded-lg text-xs font-semibold text-white/90 hover:text-white hover:bg-[#232E42] hover:pl-4 transition-all duration-200 flex items-center justify-between group"
                        >
                          <span>{cat.name}</span>
                          <span className="text-[#00A8E1] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link
                href="/profile"
                className={`${activeTab === "mystuff" ? "gtv-tab-pill-active" : "gtv-tab-pill"}`}
              >
                My Stuff
              </Link>
            </nav>
          </div>

          {/* Right Action Icons: Search Bar & Profile */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Search Bar (Desktop) */}
            <div ref={searchContainerRef} className="relative hidden sm:block w-48 lg:w-64">
              <form onSubmit={handleSearchSubmit} className="relative">
                {isLoadingSuggestions ? (
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#00A8E1] border-t-transparent animate-spin" />
                ) : (
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8197A4]" />
                )}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim().length > 2) setIsSuggestionsOpen(true);
                  }}
                  placeholder="Search Nightcast..."
                  className="w-full h-9 pl-10 pr-8 bg-[#192231]/80 border border-[#8197A4]/30 rounded-lg text-xs text-white placeholder-[#8197A4] focus:outline-none focus:bg-[#232E42] focus:border-[#00A8E1] transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setIsSuggestionsOpen(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8197A4] hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>

              {/* Desktop Live Suggestions Dropdown Overlay */}
              {renderSuggestionsDropdown()}
            </div>

            {/* Mobile Search Toggle */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="sm:hidden p-2 rounded-lg hover:bg-[#192231] text-[#8197A4] hover:text-white transition-colors shrink-0 cursor-pointer"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Profile Avatar Trigger */}
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#192231] border border-[#00A8E1]/50 flex items-center justify-center text-white hover:border-[#00A8E1] hover:bg-[#232E42] transition-all shadow-md shrink-0 active:scale-95 group cursor-pointer"
              aria-label="User Profile"
            >
              <User className="w-4 h-4 text-[#00A8E1] group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Strip */}
        <div className="sm:hidden px-4 pb-2 pt-0.5 overflow-x-auto no-scrollbar scrollbar-none flex items-center gap-1.5 border-t border-[#8197A4]/10 bg-[#0B1120]">
          <Link
            href="/"
            className={`${activeTab === "home" ? "gtv-tab-pill-active text-[11px] px-3 py-1" : "gtv-tab-pill text-[11px] px-3 py-1"} shrink-0`}
          >
            Home
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
            TV Shows
          </Link>
          <Link
            href="/search"
            className="gtv-tab-pill text-[11px] px-3 py-1 shrink-0"
          >
            Categories
          </Link>
          <Link
            href="/profile"
            className={`${activeTab === "mystuff" ? "gtv-tab-pill-active text-[11px] px-3 py-1" : "gtv-tab-pill text-[11px] px-3 py-1"} shrink-0`}
          >
            My Stuff
          </Link>
        </div>

        {/* Mobile Search Bar Dropdown */}
        {isSearchOpen && (
          <div ref={mobileSearchRef} className="sm:hidden px-4 pb-3 border-b border-[#8197A4]/20 bg-[#0B1120]">
            <div className="relative">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8197A4]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim().length > 2) setIsSuggestionsOpen(true);
                  }}
                  placeholder="Search Nightcast..."
                  className="w-full h-10 pl-11 pr-8 bg-[#192231] border border-[#00A8E1]/40 rounded-lg text-xs text-white placeholder-[#8197A4] focus:outline-none focus:border-[#00A8E1]"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setIsSuggestionsOpen(false);
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8197A4] hover:text-white"
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B1120]/95 border-b border-[#8197A4]/15 select-none h-16 flex items-center px-6">
        <Link href="/" className="text-white font-black text-xl font-display uppercase tracking-tight">
          Nightcast
        </Link>
      </header>
    }>
      <HeaderContent />
    </Suspense>
  );
}