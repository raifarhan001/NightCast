"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Film, Tv, Flame, X, Sparkles, SlidersHorizontal } from "lucide-react";
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

  // Studio / Platform Filter Parameters
  const studioParam = searchParams.get("studio") || "";
  const studioNameParam = searchParams.get("name") || "";
  const providerParam = searchParams.get("provider") || "";
  const networkParam = searchParams.get("network") || "";
  const companyParam = searchParams.get("company") || "";
  const genreParam = searchParams.get("genre") || "";
  const langParam = searchParams.get("lang") || "";

  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(queryParam);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [selectedType, setSelectedType] = useState<string>(typeParam);
  const [selectedGenre, setSelectedGenre] = useState<string>(genreParam || "");
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
      } else if (studioParam) {
        // preserve studio filters when clearing text
        router.push(`/search?studio=${studioParam}&name=${encodeURIComponent(studioNameParam)}&provider=${providerParam}&network=${networkParam}&company=${companyParam}&type=${selectedType}`);
      } else {
        router.push(`/search${selectedType !== 'all' ? `?type=${selectedType}` : ''}`);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedType, debouncedSearchTerm, studioParam, studioNameParam, providerParam, networkParam, companyParam, router]);

  // Query Key and Fetch Function
  const isStudioFilterActive = Boolean(studioParam || providerParam || networkParam || companyParam);

  const fetchCatalogItems = async (): Promise<MediaItem[]> => {
    const activeQuery = debouncedSearchTerm.trim() || queryParam.trim();

    // 1. Text Search Query
    if (activeQuery) {
      const type = selectedType === "all" ? "multi" : selectedType;
      return apiFetch(`/api/tmdb/search?query=${encodeURIComponent(activeQuery)}&media_type=${type}`);
    }

    // 2. Studio / Platform Filter Query
    if (isStudioFilterActive) {
      if (selectedType === "movie") {
        const query = `/api/tmdb/discover/movie?with_watch_providers=${providerParam}&with_companies=${companyParam}&with_genres=${genreParam}&with_original_language=${langParam}&watch_region=US`;
        return apiFetch(query);
      }
      if (selectedType === "tv") {
        const query = `/api/tmdb/discover/tv?with_networks=${networkParam}&with_watch_providers=${providerParam}&with_companies=${companyParam}&with_genres=${genreParam}&with_original_language=${langParam}&watch_region=US`;
        return apiFetch(query);
      }
      // If "all", fetch both Top Movies & Top TV Shows for this studio and merge
      const [movies, shows] = await Promise.all([
        apiFetch(`/api/tmdb/discover/movie?with_watch_providers=${providerParam}&with_companies=${companyParam}&with_genres=${genreParam}&with_original_language=${langParam}&watch_region=US`).catch(() => []),
        apiFetch(`/api/tmdb/discover/tv?with_networks=${networkParam}&with_watch_providers=${providerParam}&with_companies=${companyParam}&with_genres=${genreParam}&with_original_language=${langParam}&watch_region=US`).catch(() => []),
      ]);

      // Interleave movies and TV shows
      const combined: MediaItem[] = [];
      const maxLength = Math.max(movies.length, shows.length);
      for (let i = 0; i < maxLength; i++) {
        if (shows[i]) combined.push({ ...shows[i], media_type: "tv" });
        if (movies[i]) combined.push({ ...movies[i], media_type: "movie" });
      }
      return combined;
    }

    // 3. Trending / Standard Catalogs
    if (sortParam === "trending") {
      return apiFetch(`/api/tmdb/trending?media_type=${selectedType === "all" ? "all" : selectedType}&time_window=week`);
    }
    if (selectedType === "movie") {
      return apiFetch(`/api/tmdb/popular?media_type=movie`);
    }
    if (selectedType === "tv") {
      return apiFetch(`/api/tmdb/popular?media_type=tv`);
    }
    return apiFetch(`/api/tmdb/trending?media_type=all&time_window=week`);
  };

  const { data: rawItems = [], isLoading: isQueryLoading } = useQuery<MediaItem[]>({
    queryKey: [
      "explore-catalog",
      debouncedSearchTerm,
      queryParam,
      selectedType,
      sortParam,
      studioParam,
      providerParam,
      networkParam,
      companyParam,
      genreParam,
      langParam,
    ],
    queryFn: fetchCatalogItems,
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

  const clearAllFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSelectedGenre("");
    router.push("/search");
  };

  const getPageTitle = () => {
    const activeQuery = debouncedSearchTerm.trim() || queryParam.trim();
    if (activeQuery) return `Results for "${activeQuery}"`;
    if (studioNameParam) return `${studioNameParam} Originals & Catalog`;
    if (sortParam === "trending") return "Trending Now";
    if (selectedType === "movie") return "Movies Catalog";
    if (selectedType === "tv") return "Shows Catalog";
    return "Explore Nightcast";
  };

  return (
    <div className="min-h-screen bg-[#011425] text-white pt-24 pb-28 px-6 md:px-12 select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-[#5C7C89] font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1F4959] animate-pulse" />
              <span>{isStudioFilterActive ? "PLATFORM CATALOG" : "NIGHTCAST CATALOG"}</span>
            </p>

            {/* Active Studio Filter Pill */}
            {studioNameParam && !searchTerm && (
              <div className="flex items-center gap-2 px-3 py-1 bg-[#081E30] border border-[#5C7C89]/30 rounded-full text-xs font-semibold text-[#5C7C89]">
                <span>Platform: <strong className="text-white">{studioNameParam}</strong></span>
                <button
                  onClick={clearAllFilters}
                  className="w-4 h-4 rounded-full bg-[#1F4959] hover:bg-[#5C7C89] text-white flex items-center justify-center transition-colors"
                  title="Clear filter"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-display text-white">
            {getPageTitle()}
          </h1>
        </div>

        {/* Pill Search Bar & Filters */}
        <div className="p-4 bg-[#081E30] border border-[#5C7C89]/25 rounded-2xl space-y-4 shadow-xl">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5C7C89]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search movies, shows, directors..."
              className="w-full h-12 pl-12 pr-12 bg-[#011425] border border-[#5C7C89]/30 rounded-xl text-white placeholder-[#5C7C89] focus:outline-none focus:border-[#5C7C89] text-sm font-medium shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  if (studioParam) {
                    router.push(`/search?studio=${studioParam}&name=${encodeURIComponent(studioNameParam)}&provider=${providerParam}&network=${networkParam}&company=${companyParam}&type=${selectedType}`);
                  } else {
                    router.push("/search");
                  }
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5C7C89] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </form>

          {/* Capsule Pills Selector & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#5C7C89]/20">
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#011425]/70 border border-[#5C7C89]/25 shadow-inner">
              <button
                onClick={() => {
                  setSelectedType("all");
                  if (studioParam) {
                    router.push(`/search?studio=${studioParam}&name=${encodeURIComponent(studioNameParam)}&provider=${providerParam}&network=${networkParam}&company=${companyParam}&type=all`);
                  } else {
                    router.push("/search");
                  }
                }}
                className={selectedType === "all" ? "gtv-tab-pill-active" : "gtv-tab-pill"}
              >
                All
              </button>
              <button
                onClick={() => {
                  setSelectedType("movie");
                  if (studioParam) {
                    router.push(`/search?studio=${studioParam}&name=${encodeURIComponent(studioNameParam)}&provider=${providerParam}&network=${networkParam}&company=${companyParam}&type=movie`);
                  } else {
                    router.push("/search?type=movie");
                  }
                }}
                className={selectedType === "movie" ? "gtv-tab-pill-active" : "gtv-tab-pill"}
              >
                Movies
              </button>
              <button
                onClick={() => {
                  setSelectedType("tv");
                  if (studioParam) {
                    router.push(`/search?studio=${studioParam}&name=${encodeURIComponent(studioNameParam)}&provider=${providerParam}&network=${networkParam}&company=${companyParam}&type=tv`);
                  } else {
                    router.push("/search?type=tv");
                  }
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
                className="h-9 px-3.5 rounded-full bg-[#011425] border border-[#5C7C89]/30 text-xs font-bold text-[#5C7C89] hover:text-white focus:outline-none cursor-pointer"
              >
                {GENRES.map((g) => (
                  <option key={g.id} value={g.id} className="bg-[#081E30] text-white">
                    {g.name}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-9 px-3.5 rounded-full bg-[#011425] border border-[#5C7C89]/30 text-xs font-bold text-[#5C7C89] hover:text-white focus:outline-none cursor-pointer"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#081E30] text-white">
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
              <div key={i} className="aspect-video rounded-2xl bg-[#081E30]/60 animate-pulse border border-[#5C7C89]/20" />
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
            <p className="text-sm font-bold text-[#5C7C89]">No items found</p>
            <button
              onClick={clearAllFilters}
              className="gtv-btn-primary mx-auto"
            >
              Clear Filters
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
      <div className="min-h-screen bg-[#011425] pt-24 px-6 max-w-7xl mx-auto">
        <div className="h-12 w-64 bg-[#081E30] rounded-2xl animate-pulse" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}