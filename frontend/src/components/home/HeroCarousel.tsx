"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Heart, Bookmark, Plus, X, Film } from "lucide-react";
import { MediaItem, apiFetch } from "../../lib/api";
import { ImageService } from "../../lib/ImageService";
import { useAmbientStore } from "../../store/ambientStore";
import { useUserStore } from "../../store/userStore";
import { triggerToast } from "../common/ToastNotification";

interface HeroCarouselProps {
  items: MediaItem[];
}

const GENRE_MAP: Record<number, string> = {
  28: "action",
  12: "adventure",
  16: "animation",
  35: "comedy",
  80: "crime",
  99: "documentary",
  18: "drama",
  10751: "family",
  14: "fantasy",
  36: "history",
  27: "horror",
  10402: "music",
  9648: "mystery",
  10749: "romance",
  878: "sci-fi",
  10770: "tv movie",
  53: "thriller",
  10752: "war",
  37: "western",
  10759: "action & adventure",
  10762: "kids",
  10765: "sci-fi & fantasy",
};

function formatReleaseDate(rawDate?: string): string {
  if (!rawDate) return "Coming Soon";
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return "Coming Soon";
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    return `${month}, ${day}`;
  } catch {
    return "Coming Soon";
  }
}

function HeroCarousel({ items = [] }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("nc_hero_carousel_index");
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= 0) return parsed;
        }
      } catch {}
    }
    return 0;
  });
  const [isPaused, setIsPaused] = useState(false);
  const [favorites, setFavorites] = useState<Record<string | number, boolean>>({});
  const [watchlist, setWatchlist] = useState<Record<string | number, boolean>>({});
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);

  // Sync currentIndex to sessionStorage for scroll/page return restoration
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("nc_hero_carousel_index", String(currentIndex));
      } catch {}
    }
  }, [currentIndex]);

  // Load saved favorites & watchlist from localStorage and listen for updates
  useEffect(() => {
    if (typeof window === "undefined") return;
    const refreshStates = () => {
      try {
        const storedFavs = localStorage.getItem("nightcast_favorites");
        if (storedFavs) setFavorites(JSON.parse(storedFavs));
        const storedWl = localStorage.getItem("nightcast_watchlist");
        if (storedWl) setWatchlist(JSON.parse(storedWl));
      } catch {}
    };
    refreshStates();

    const handleWatchlistSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string | number; added: boolean }>;
      if (customEvent.detail) {
        setWatchlist((prev) => ({
          ...prev,
          [customEvent.detail.id]: customEvent.detail.added,
        }));
      }
    };

    window.addEventListener("nightcast:watchlist-update", handleWatchlistSync);
    return () => window.removeEventListener("nightcast:watchlist-update", handleWatchlistSync);
  }, []);

  const displayItems = useMemo(() => {
    return items && items.length > 0 ? items.slice(0, 5) : [];
  }, [items]);

  const activeItem = displayItems[currentIndex] || displayItems[0];

  const nextSlide = useCallback(() => {
    if (!displayItems || displayItems.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % displayItems.length);
  }, [displayItems]);

  useEffect(() => {
    if (activeItem) {
      const backdrop = activeItem.backdrop_path || activeItem.poster_path;
      const activeTitle = activeItem.title || activeItem.name;
      if (backdrop) {
        useAmbientStore.getState().setActiveBackdrop(backdrop, activeTitle);
      }
    }
  }, [activeItem]);

  // Auto rotation timer
  useEffect(() => {
    if (isPaused || isTrailerOpen || !displayItems || displayItems.length <= 1) return;
    const interval = setInterval(nextSlide, 7000);
    return () => clearInterval(interval);
  }, [isPaused, isTrailerOpen, displayItems, nextSlide]);

  // Close trailer modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTrailerOpen) {
        setIsTrailerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTrailerOpen]);

  const toggleFavorite = (id: string | number) => {
    setFavorites((prev) => {
      const updated = !prev[id];
      const nextMap = { ...prev, [id]: updated };
      try {
        localStorage.setItem("nightcast_favorites", JSON.stringify(nextMap));
      } catch {}
      triggerToast(updated ? "Added to Favorites" : "Removed from Favorites", "success");
      return nextMap;
    });
  };

  const toggleWatchlist = (itemToToggle: MediaItem) => {
    const cleanId = String(itemToToggle.id);
    const currentlyAdded = !!watchlist[itemToToggle.id] || !!watchlist[cleanId];
    const nextState = !currentlyAdded;

    setWatchlist((prev) => ({
      ...prev,
      [itemToToggle.id]: nextState,
      [cleanId]: nextState,
    }));

    // 1. Update localStorage nightcast_watchlist with rich metadata
    try {
      const stored = localStorage.getItem("nightcast_watchlist");
      const map = stored ? JSON.parse(stored) : {};
      const itemTitle = itemToToggle.title || itemToToggle.name || "Untitled";
      const itemType = itemToToggle.media_type || (itemToToggle.first_air_date ? "tv" : "movie");

      if (nextState) {
        map[cleanId] = {
          id: itemToToggle.id,
          media_id: cleanId,
          title: itemTitle,
          poster_path: itemToToggle.poster_path || null,
          backdrop_path: itemToToggle.backdrop_path || null,
          media_type: itemType,
          vote_average: itemToToggle.vote_average || 0,
          release_date: itemToToggle.release_date || itemToToggle.first_air_date,
        };
      } else {
        delete map[cleanId];
        delete map[String(itemToToggle.id)];
      }
      localStorage.setItem("nightcast_watchlist", JSON.stringify(map));
    } catch (err) {
      console.error("Failed to update local watchlist:", err);
    }

    // 2. Cloud Sync: backend /api/user/favorites if logged in
    const activeProfile = useUserStore.getState().activeProfile;
    if (activeProfile && itemToToggle.id) {
      const itemTitle = itemToToggle.title || itemToToggle.name || "Untitled";
      const itemType = itemToToggle.media_type || (itemToToggle.first_air_date ? "tv" : "movie");

      if (nextState) {
        apiFetch("/api/user/favorites", {
          method: "POST",
          headers: { "X-Profile-ID": activeProfile.id },
          body: JSON.stringify({
            media_id: cleanId,
            media_type: itemType,
            title: itemTitle,
            poster_path: itemToToggle.poster_path || "",
          }),
        }).catch((err) => console.error("Failed to sync favorite to backend:", err));
      } else {
        apiFetch(`/api/user/favorites/${cleanId}`, {
          method: "DELETE",
          headers: { "X-Profile-ID": activeProfile.id },
        }).catch((err) => console.error("Failed to delete favorite from backend:", err));
      }
    }

    // 3. Dispatch real-time global event
    window.dispatchEvent(
      new CustomEvent("nightcast:watchlist-update", {
        detail: { id: itemToToggle.id, added: nextState },
      })
    );

    triggerToast(nextState ? `Added "${itemToToggle.title || itemToToggle.name || 'Title'}" to Watchlist` : `Removed from Watchlist`, "success");
  };

  const handleOpenTrailer = async (item: MediaItem) => {
    setIsLoadingTrailer(true);
    setIsTrailerOpen(true);
    const type = item.media_type || (item.first_air_date ? "tv" : "movie");
    try {
      const details = await apiFetch(`/api/tmdb/${type}/${item.id}`);
      const trailer = details?.videos?.results?.find(
        (v: any) => v.type === "Trailer" && v.site === "YouTube"
      );
      if (trailer?.key) {
        setTrailerKey(trailer.key);
      } else {
        setTrailerKey(null);
      }
    } catch {
      setTrailerKey(null);
    } finally {
      setIsLoadingTrailer(false);
    }
  };

  if (!activeItem) return null;

  const title = activeItem.title || activeItem.name || "CINEMA";
  const releaseDate = activeItem.release_date || activeItem.first_air_date || "";
  const formattedDate = formatReleaseDate(releaseDate);
  const releaseYear = releaseDate.split("-")[0] || "2024";
  const type = activeItem.media_type || (activeItem.first_air_date ? "tv" : "movie");
  const backdropUrl = ImageService.getBackdrop(activeItem.backdrop_path, "original", title);

  // Derive genres
  const genreNames = (activeItem.genre_ids || [])
    .slice(0, 2)
    .map((id) => GENRE_MAP[id])
    .filter(Boolean)
    .join(", ") || "action, thriller";

  // Subtitle / Tagline
  const subtitle = activeItem.tagline || `${title} (${releaseYear})`;

  return (
    <div
      className="relative w-full h-screen max-h-screen h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#0B131B] select-none flex flex-col justify-between pt-16 sm:pt-7 md:pt-8 pb-20 sm:pb-4 px-4 sm:px-10 md:px-14 lg:px-16"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Cinematic Fullscreen Backdrop */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeItem.id}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 select-none transform-gpu will-change-transform z-0"
        >
          <Image
            src={backdropUrl}
            alt={`${title} backdrop cinematic artwork`}
            fill
            className="object-cover object-right-top lg:object-center opacity-95 brightness-[0.92]"
            priority
            placeholder="blur"
            blurDataURL={ImageService.getBlurHash()}
          />

          {/* Scrim Overlays - Matching Reference Gradient Vignettes */}
          <div className="absolute top-0 inset-x-0 h-32 sm:h-40 bg-gradient-to-b from-[#0B131B]/90 via-[#0B131B]/40 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 left-0 w-full sm:w-4/5 md:w-3/5 bg-gradient-to-r from-[#0B131B] via-[#0B131B]/85 to-transparent z-15 pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 h-48 sm:h-56 bg-gradient-to-t from-[#0B131B] via-[#0B131B]/80 to-transparent z-15 pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* Hero Details Block (Vertically Centered with Compact Proportions) */}
      <div className="relative z-20 my-auto max-w-xl sm:max-w-2xl lg:max-w-3xl space-y-2 sm:space-y-3 pointer-events-auto pr-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={`info-${activeItem.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-2 sm:space-y-3"
          >
            {/* Metadata Row: Date & Genres */}
            <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-semibold tracking-wider text-[#A4C8E1] uppercase">
              <span>{formattedDate}</span>
              <span className="w-1 h-1 rounded-full bg-[#A4C8E1]/50" />
              <span>{genreNames}</span>
            </div>

            {/* Title with Responsive Scaling & 2-Line Limit */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#F0F0F0] uppercase font-sans drop-shadow-2xl leading-[1.08] line-clamp-2">
              {title}
            </h1>

            {/* Subtitle / Tagline */}
            <p className="text-xs sm:text-sm text-[#F0F0F0]/70 font-sans font-normal tracking-wide drop-shadow max-w-lg line-clamp-1 sm:line-clamp-2">
              {subtitle}
            </p>

            {/* Action Buttons: Watch now & Trailer */}
            <div className="flex items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2">
              {/* "Watch now" Button (Crisp Translucent White Pill with Black Play Icon) */}
              <Link
                href={`/watch/${type}/${activeItem.id}`}
                aria-label={`Watch ${title} now`}
                className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-[#F0F0F0]/90 hover:bg-white text-[#0B131B] backdrop-blur-xl border border-white/40 font-semibold text-xs sm:text-sm tracking-wide flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_8px_32px_rgba(255,255,255,0.2)] cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B131B]"
              >
                <Play className="w-4 h-4 fill-[#0B131B] text-[#0B131B] ml-0.5 transition-transform duration-200 group-hover:scale-110" />
                <span>Watch now</span>
              </Link>

              {/* "Trailer" Button (Frosted Dark Glass Pill with Outline) */}
              <button
                type="button"
                onClick={() => handleOpenTrailer(activeItem)}
                aria-label={`Watch trailer for ${title}`}
                className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-[#F0F0F0] hover:text-white border border-white/[0.16] text-xs sm:text-sm font-medium tracking-wide flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl backdrop-saturate-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B131B]"
              >
                Trailer
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Controls Row: Thumbnails on Left, Quick Actions on Right */}
      <div className="relative z-30 w-full flex items-end justify-between gap-4 shrink-0 pointer-events-none pb-1 sm:pb-2">
        {/* Bottom-Left Thumbnail Carousel */}
        <div className="flex items-start gap-2 sm:gap-2.5 pointer-events-auto">
          {displayItems.map((m, idx) => {
            const isActive = idx === currentIndex;
            const poster = ImageService.getPoster(m.poster_path, "w500", m.title || m.name);

            return (
              <button
                key={m.id}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Select slide ${idx + 1}: ${m.title || m.name}`}
                className={`flex flex-col items-center group cursor-pointer transition-all duration-200 rounded-md sm:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] ${
                  idx >= 3 ? "hidden sm:flex" : "flex"
                }`}
              >
                {/* Thumbnail Card */}
                <div
                  className={`relative w-10 sm:w-12 md:w-13 aspect-[3/4] rounded-md sm:rounded-lg overflow-hidden bg-black/60 transition-all duration-200 ${
                    isActive
                      ? "ring-2 ring-[#A4C8E1] shadow-[0_4px_16px_rgba(164,200,225,0.35)] scale-105 opacity-100"
                      : "opacity-45 group-hover:opacity-85 border border-white/[0.12] group-hover:border-white/[0.25] group-hover:scale-100"
                  }`}
                >
                  <Image
                    src={poster}
                    alt={`${m.title || m.name || "Movie"} poster thumbnail`}
                    fill
                    sizes="60px"
                    className="object-cover"
                  />
                </div>

                {/* Active Progress Bar Line (Under Active Item) */}
                <div className="w-full mt-1.5 h-0.5 rounded-full overflow-hidden bg-white/15">
                  {isActive && (
                    <motion.div
                      layoutId="active-indicator"
                      className="h-full bg-[#A4C8E1] rounded-full shadow-[0_0_8px_rgba(164,200,225,0.9)]"
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom-Right Floating Quick Action Buttons (Heart, Bookmark, Plus) */}
        <div className="flex items-center gap-2 sm:gap-2.5 pointer-events-auto">
          {/* Heart / Favorite Button */}
          <button
            type="button"
            onClick={() => toggleFavorite(activeItem.id)}
            className={`w-9 sm:w-10 h-9 sm:h-10 rounded-full flex items-center justify-center backdrop-blur-2xl backdrop-saturate-150 border transition-all duration-200 active:scale-95 cursor-pointer ${
              favorites[activeItem.id]
                ? "bg-rose-500/25 border-rose-500/50 text-rose-400 scale-105 shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                : "bg-white/[0.06] hover:bg-white/[0.14] border-white/[0.14] text-[#F0F0F0]/80 hover:text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.5)]"
            }`}
            title="Favorite"
            aria-label="Favorite"
          >
            <Heart
              className={`w-4 sm:w-4.5 h-4 sm:h-4.5 ${
                favorites[activeItem.id] ? "fill-current" : ""
              }`}
            />
          </button>

          {/* Bookmark / Watchlist Button */}
          <button
            type="button"
            onClick={() => toggleWatchlist(activeItem)}
            className={`w-9 sm:w-10 h-9 sm:h-10 rounded-full flex items-center justify-center backdrop-blur-2xl backdrop-saturate-150 border transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] ${
              watchlist[activeItem.id]
                ? "bg-[#39AEA9]/25 border-[#39AEA9]/60 text-[#39AEA9] scale-105 shadow-[0_0_15px_rgba(57,174,169,0.4)]"
                : "bg-white/[0.06] hover:bg-white/[0.14] border-white/[0.14] text-[#F0F0F0]/80 hover:text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.5)]"
            }`}
            title="Watchlist"
            aria-label="Watchlist"
          >
            <Bookmark
              className={`w-4 sm:w-4.5 h-4 sm:h-4.5 ${
                watchlist[activeItem.id] ? "fill-current" : ""
              }`}
            />
          </button>

          {/* Plus / Add to Collection Button */}
          <button
            type="button"
            onClick={() => triggerToast("Added to Playlist", "success")}
            className="w-9 sm:w-10 h-9 sm:h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/[0.14] backdrop-blur-2xl backdrop-saturate-150 flex items-center justify-center text-[#F0F0F0]/80 hover:text-white transition-all duration-200 active:scale-95 cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
            title="Add to Playlist"
            aria-label="Add to Playlist"
          >
            <Plus className="w-4 sm:w-4.5 h-4 sm:h-4.5" />
          </button>
        </div>
      </div>

      {/* YouTube Trailer Modal */}
      {isTrailerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Official Trailer"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsTrailerOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl aspect-video bg-[#0B131B]/95 backdrop-blur-3xl rounded-2xl overflow-hidden border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_25px_60px_rgba(0,0,0,0.95)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsTrailerOpen(false)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/[0.1] hover:bg-white/[0.2] text-white flex items-center justify-center transition border border-white/[0.15] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
              title="Close Trailer"
              aria-label="Close trailer"
            >
              <X className="w-5 h-5" />
            </button>

            {isLoadingTrailer ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white">
                <div className="w-8 h-8 border-2 border-white/40 border-t-[#39AEA9] animate-spin rounded-full" />
                <p className="text-xs text-white/70">Loading trailer...</p>
              </div>
            ) : trailerKey ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`}
                title={`${title} Official Trailer`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white p-6 text-center">
                <Film className="w-12 h-12 text-[#8FA8AD]" />
                <h3 className="text-lg font-bold text-[#F0F0F0]">No Official Trailer Found</h3>
                <p className="text-xs text-[#8FA8AD] max-w-sm">
                  We could not find an official YouTube trailer for this title. You can still stream it directly by clicking Watch Now.
                </p>
                <Link
                  href={`/watch/${type}/${activeItem.id}`}
                  className="mt-2 px-6 py-2 rounded-full bg-[#F0F0F0] text-[#0B131B] font-semibold text-xs hover:bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                >
                  Watch Now
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(HeroCarousel);