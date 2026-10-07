"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Film,
  Tv,
  Award,
  Bookmark,
  Layers,
  X,
  Compass,
  Trophy,
} from "lucide-react";
import { useUserStore } from "../../store/userStore";

interface SidebarDockProps {
  onOpenCategories?: () => void;
}

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

/**
 * Custom dark glass tooltip component
 * - Appears to the right of the icon with an 8-10px offset (left-full ml-3)
 * - Only shows on desktop mouse hover for inactive items
 * - Instantly dismissed on click or when item is active
 */
function SidebarTooltip({ label, active }: { label: string; active?: boolean }) {
  if (active) return null;

  return (
    <div
      role="tooltip"
      className="hidden [@media(hover:hover)]:flex absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#0B131B]/85 backdrop-blur-2xl border border-white/[0.18] text-[#F0F0F0] text-xs font-semibold tracking-wide shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_10px_30px_rgba(0,0,0,0.9),0_0_15px_rgba(57,174,169,0.25)] whitespace-nowrap pointer-events-none select-none z-[999] opacity-0 translate-x-1.5 scale-95 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100 group-active:opacity-0 group-active:pointer-events-none transition-all duration-150 delay-75 ease-[cubic-bezier(0.4,0,0.2,1)] items-center"
    >
      {/* Visual Caret Arrow pointing back to the icon */}
      <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#0B131B] border-l border-b border-white/[0.18] rotate-45 pointer-events-none" />
      <span className="relative z-10">{label}</span>
    </div>
  );
}

export default function SidebarDock({ onOpenCategories }: SidebarDockProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeProfile } = useUserStore();
  const [isCategoriesDrawerOpen, setIsCategoriesDrawerOpen] = useState(false);
  const [clickedId, setClickedId] = useState<string | null>(null);

  // Automatically reset clicked item on route change
  useEffect(() => {
    setClickedId(null);
  }, [pathname]);

  // Handle Escape key to dismiss categories drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCategoriesDrawerOpen) {
        setIsCategoriesDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCategoriesDrawerOpen]);

  const toggleCategories = () => {
    setIsCategoriesDrawerOpen((prev) => !prev);
    if (onOpenCategories) onOpenCategories();
  };

  const handleNavClick = (
    item: { id: string; href: string; action?: string },
    e: React.MouseEvent
  ) => {
    setClickedId(item.id);

    if (item.action === "categories") {
      e.preventDefault();
      toggleCategories();
      return;
    }

    if (item.id === "home") {
      if (pathname === "/") {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    if (item.id === "top-rated") {
      e.preventDefault();
      const el = document.getElementById("top10");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        router.push("/#top10");
      }
      return;
    }
  };

  const navItems = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      href: "/",
      isActive: pathname === "/",
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
      id: "sports",
      label: "Live Sports",
      icon: Trophy,
      href: "/sports",
      isActive: pathname.startsWith("/sports"),
    },
    {
      id: "top-rated",
      label: "Top 10 Ranked",
      icon: Award,
      href: "/#top10",
      isActive: false,
    },
    {
      id: "watchlist",
      label: "My Watchlist",
      icon: Bookmark,
      href: "/profile",
      isActive: pathname.startsWith("/profile"),
    },
    {
      id: "categories-link",
      label: "Categories",
      icon: Layers,
      href: "#categories",
      action: "categories",
      isActive: isCategoriesDrawerOpen,
    },
  ];

  return (
    <>
      {/* Desktop Vertical Left Dock (Hidden on mobile screens < 640px) */}
      <aside
        className="hidden sm:flex fixed top-0 left-0 bottom-0 w-[72px] md:w-[80px] z-50 flex-col items-center py-6 sm:py-8 bg-[#0B131B]/50 backdrop-blur-2xl backdrop-saturate-150 border-r border-white/[0.12] shadow-[inset_-1px_0_1px_0_rgba(255,255,255,0.08),inset_1px_0_1px_0_rgba(255,255,255,0.03),0_8px_32px_0_rgba(0,0,0,0.7)] select-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        aria-label="Main Navigation"
      >
        {/* Navigation Icon Stack: Consistent 20-24px vertical spacing */}
        <nav className="flex-1 flex flex-col items-center gap-5 sm:gap-6 w-full" aria-label="Navigation Links">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive;
            const isButton = item.action === "categories";

            return (
              <div key={item.id} className="relative w-full flex items-center justify-center group">
                {/* Glowing Accent Bar on Sidebar's Left Edge for Active State */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3.5px] h-6 rounded-r-full bg-gradient-to-b from-[#A4C8E1] to-[#39AEA9] shadow-[0_0_14px_rgba(57,174,169,0.95),0_0_6px_#39AEA9] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    aria-hidden="true"
                  />
                )}

                {isButton ? (
                  <button
                    type="button"
                    onClick={(e) => handleNavClick(item, e)}
                    aria-label={item.label}
                    aria-expanded={isCategoriesDrawerOpen}
                    aria-haspopup="dialog"
                    className={`relative w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B131B] ${
                      active
                        ? "bg-[#39AEA9]/20 text-[#39AEA9] backdrop-blur-xl border border-[#39AEA9]/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_0_20px_rgba(57,174,169,0.35)]"
                        : "bg-transparent text-[#8FA8AD] hover:bg-white/[0.08] hover:backdrop-blur-md hover:text-white hover:border hover:border-white/[0.12] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-110 ${
                        active ? "text-[#39AEA9] drop-shadow-[0_0_8px_rgba(57,174,169,0.6)]" : ""
                      }`}
                    />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={(e) => handleNavClick(item, e)}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    className={`relative w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B131B] ${
                      active
                        ? "bg-[#39AEA9]/20 text-[#39AEA9] backdrop-blur-xl border border-[#39AEA9]/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_0_20px_rgba(57,174,169,0.35)]"
                        : "bg-transparent text-[#8FA8AD] hover:bg-white/[0.08] hover:backdrop-blur-md hover:text-white hover:border hover:border-white/[0.12] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-110 ${
                        active ? "text-[#39AEA9] drop-shadow-[0_0_8px_rgba(57,174,169,0.6)]" : ""
                      }`}
                    />
                  </Link>
                )}

                <SidebarTooltip label={item.label} active={active || clickedId === item.id} />
              </div>
            );
          })}
        </nav>

        {/* Bottom Profile Link */}
        <div className="mt-auto relative w-full flex items-center justify-center group pb-1">
          {pathname.startsWith("/profile") && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3.5px] h-6 rounded-r-full bg-gradient-to-b from-[#A4C8E1] to-[#39AEA9] shadow-[0_0_14px_rgba(57,174,169,0.95),0_0_6px_#39AEA9] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
              aria-hidden="true"
            />
          )}

          <Link
            href="/profile"
            onClick={() => setClickedId("profile")}
            aria-label="User Profile & Settings"
            aria-current={pathname.startsWith("/profile") ? "page" : undefined}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B131B] ${
              pathname.startsWith("/profile")
                ? "bg-[#39AEA9] text-[#0B131B] shadow-[0_0_20px_rgba(57,174,169,0.7),inset_0_1px_1px_rgba(255,255,255,0.35)] border border-[#39AEA9]"
                : "bg-white/[0.05] text-[#8FA8AD] backdrop-blur-xl border border-white/[0.15] hover:bg-white/[0.12] hover:text-white hover:border-white/[0.3] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_16px_rgba(0,0,0,0.5)]"
            }`}
          >
            {activeProfile?.name ? activeProfile.name.slice(0, 1).toUpperCase() : "N"}
          </Link>

          <SidebarTooltip label="Profile & Settings" active={pathname.startsWith("/profile") || clickedId === "profile"} />
        </div>
      </aside>

      {/* Categories Drawer Modal */}
      {isCategoriesDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="categories-heading"
          className="fixed inset-0 z-50 bg-[#0B131B]/80 backdrop-blur-md flex items-center justify-center sm:justify-start p-4 sm:p-0 sm:pl-24 animate-in fade-in duration-200"
          onClick={() => setIsCategoriesDrawerOpen(false)}
        >
          <div
            className="w-full sm:w-80 max-w-sm sm:max-w-[calc(100vw-100px)] bg-[#0B131B]/95 border border-white/[0.12] rounded-3xl p-5 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-left-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
              <div className="flex items-center gap-2.5 text-[#F0F0F0] font-semibold text-base">
                <Compass className="w-5 h-5 text-[#39AEA9]" />
                <span id="categories-heading">Explore Genres</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoriesDrawerOpen(false)}
                aria-label="Close Explore Genres"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#8FA8AD] hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  href={cat.href}
                  onClick={() => setIsCategoriesDrawerOpen(false)}
                  className="px-4 py-3 rounded-xl text-sm font-medium text-[#F0F0F0]/90 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-[#39AEA9]/40 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center justify-between shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                >
                  <span>{cat.name}</span>
                  <span className="text-xs text-[#39AEA9]">&rarr;</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Dock for small screens (< 640px) */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 h-[calc(4rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] bg-[#0B131B]/75 backdrop-blur-2xl backdrop-saturate-150 border-t border-white/[0.12] z-50 flex items-center justify-around px-2 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.12),0_-8px_32px_rgba(0,0,0,0.85)] select-none"
        aria-label="Mobile Navigation"
      >
        {/* 1. Home */}
        <Link
          href="/"
          onClick={(e) => handleNavClick(navItems[0], e)}
          aria-label="Home"
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] ${
            pathname === "/" ? "text-white" : "text-[#8FA8AD] hover:text-white"
          }`}
        >
          <div className={`p-1 rounded-full transition-colors ${pathname === "/" ? "bg-[#39AEA9]/20 text-[#39AEA9]" : ""}`}>
            <Home className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-sans font-medium tracking-tight ${pathname === "/" ? "text-[#39AEA9] font-semibold" : ""}`}>
            Home
          </span>
        </Link>

        {/* 2. Movies */}
        <Link
          href="/movies"
          onClick={(e) => handleNavClick(navItems[1], e)}
          aria-label="Movies"
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] ${
            pathname.startsWith("/movies") || pathname.startsWith("/movie") ? "text-white" : "text-[#8FA8AD] hover:text-white"
          }`}
        >
          <div className={`p-1 rounded-full transition-colors ${pathname.startsWith("/movies") || pathname.startsWith("/movie") ? "bg-[#39AEA9]/20 text-[#39AEA9]" : ""}`}>
            <Film className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-sans font-medium tracking-tight ${pathname.startsWith("/movies") || pathname.startsWith("/movie") ? "text-[#39AEA9] font-semibold" : ""}`}>
            Movies
          </span>
        </Link>

        {/* 3. TV Shows */}
        <Link
          href="/shows"
          onClick={(e) => handleNavClick(navItems[2], e)}
          aria-label="TV Shows"
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] ${
            pathname.startsWith("/shows") || pathname.startsWith("/tv") ? "text-white" : "text-[#8FA8AD] hover:text-white"
          }`}
        >
          <div className={`p-1 rounded-full transition-colors ${pathname.startsWith("/shows") || pathname.startsWith("/tv") ? "bg-[#39AEA9]/20 text-[#39AEA9]" : ""}`}>
            <Tv className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-sans font-medium tracking-tight ${pathname.startsWith("/shows") || pathname.startsWith("/tv") ? "text-[#39AEA9] font-semibold" : ""}`}>
            Shows
          </span>
        </Link>

        {/* 3.5 Sports */}
        <Link
          href="/sports"
          onClick={(e) => handleNavClick(navItems[3], e)}
          aria-label="Live Sports"
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] ${
            pathname.startsWith("/sports") ? "text-white" : "text-[#8FA8AD] hover:text-white"
          }`}
        >
          <div className={`p-1 rounded-full transition-colors ${pathname.startsWith("/sports") ? "bg-[#39AEA9]/20 text-[#39AEA9]" : ""}`}>
            <Trophy className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-sans font-medium tracking-tight ${pathname.startsWith("/sports") ? "text-[#39AEA9] font-semibold" : ""}`}>
            Sports
          </span>
        </Link>

        {/* 4. Explore / Genres */}
        <button
          type="button"
          onClick={toggleCategories}
          aria-label="Explore Categories"
          aria-expanded={isCategoriesDrawerOpen}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] ${
            isCategoriesDrawerOpen ? "text-white" : "text-[#8FA8AD] hover:text-white"
          }`}
        >
          <div className={`p-1 rounded-full transition-colors ${isCategoriesDrawerOpen ? "bg-[#39AEA9]/20 text-[#39AEA9]" : ""}`}>
            <Layers className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-sans font-medium tracking-tight ${isCategoriesDrawerOpen ? "text-[#39AEA9] font-semibold" : ""}`}>
            Explore
          </span>
        </button>

        {/* 5. Profile */}
        <Link
          href="/profile"
          aria-label="User Profile"
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] ${
            pathname.startsWith("/profile") ? "text-white" : "text-[#8FA8AD] hover:text-white"
          }`}
        >
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
            pathname.startsWith("/profile")
              ? "bg-[#39AEA9] text-[#0B131B] shadow-[0_0_12px_rgba(57,174,169,0.6)]"
              : "bg-white/[0.08] text-[#8FA8AD] border border-white/[0.12]"
          }`}>
            {activeProfile?.name ? activeProfile.name.slice(0, 1).toUpperCase() : "N"}
          </div>
          <span className={`text-[10px] font-sans font-medium tracking-tight ${pathname.startsWith("/profile") ? "text-[#39AEA9] font-semibold" : ""}`}>
            Profile
          </span>
        </Link>
      </nav>
    </>
  );
}
