"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  X,
  Star,
  User,
  Home,
  Film,
  Tv,
  Award,
  Bookmark,
  Layers,
  ChevronDown,
  Compass,
} from "lucide-react";
import ProfileSelectorModal from "../profile/ProfileSelectorModal";
import { apiFetch, MediaItem } from "../../lib/api";
import { ImageService } from "../../lib/ImageService";
import { useUserStore } from "../../store/userStore";

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

const GENRES = [
  { id: "28", name: "Action" },
  { id: "35", name: "Comedy" },
  { id: "18", name: "Drama" },
  { id: "878", name: "Sci-Fi" },
  { id: "53", name: "Thriller" },
  { id: "27", name: "Horror" },
  { id: "16", name: "Animation" },
  { id: "99", name: "Documentary" },
];

function HeaderContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MediaItem[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  const { user, activeProfile } = useUserStore();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const mobileCategoriesRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Reset dropdowns on route change
  useEffect(() => {
    setIsCategoriesOpen(false);
    setIsSuggestionsOpen(false);
    setIsFilterOpen(false);
  }, [pathname]);

  // Global Ctrl + K / Cmd + K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounce search query for auto-suggestions
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length <= 2) {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      setIsLoadingSuggestions(false);
      setSelectedIndex(-1);
      return;
    }

    setIsLoadingSuggestions(true);
    setIsSuggestionsOpen(true);
    setSelectedIndex(-1);

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

  // Click outside listener for search & categories dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setIsSuggestionsOpen(false);
        setIsFilterOpen(false);
        setSelectedIndex(-1);
      }
      const inDesktopCategories = categoriesContainerRef.current?.contains(target);
      const inMobileCategories = mobileCategoriesRef.current?.contains(target);
      if (!inDesktopCategories && !inMobileCategories) {
        setIsCategoriesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsCategoriesOpen(false);
        setIsSuggestionsOpen(false);
        setIsFilterOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (!isSuggestionsOpen || suggestions.length === 0) {
      if (e.key === "Escape") {
        setIsSuggestionsOpen(false);
        searchInputRef.current?.blur();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsSuggestionsOpen(false);
      setSelectedIndex(-1);
      searchInputRef.current?.blur();
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      handleSelectSuggestion(suggestions[selectedIndex]);
      return;
    }
    if (searchQuery.trim()) {
      setIsSuggestionsOpen(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectSuggestion = (item: MediaItem) => {
    const mediaType = item.media_type || (item.title ? "movie" : "tv");
    router.push(`/watch/${mediaType}/${item.id}`);
    setIsSuggestionsOpen(false);
    setSearchQuery("");
    setSelectedIndex(-1);
  };

  const navItems = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      href: "/",
      isActive: pathname === "/",
      onClick: (e: React.MouseEvent) => {
        if (pathname === "/") {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      },
    },
    {
      id: "movies",
      label: "Movies",
      icon: Film,
      href: "/movies",
      isActive: pathname.startsWith("/movies") || pathname.startsWith("/movie") || pathname.startsWith("/watch/movie"),
    },
    {
      id: "shows",
      label: "TV Shows",
      icon: Tv,
      href: "/shows",
      isActive: pathname.startsWith("/shows") || pathname.startsWith("/tv") || pathname.startsWith("/watch/tv"),
    },
    {
      id: "top-rated",
      label: "Top 10",
      icon: Award,
      href: "/#top10",
      isActive: false,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        const el = document.getElementById("top10");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        } else {
          router.push("/#top10");
        }
      },
    },
    {
      id: "watchlist",
      label: "Watchlist",
      icon: Bookmark,
      href: "/profile",
      isActive: pathname.startsWith("/profile"),
    },
  ];

  return (
    <>
      <header className="fixed top-3 sm:top-5 inset-x-0 z-50 select-none pointer-events-none px-4 sm:px-6 md:px-8 lg:px-10">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-3 sm:gap-6">
          {/* Left: Navigation Buttons Capsule (Pure Floating Capsule) */}
          <nav
            className="pointer-events-auto hidden md:flex items-center gap-1 p-1 rounded-full bg-white/[0.06] hover:bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-200"
            aria-label="Main Navigation"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.isActive;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={item.onClick}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                    active
                      ? "bg-[#39AEA9]/20 text-[#39AEA9] border border-[#39AEA9]/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_0_14px_rgba(57,174,169,0.35)]"
                      : "text-[#8FA8AD] hover:text-[#F0F0F0] hover:bg-white/[0.08] border border-transparent"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? "text-[#39AEA9]" : ""}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Categories Dropdown inside Capsule */}
            <div className="relative" ref={categoriesContainerRef}>
              <button
                type="button"
                onClick={() => setIsCategoriesOpen((prev) => !prev)}
                aria-expanded={isCategoriesOpen}
                aria-label="Categories menu"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                  isCategoriesOpen
                    ? "bg-[#39AEA9]/20 text-[#39AEA9] border border-[#39AEA9]/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_0_14px_rgba(57,174,169,0.35)]"
                    : "text-[#8FA8AD] hover:text-[#F0F0F0] hover:bg-white/[0.08] border border-transparent"
                }`}
              >
                <Layers className={`w-3.5 h-3.5 ${isCategoriesOpen ? "text-[#39AEA9]" : ""}`} />
                <span>Categories</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isCategoriesOpen ? "rotate-180 text-[#39AEA9]" : ""}`} />
              </button>

              {/* Categories Dropdown Popover */}
              {isCategoriesOpen && (
                <div className="absolute top-full left-0 mt-2.5 w-64 bg-[#0B131B]/95 backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.12] rounded-2xl p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] z-50 animate-in fade-in zoom-95 duration-150">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 mb-1.5 text-[11px] font-semibold text-[#A4C8E1] uppercase tracking-wider border-b border-white/[0.06]">
                    <Compass className="w-3.5 h-3.5 text-[#39AEA9]" />
                    <span>Explore Genres</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1 max-h-72 overflow-y-auto pr-1">
                    {CATEGORIES.map((cat) => (
                      <Link
                        key={cat.id}
                        href={cat.href}
                        onClick={() => setIsCategoriesOpen(false)}
                        className="px-3 py-2 rounded-xl text-xs font-medium text-[#F0F0F0]/90 hover:text-white bg-white/[0.02] hover:bg-white/[0.08] border border-transparent hover:border-[#39AEA9]/30 transition-all flex items-center justify-between"
                      >
                        <span>{cat.name}</span>
                        <span className="text-[11px] text-[#39AEA9]">&rarr;</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Right on Desktop / Full Width on Mobile: Search & Profile Capsules */}
          <div className="pointer-events-auto flex items-center justify-between md:justify-end gap-2 sm:gap-3 w-full md:w-auto">
            {/* Search Capsule */}
            <div ref={searchContainerRef} className="relative flex-1 md:flex-initial">
              <form
                onSubmit={handleSearchSubmit}
                role="search"
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] focus-within:bg-white/[0.14] backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-200 w-full"
              >
                <Search className="w-3.5 h-3.5 text-[#8FA8AD] shrink-0" />
                <input
                  ref={searchInputRef}
                  type="search"
                  aria-label="Search movies, TV shows, and titles"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Search for Movie or TV"
                  className="bg-transparent text-xs text-[#F0F0F0] placeholder-[#8FA8AD]/60 focus:outline-none w-full md:w-44 lg:w-48 md:focus:w-56 font-sans transition-all duration-200"
                />
                {!searchQuery && (
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono text-[#8FA8AD] bg-white/[0.08] border border-white/10 rounded pointer-events-none select-none">
                    <span className="text-[8px]">Ctrl</span>
                    <span>K</span>
                  </kbd>
                )}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedIndex(-1);
                    }}
                    aria-label="Clear search query"
                    className="text-[#8FA8AD] hover:text-[#F0F0F0] text-xs p-0.5 rounded-full transition focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFilterOpen((prev) => !prev)}
                  aria-label="Toggle genre filters"
                  aria-expanded={isFilterOpen}
                  aria-controls="genre-filter-dropdown"
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[#8FA8AD] hover:text-[#F0F0F0] hover:bg-white/10 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                  title="Filter Movies"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                </button>
              </form>

              {/* Genre Filter Popover */}
              {isFilterOpen && (
                <div id="genre-filter-dropdown" className="absolute top-full right-0 mt-2 w-64 bg-[#0B131B]/95 backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.12] rounded-2xl p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_20px_50px_rgba(0,0,0,0.9)] z-50 animate-in fade-in zoom-95 duration-150">
                  <div className="text-xs font-semibold text-[#A4C8E1] mb-2.5">Quick Genres</div>
                  <div className="flex flex-wrap gap-1.5">
                    {GENRES.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          setIsFilterOpen(false);
                          router.push(`/search?genre=${g.id}`);
                        }}
                        className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/[0.06] hover:bg-white/[0.14] text-[#F0F0F0] border border-white/[0.1] hover:border-white/[0.22] backdrop-blur-md transition"
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto Suggestions Dropdown */}
              {isSuggestionsOpen && (
                <div
                  id="search-suggestions-menu"
                  role="listbox"
                  aria-label="Search suggestions"
                  className="absolute top-full right-0 mt-2 w-[calc(100vw-32px)] sm:w-96 max-w-sm bg-[#0B131B]/95 backdrop-blur-3xl backdrop-saturate-150 border border-white/[0.12] rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden z-50 py-1 divide-y divide-white/[0.08]"
                >
                  {isLoadingSuggestions ? (
                    <div className="p-4 flex items-center justify-center gap-2 text-xs text-[#8FA8AD]">
                      <div className="w-3.5 h-3.5 border-2 border-[#8FA8AD]/40 border-t-[#39AEA9] animate-spin rounded-full" />
                      <span>Searching...</span>
                    </div>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((item, idx) => {
                      const title = item.title || item.name || "Untitled";
                      const date = item.release_date || item.first_air_date;
                      const year = date ? new Date(date).getFullYear().toString() : "";
                      const isTv = item.media_type === "tv" || !item.title;
                      const posterUrl = ImageService.getPoster(item.poster_path, "w500", title);
                      const isSelected = selectedIndex === idx;

                      return (
                        <button
                          key={`${item.id}-${idx}`}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelectSuggestion(item)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full px-3.5 py-2.5 flex items-center gap-3 transition-colors text-left group cursor-pointer ${
                            isSelected
                              ? "bg-white/[0.12] border-l-2 border-[#39AEA9] pl-3"
                              : "hover:bg-white/[0.06]"
                          }`}
                        >
                          <div className="relative w-8 h-11 rounded-lg overflow-hidden bg-black/40 shrink-0 border border-white/[0.12]">
                            <Image
                              src={posterUrl}
                              alt={`${title} poster thumbnail`}
                              fill
                              sizes="32px"
                              className="object-cover rounded-lg group-hover:scale-105 transition-transform duration-200"
                            />
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <h4 className={`text-xs font-medium truncate transition-colors ${
                              isSelected ? "text-[#A4C8E1]" : "text-[#F0F0F0] group-hover:text-[#A4C8E1]"
                            }`}>
                              {title}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-[#8FA8AD]">
                              {isTv ? (
                                <span className="px-1.5 py-0.5 bg-[#39AEA9]/20 text-[9px] font-bold text-[#39AEA9] rounded-md border border-[#39AEA9]/30">
                                  TV Series
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-white/[0.08] text-[9px] font-bold text-[#A4C8E1] rounded-md border border-white/[0.12]">
                                  Movie
                                </span>
                              )}
                              {year && <span>{year}</span>}
                              {item.vote_average && item.vote_average > 0 && (
                                <div className="flex items-center gap-1 text-amber-400 font-semibold ml-auto">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  <span>{Number(item.vote_average).toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-xs text-[#8FA8AD]">
                      No matching titles found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile / Account Trigger */}
            <button
              type="button"
              aria-label="User profile account selector"
              onClick={() => {
                if (user) {
                  setIsProfileModalOpen(true);
                } else {
                  router.push("/profile?signin=1");
                }
              }}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.4)] text-[#F0F0F0] text-xs font-medium transition cursor-pointer active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
              title={user ? (activeProfile?.name || "Switch Profile") : "Sign In / Register"}
            >
              {user && activeProfile ? (
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#A4C8E1] text-[#0B131B] text-[10px] font-bold flex items-center justify-center uppercase shrink-0">
                  {activeProfile.name.slice(0, 1)}
                </div>
              ) : (
                <User className="w-3.5 h-3.5 text-white/80 shrink-0" />
              )}
              <span className="hidden min-[480px]:inline text-xs font-medium">
                {user ? (activeProfile?.name || "Profile") : "Sign In"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Floating Bottom Navigation Capsule (< md) */}
      <nav
        className="md:hidden fixed bottom-3 sm:bottom-4 inset-x-2.5 max-w-md mx-auto z-50 pointer-events-auto p-1.5 rounded-full bg-[#0B131B]/85 backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.14] shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_12px_36px_rgba(0,0,0,0.9)] flex items-center justify-around select-none"
        aria-label="Mobile Bottom Navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={item.onClick}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center py-1 px-1.5 min-[380px]:px-2.5 rounded-full transition-all duration-200 ${
                active
                  ? "bg-[#39AEA9]/20 text-[#39AEA9] border border-[#39AEA9]/50 shadow-[0_0_10px_rgba(57,174,169,0.3)]"
                  : "text-[#8FA8AD] hover:text-[#F0F0F0] border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-[#39AEA9]" : ""}`} />
              <span className="text-[9px] font-medium tracking-tight mt-0.5">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Categories Button in Mobile Bottom Capsule */}
        <button
          type="button"
          onClick={() => setIsCategoriesOpen((prev) => !prev)}
          aria-expanded={isCategoriesOpen}
          aria-label="Explore Categories"
          className={`flex flex-col items-center justify-center py-1 px-1.5 min-[380px]:px-2.5 rounded-full transition-all duration-200 cursor-pointer ${
            isCategoriesOpen
              ? "bg-[#39AEA9]/20 text-[#39AEA9] border border-[#39AEA9]/50 shadow-[0_0_10px_rgba(57,174,169,0.3)]"
              : "text-[#8FA8AD] hover:text-[#F0F0F0] border border-transparent"
          }`}
        >
          <Layers className={`w-4 h-4 ${isCategoriesOpen ? "text-[#39AEA9]" : ""}`} />
          <span className="text-[9px] font-medium tracking-tight mt-0.5">
            Genres
          </span>
        </button>
      </nav>

      {/* Mobile Categories Modal (Opened from Mobile Bottom Capsule) */}
      {isCategoriesOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-150"
            onClick={() => setIsCategoriesOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={mobileCategoriesRef}
            role="dialog"
            aria-modal="true"
            aria-label="Explore Genres"
            className="md:hidden fixed bottom-20 inset-x-3.5 max-w-sm mx-auto bg-[#0B131B]/95 backdrop-blur-3xl border border-white/[0.14] rounded-3xl p-4 shadow-[0_24px_60px_rgba(0,0,0,0.95)] z-50 animate-in slide-in-from-bottom-3 duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
              <div className="flex items-center gap-2 text-[#A4C8E1] text-xs font-semibold uppercase tracking-wider">
                <Compass className="w-4 h-4 text-[#39AEA9]" />
                <span>Explore Genres</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoriesOpen(false)}
                aria-label="Close Explore Genres"
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#8FA8AD] hover:text-white bg-white/[0.06] border border-white/[0.08]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  href={cat.href}
                  onClick={() => setIsCategoriesOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-[#F0F0F0]/90 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-[#39AEA9]/30 transition-all flex items-center justify-between"
                >
                  <span className="truncate">{cat.name}</span>
                  <span className="text-[10px] text-[#39AEA9] shrink-0">&rarr;</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Profile Selector Modal */}
      {isProfileModalOpen && (
        <ProfileSelectorModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      )}
    </>
  );
}

export default function Header() {
  return (
    <Suspense fallback={null}>
      <HeaderContent />
    </Suspense>
  );
}