"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Film, Tv, Flame, X, Sparkles } from "lucide-react";
import MovieCard from "../../components/shared/MovieCard";
import { apiFetch, MediaItem } from "../../lib/api";

const GENRES = [
  { id: "", name: "All Genres" },
  { id: "28", name: "Action" },
  { id: "12", name: "Adventure" },
  { id: "16", name: "Animation" },
  { id: "35", name: "Comedy" },
  { id: "80", name: "Crime" },
  { id: "99", name: "Documentary" },
  { id: "18", name: "Drama" },
  { id: "14", name: "Fantasy" },
  { id: "27", name: "Horror" },
  { id: "878", name: "Sci-Fi" },
  { id: "53", name: "Thriller" },
];

const SORTS = [
  { id: "popularity", name: "Most Popular" },
  { id: "vote_average", name: "Highest Rated" },
  { id: "release_date", name: "Release Date" },
];

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryParam = searchParams.get("q") || "";
  const typeParam = searchParams.get("type") || "all";
  const sortParam = searchParams.get("sort") || "";

  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(queryParam);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [selectedType, setSelectedType] = useState<string>(typeParam);
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("popularity");

  useEffect(() => {
    setSearchTerm(queryParam);
    setDebouncedSearchTerm(queryParam);
  }, [queryParam]);

  useEffect(() => {
    if (typeParam) setSelectedType(typeParam);
  }, [typeParam]);

  // Debounce search term changes
  useEffect(() => {
    if (searchTerm === debouncedSearchTerm) return;
    setIsDebouncing(true);
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsDebouncing(false);
      if (searchTerm.trim()) {
        router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}&type=${selectedType}`);
      } else {
        router.push(`/search${selectedType !== 'all' ? `?type=${selectedType}` : ''}`);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedType, debouncedSearchTerm, router]);

  const endpoint = useMemo(() => {
    const activeQuery = debouncedSearchTerm.trim() || queryParam.trim();
    if (activeQuery) {
      const type = selectedType === "all" ? "multi" : selectedType;
      return `/api/tmdb/search?query=${encodeURIComponent(activeQuery)}&media_type=${type}`;
    }
    if (sortParam === "trending") {
      return `/api/tmdb/trending?media_type=${selectedType === "all" ? "all" : selectedType}&time_window=week`;
    }
    if (selectedType === "movie") {
      return `/api/tmdb/popular?media_type=movie`;
    }
    if (selectedType === "tv") {
      return `/api/tmdb/popular?media_type=tv`;
    }
    return `/api/tmdb/trending?media_type=all&time_window=week`;
  }, [debouncedSearchTerm, queryParam, selectedType, sortParam]);

  const { data: rawItems = [], isLoading: isQueryLoading } = useQuery<MediaItem[]>({
    queryKey: ["explore-catalog", endpoint],
    queryFn: () => apiFetch(endpoint),
  });

  const isLoading = isQueryLoading || isDebouncing;

  const filteredItems = useMemo(() => {
    let result = [...rawItems];

    if (selectedGenre) {
      result = result.filter((item) => {
        if (!item.genre_ids) return true;
        return item.genre_ids.includes(Number(selectedGenre));
      });
    }

    if (sortBy === "vote_average") {
      result.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    } else if (sortBy === "release_date") {
      result.sort((a, b) => {
        const dateA = a.release_date || a.first_air_date || "";
        const dateB = b.release_date || b.first_air_date || "";
        return dateB.localeCompare(dateA);
      });
    }

    return result;
  }, [rawItems, selectedGenre, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setDebouncedSearchTerm(searchTerm);
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}&type=${selectedType}`);
    }
  };

  const getPageTitle = () => {
    const activeQuery = debouncedSearchTerm.trim() || queryParam.trim();
    if (activeQuery) return `Results for "${activeQuery}"`;
    if (sortParam === "trending") return "Trending Now";
    if (selectedType === "movie") return "Movies Catalog";
    if (selectedType === "tv") return "Shows Catalog";
    return "Explore Nightcast";
  };

  return (
    <div className="min-h-screen bg-[#090A0F] text-white pt-24 pb-28 px-6 md:px-12 select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-400 font-mono">
            NIGHTCAST CATALOG
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-display">
            {getPageTitle()}
          </h1>
        </div>

        {/* Pill Search Bar & Filters */}
        <div className="p-4 bg-[#12141F] border border-white/10 rounded-2xl space-y-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search movies, shows..."
              className="w-full h-12 pl-12 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white text-sm font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  router.push("/search");
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </form>

          {/* Capsule Pills Selector & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-white/5 border border-white/10">
              <button
                onClick={() => {
                  setSelectedType("all");
                  router.push("/search");
                }}
                className={selectedType === "all" ? "gtv-tab-pill-active" : "gtv-tab-pill"}
              >
                All
              </button>
              <button
                onClick={() => {
                  setSelectedType("movie");
                  router.push("/search?type=movie");
                }}
                className={selectedType === "movie" ? "gtv-tab-pill-active" : "gtv-tab-pill"}
              >
                Movies
              </button>
              <button
                onClick={() => {
                  setSelectedType("tv");
                  router.push("/search?type=tv");
                }}
                className={selectedType === "tv" ? "gtv-tab-pill-active" : "gtv-tab-pill"}
              >
                Shows
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="h-9 px-3.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                {GENRES.map((g) => (
                  <option key={g.id} value={g.id} className="bg-[#12141F] text-white">
                    {g.name}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-9 px-3.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#12141F] text-white">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 16:9 Landscape Card Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse border border-white/10" />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredItems.map((item, idx) => (
              <MovieCard key={`${item.id}-${idx}`} item={item} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center space-y-4">
            <p className="text-sm font-bold text-white/60">No items found</p>
            <button
              onClick={() => {
                setSelectedGenre("");
                setSearchTerm("");
                router.push("/search");
              }}
              className="gtv-btn-primary mx-auto"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#090A0F] pt-24 px-6 max-w-7xl mx-auto">
        <div className="h-12 w-64 bg-white/5 rounded-2xl animate-pulse" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}