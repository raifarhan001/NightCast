'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { apiFetch, MediaItem } from '../../lib/api';
import MovieCard from '../../components/shared/MovieCard';
import { SearchErrorBoundary } from '../../components/shared/ErrorBoundaries';
import { Search as SearchIcon, Mic, MicOff, Sparkles, X } from 'lucide-react';

function SearchPage() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type') || 'movie';

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'standard' | 'semantic'>('standard');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const searchModeRef = useRef(searchMode);
  const runSemanticRef = useRef<any>(null);

  const isQueryEmpty = debouncedQuery.trim().length <= 1;

  useEffect(() => {
    if (searchMode === 'semantic') return;
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, searchMode]);

  const { data: standardResults = [], isLoading: standardLoading } = useQuery<MediaItem[]>({
    queryKey: ['search-standard', debouncedQuery, typeParam],
    queryFn: () => {
      if (isQueryEmpty) {
        return apiFetch(`/api/tmdb/popular?media_type=${typeParam}`);
      } else {
        return apiFetch(`/api/tmdb/search?query=${encodeURIComponent(debouncedQuery)}&media_type=${typeParam}`);
      }
    },
    enabled: searchMode === 'standard'
  });

  const { data: semanticResults = [], isLoading: semanticLoading, refetch: runSemantic } = useQuery<MediaItem[]>({
    queryKey: ['search-semantic', query],
    queryFn: () => apiFetch(`/api/ai/search?query=${encodeURIComponent(query)}`),
    enabled: false
  });

  const handleSemanticSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length > 1) {
      setSearchMode('semantic');
      runSemantic();
    }
  };

  const toggleSearchMode = () => {
    const nextMode = searchMode === 'standard' ? 'semantic' : 'standard';
    setSearchMode(nextMode);
    if (nextMode === 'standard') {
      setDebouncedQuery(query);
    } else {
      if (query.trim().length > 1) runSemantic();
    }
  };

  useEffect(() => { searchModeRef.current = searchMode; }, [searchMode]);
  useEffect(() => { runSemanticRef.current = runSemantic; }, [runSemantic]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onstart = () => setIsListening(true);
        rec.onend = () => setIsListening(false);
        rec.onerror = () => setIsListening(false);
        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setQuery(transcript);
          if (searchModeRef.current === 'semantic') {
            setTimeout(() => runSemanticRef.current(), 200);
          }
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice search is not supported in this browser. Please try Chrome or Safari.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const results = searchMode === 'standard' ? standardResults : semanticResults;
  const loading = searchMode === 'standard' ? standardLoading : semanticLoading;

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 min-h-screen bg-black">
      <div className="mb-10 text-center max-w-2xl mx-auto space-y-3">
        <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight text-white">
          {searchMode === 'semantic' ? 'AI Search' : isQueryEmpty ? (typeParam === 'tv' ? 'Popular TV Shows' : 'Popular Movies') : 'Discover'}
        </h1>
        <p className="text-sm text-nexus-muted font-light leading-relaxed">
          {searchMode === 'semantic'
            ? 'Describe what you want to watch in natural language'
            : 'Search titles, cast, or crew'}
        </p>
      </div>

      <div className="max-w-3xl mx-auto mb-14">
        <form onSubmit={handleSemanticSubmit} className="relative flex items-center">
          <div className="absolute left-5 text-nexus-muted">
            {searchMode === 'semantic' ? (
              <Sparkles className="w-5 h-5 text-cyan animate-pulse-soft" />
            ) : (
              <SearchIcon className="w-5 h-5" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (searchMode === 'standard' && e.target.value === '') {
                setDebouncedQuery('');
              }
            }}
            placeholder={
              searchMode === 'semantic'
                ? "e.g. 'Space movies like Interstellar'..."
                : "Search movies, shows, actors..."
            }
            className={`w-full pl-14 pr-36 py-4 bg-nexus-surface rounded-2xl border text-white font-medium placeholder-nexus-muted transition-all duration-300 focus:outline-none ${
              searchMode === 'semantic'
                ? 'border-cyan/20 focus:border-cyan/50 focus:shadow-glow-cyan-sm'
                : 'border-glass-stroke focus:border-white/20'
            }`}
          />

          <div className="absolute right-3 flex items-center gap-1">
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setDebouncedQuery(''); }}
                className="p-2 rounded-lg hover:bg-white/5 text-nexus-muted hover:text-white transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isListening
                  ? 'bg-cyan text-black shadow-glow-cyan-sm'
                  : 'hover:bg-white/5 text-nexus-muted hover:text-white'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={toggleSearchMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-all duration-300 ${
                searchMode === 'semantic'
                  ? 'bg-cyan-muted border border-cyan/20 text-cyan'
                  : 'bg-white/5 border border-glass-stroke text-nexus-muted hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>AI</span>
            </button>
          </div>
        </form>

        {searchMode === 'semantic' && (
          <div className="flex flex-wrap gap-2.5 justify-center mt-5">
            {["Space movies like Interstellar", "Mind bending thrillers", "Award winning dramas"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setQuery(tag);
                  setSearchMode('semantic');
                  setTimeout(() => runSemantic(), 100);
                }}
                className="px-4 py-2 rounded-full border border-glass-stroke bg-nexus-card text-[11px] text-nexus-muted hover:text-white hover:border-cyan/30 hover:bg-cyan/5 transition-all duration-300"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 justify-items-center">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="w-44 md:w-56 aspect-[2/3] shrink-0 rounded-2xl bg-white/[0.03] border border-glass-stroke relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/[0.04] before:to-transparent"
            />
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 justify-items-center">
          {results.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="animate-fade-in" style={{ animationDelay: `${idx * 0.04}s` }}>
              <MovieCard item={item} />
            </div>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <div className="text-center py-20 space-y-3">
          <p className="text-base font-semibold text-white">No results found</p>
          <p className="text-sm text-nexus-muted max-w-xs mx-auto leading-relaxed">
            Try adjusting your search or switch to AI mode for more flexible matches.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPageWrapper() {
  return (
    <SearchErrorBoundary>
      <Suspense fallback={
        <div className="w-full min-h-screen bg-black flex justify-center items-center">
          <div className="w-8 h-8 rounded-full border-t-2 border-cyan animate-spin" />
        </div>
      }>
        <SearchPage />
      </Suspense>
    </SearchErrorBoundary>
  );
}
