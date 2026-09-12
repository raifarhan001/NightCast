"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import ProfileSelectorModal from "../profile/ProfileSelectorModal";
import { apiFetch, MediaItem } from "../../lib/api";
import { ImageService } from "../../lib/ImageService";

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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  return (
    <>
      {/* Floating Top-Right Search Capsule (Matching Reference UI) */}
      <div className="fixed top-3 sm:top-5 right-3 sm:right-8 md:right-12 z-40 pointer-events-auto">
        <div ref={searchContainerRef} className="relative">
          {/* Frosted Search Pill Capsule */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-5 py-1.5 sm:py-2.5 rounded-full bg-[#1B3A57]/65 hover:bg-[#2C3E50]/75 focus-within:bg-[#2C3E50]/90 backdrop-blur-xl border border-[#4A6E8D]/35 shadow-[0_8px_32px_rgba(7,12,18,0.7)] transition-all duration-200"
          >
            <Search className="w-4 h-4 text-[#A4C8E1]/80 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for Movie"
              className="bg-transparent text-xs sm:text-sm text-[#F0F0F0] placeholder-[#A4C8E1]/50 focus:outline-none w-28 sm:w-48 md:w-64 focus:w-36 sm:focus:w-56 font-sans transition-all duration-200"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[#A4C8E1]/60 hover:text-[#F0F0F0] text-xs p-0.5 rounded-full transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#A4C8E1]/80 hover:text-[#F0F0F0] hover:bg-[#A4C8E1]/15 transition cursor-pointer"
              title="Filter Movies"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Filter Dropdown Popover */}
          {isFilterOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-[#0B131B]/95 backdrop-blur-2xl border border-[#4A6E8D]/30 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="text-xs font-semibold text-[#A4C8E1] mb-2.5">Quick Genres</div>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setIsFilterOpen(false);
                      router.push(`/search?genre=${g.id}`);
                    }}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#1B3A57]/45 hover:bg-[#2C3E50]/70 text-[#F0F0F0] border border-[#4A6E8D]/25 transition"
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Auto Suggestions Dropdown */}
          {isSuggestionsOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0B131B]/95 backdrop-blur-2xl border border-[#4A6E8D]/30 rounded-2xl shadow-[0_20px_40px_rgba(7,12,18,0.9)] overflow-hidden z-50 py-1 divide-y divide-[#4A6E8D]/20">
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
                  const mediaType = item.media_type === "tv" ? "TV" : "Movie";
                  const posterUrl = ImageService.getPoster(item.poster_path, "w500", title);

                  return (
                    <button
                      key={`${item.id}-${idx}`}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[#1B3A57]/40 transition-colors text-left group cursor-pointer"
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
                        <h4 className="text-xs font-medium text-[#F0F0F0] truncate group-hover:text-[#A4C8E1] transition-colors">
                          {title}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-[#A4C8E1]/60">
                          {year && <span>{year}</span>}
                          <span className="px-1.5 py-0.2 bg-[#1B3A57]/60 text-[9px] font-semibold text-[#A4C8E1] rounded-full border border-[#4A6E8D]/30">
                            {mediaType}
                          </span>
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