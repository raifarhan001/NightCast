"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X, Star, User } from "lucide-react";
import ProfileSelectorModal from "../profile/ProfileSelectorModal";
import { apiFetch, MediaItem } from "../../lib/api";
import { ImageService } from "../../lib/ImageService";
import { useUserStore } from "../../store/userStore";

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
  const { user, activeProfile } = useUserStore();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
        setIsFilterOpen(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  return (
    <>
      {/* Floating Top-Right Search & Profile Capsule */}
      <div className="fixed top-3 sm:top-5 right-3 sm:right-8 md:right-12 z-40 pointer-events-auto flex items-center gap-2">
        <div ref={searchContainerRef} className="relative">
          {/* Frosted Search Pill Capsule - Highly Transparent & Compact Glass */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-white/[0.07] hover:bg-white/[0.12] focus-within:bg-white/[0.16] backdrop-blur-md border border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.2)] transition-all duration-200"
          >
            <Search className="w-3.5 h-3.5 text-white/70 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search for Movie or TV"
              className="bg-transparent text-xs text-[#F0F0F0] placeholder-white/45 focus:outline-none w-24 sm:w-36 md:w-48 focus:w-28 sm:focus:w-44 md:focus:w-56 font-sans transition-all duration-200"
            />
            {!searchQuery && (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono text-white/50 bg-white/[0.08] border border-white/10 rounded pointer-events-none select-none">
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
                className="text-white/60 hover:text-white text-xs p-0.5 rounded-full transition"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Filter Movies"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>
          </form>

          {/* Filter Dropdown Popover */}
          {isFilterOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-[#0B131B]/85 backdrop-blur-2xl border border-[#4A6E8D]/30 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="text-xs font-semibold text-[#A4C8E1] mb-2.5">Quick Genres</div>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setIsFilterOpen(false);
                      router.push(`/search?genre=${g.id}`);
                    }}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#1B3A57]/35 hover:bg-[#2C3E50]/60 text-[#F0F0F0] border border-[#4A6E8D]/25 transition"
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Auto Suggestions Dropdown with Keyboard Navigation & Badges */}
          {isSuggestionsOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0B131B]/85 backdrop-blur-2xl border border-[#4A6E8D]/30 rounded-2xl shadow-[0_20px_40px_rgba(7,12,18,0.9)] overflow-hidden z-50 py-1 divide-y divide-[#4A6E8D]/20">
              {isLoadingSuggestions ? (
                <div className="p-4 flex items-center justify-center gap-2 text-xs text-[#A4C8E1]/70">
                  <div className="w-3.5 h-3.5 border-2 border-[#A4C8E1]/40 border-t-[#A4C8E1] animate-spin rounded-full" />
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
                      onClick={() => handleSelectSuggestion(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full px-3.5 py-2.5 flex items-center gap-3 transition-colors text-left group cursor-pointer ${
                        isSelected
                          ? "bg-[#1B3A57]/75 border-l-2 border-[#39AEA9] pl-3"
                          : "hover:bg-[#1B3A57]/40"
                      }`}
                    >
                      <div className="relative w-8 h-11 rounded-lg overflow-hidden bg-black/40 shrink-0 border border-[#4A6E8D]/25">
                        <Image
                          src={posterUrl}
                          alt={title}
                          fill
                          sizes="32px"
                          className="object-cover rounded-lg group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h4 className={`text-xs font-medium truncate transition-colors ${
                          isSelected ? "text-[#A4C8E1]" : "text-[#F0F0F0] group-hover:text-[#A4C8E1]"
                        }`}>
                          {title}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-[#A4C8E1]/70">
                          {isTv ? (
                            <span className="px-1.5 py-0.5 bg-[#39AEA9]/20 text-[9px] font-bold text-[#A2D5AB] rounded-md border border-[#39AEA9]/30">
                              TV Series
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-[#1B3A57]/70 text-[9px] font-bold text-[#A4C8E1] rounded-md border border-[#4A6E8D]/40">
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
                <div className="p-4 text-center text-xs text-[#A4C8E1]/50">
                  No matching titles found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile / Account Trigger */}
        <button
          type="button"
          onClick={() => {
            if (user) {
              setIsProfileModalOpen(true);
            } else {
              router.push("/profile");
            }
          }}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] backdrop-blur-md border border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.2)] text-[#F0F0F0] text-xs font-medium transition cursor-pointer active:scale-95"
          title={user ? (activeProfile?.name || "Switch Profile") : "Sign In / Register"}
        >
          {user && activeProfile ? (
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#A4C8E1] text-[#0B131B] text-[10px] font-bold flex items-center justify-center uppercase shrink-0">
              {activeProfile.name.slice(0, 1)}
            </div>
          ) : (
            <User className="w-3.5 h-3.5 text-white/80 shrink-0" />
          )}
          <span className="hidden sm:inline text-xs font-medium">
            {user ? (activeProfile?.name || "Profile") : "Sign In"}
          </span>
        </button>
      </div>

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