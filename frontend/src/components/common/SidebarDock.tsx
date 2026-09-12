"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Home,
  Film,
  Tv,
  Award,
  Bookmark,
  Layers,
  X,
  Compass,
} from "lucide-react";

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

export default function SidebarDock({ onOpenCategories }: SidebarDockProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCategoriesDrawerOpen, setIsCategoriesDrawerOpen] = useState(false);

  const toggleCategories = () => {
    setIsCategoriesDrawerOpen((prev) => !prev);
    if (onOpenCategories) onOpenCategories();
  };

  const handleNavClick = (
    item: { id: string; href: string; action?: string },
    e: React.MouseEvent
  ) => {
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
      isActive: pathname.startsWith("/movies") || pathname.startsWith("/movie"),
    },
    {
      id: "shows",
      label: "TV Shows",
      icon: Tv,
      href: "/shows",
      isActive: pathname.startsWith("/shows") || pathname.startsWith("/tv"),
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
      label: "My List & Watchlist",
      icon: Bookmark,
      href: "/profile",
      isActive: pathname.startsWith("/profile"),
    },
    {
      id: "categories-link",
      label: "Browse Categories",
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
        className="hidden sm:flex fixed top-0 left-0 bottom-0 w-[72px] sm:w-[80px] z-50 flex-col items-center py-5 bg-[#0B131B]/90 backdrop-blur-2xl border-r border-[#4A6E8D]/25 shadow-[0_8px_32px_rgba(7,12,18,0.75)] select-none transition-all duration-300"
        aria-label="Main Navigation"
      >
        {/* Top Apps/Grid Menu Button */}
        <div className="mb-6 relative group">
          <button
            type="button"
            onClick={toggleCategories}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 ${
              isCategoriesDrawerOpen
                ? "bg-[#A4C8E1]/25 text-[#F0F0F0] border border-[#A4C8E1]/50 shadow-[0_0_20px_rgba(164,200,225,0.35)]"
                : "text-[#A4C8E1] hover:text-[#F0F0F0] bg-[#1B3A57]/50 hover:bg-[#2C3E50]/70 backdrop-blur-xl border border-[#4A6E8D]/30 shadow-md"
            }`}
            title="Browse All Categories"
            aria-label="Browse All Categories"
          >
            <LayoutGrid className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
          </button>
          <span className="absolute left-[76px] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-[#0F1A24]/95 backdrop-blur-xl border border-[#4A6E8D]/30 text-[#F0F0F0] text-xs font-medium whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
            Browse Categories
          </span>
        </div>

        {/* Navigation Icon Stack */}
        <nav className="flex-1 flex flex-col items-center gap-3.5 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive;

            const buttonClasses = `relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 ${
              active
                ? "bg-[#A4C8E1]/25 text-[#F0F0F0] backdrop-blur-xl border border-[#A4C8E1]/45 shadow-[0_0_20px_rgba(164,200,225,0.3)]"
                : "bg-[#1B3A57]/30 hover:bg-[#2C3E50]/55 text-[#A4C8E1]/75 hover:text-[#F0F0F0] backdrop-blur-md border border-[#4A6E8D]/20 hover:border-[#A4C8E1]/35"
            }`;

            return (
              <div key={item.id} className="relative group">
                <Link
                  href={item.href}
                  onClick={(e) => handleNavClick(item, e)}
                  title={item.label}
                  aria-label={item.label}
                  className={buttonClasses}
                >
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                </Link>
                <span className="absolute left-[76px] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-[#0F1A24]/95 backdrop-blur-xl border border-[#4A6E8D]/30 text-[#F0F0F0] text-xs font-medium whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                  {item.label}
                </span>
              </div>
            );
          })}
        </nav>

        {/* Bottom Profile Link / Indicator */}
        <div className="mt-auto relative group">
          <Link
            href="/profile"
            className="w-10 h-10 rounded-full overflow-hidden border border-[#4A6E8D]/35 hover:border-[#A4C8E1]/70 transition-all duration-200 flex items-center justify-center bg-[#1B3A57]/50 hover:bg-[#2C3E50]/70 backdrop-blur-xl text-[#A4C8E1] hover:text-[#F0F0F0] font-bold text-xs shadow-md active:scale-95"
            title="User Profile & Settings"
          >
            N
          </Link>
          <span className="absolute left-[76px] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-[#0F1A24]/95 backdrop-blur-xl border border-[#4A6E8D]/30 text-[#F0F0F0] text-xs font-medium whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
            Profile & Settings
          </span>
        </div>
      </aside>

      {/* Categories Drawer Modal when triggered */}
      {isCategoriesDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#0B131B]/80 backdrop-blur-md flex items-center justify-center sm:justify-start p-4 sm:p-0 sm:pl-24 animate-in fade-in duration-200"
          onClick={() => setIsCategoriesDrawerOpen(false)}
        >
          <div
            className="w-full sm:w-80 max-w-sm sm:max-w-[calc(100vw-100px)] bg-[#0B131B]/95 border border-[#4A6E8D]/35 rounded-3xl p-5 sm:p-6 shadow-[0_24px_60px_rgba(7,12,18,0.95)] backdrop-blur-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-left-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#4A6E8D]/25 mb-4">
              <div className="flex items-center gap-2.5 text-[#F0F0F0] font-semibold text-base">
                <Compass className="w-5 h-5 text-[#A4C8E1]" />
                <span>Explore Genres</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoriesDrawerOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#A4C8E1]/80 hover:text-[#F0F0F0] bg-[#1B3A57]/50 hover:bg-[#2C3E50]/70 border border-[#4A6E8D]/25 transition cursor-pointer active:scale-95"
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
                  className="px-4 py-3 rounded-xl text-sm font-medium text-[#F0F0F0]/90 hover:text-[#F0F0F0] bg-[#1B3A57]/30 hover:bg-[#2C3E50]/55 border border-[#4A6E8D]/20 hover:border-[#A4C8E1]/40 transition-all flex items-center justify-between shadow-sm active:scale-98"
                >
                  <span>{cat.name}</span>
                  <span className="text-xs text-[#A4C8E1]/50 group-hover:text-[#A4C8E1]">&rarr;</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Dock for small screens (< 640px) */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 h-16 bg-[#0B131B]/95 backdrop-blur-2xl border-t border-[#4A6E8D]/30 z-50 flex items-center justify-around px-2 shadow-[0_-8px_32px_rgba(7,12,18,0.85)] select-none"
        aria-label="Mobile Navigation"
      >
        {/* 1. Home */}
        <Link
          href="/"
          onClick={(e) => handleNavClick(navItems[0], e)}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 active:scale-95 ${
            pathname === "/"
              ? "text-[#F0F0F0]"
              : "text-[#4A6E8D] hover:text-[#A4C8E1]"
          }`}
        >
          <div className={`p-1 rounded-full transition-colors ${pathname === "/" ? "bg-[#A4C8E1]/20 text-[#A4C8E1]" : ""}`}>
            <Home className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-sans font-medium tracking-tight ${pathname === "/" ? "text-[#A4C8E1] font-semibold" : ""}`}>
            Home
          </span>
        </Link>

        {/* 2. Movies */}
        <Link
          href="/movies"
          onClick={(e) => handleNavClick(navItems[1], e)}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 active:scale-95 ${
            pathname.startsWith("/movies") || pathname.startsWith("/movie")
              ? "text-[#F0F0F0]"
              : "text-[#4A6E8D] hover:text-[#A4C8E1]"
          }`}
        >
          <div className={`p-1 rounded-full transition-colors ${pathname.startsWith("/movies") || pathname.startsWith("/movie") ? "bg-[#A4C8E1]/20 text-[#A4C8E1]" : ""}`}>
            <Film className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-sans font-medium tracking-tight ${pathname.startsWith("/movies") || pathname.startsWith("/movie") ? "text-[#A4C8E1] font-semibold" : ""}`}>
            Movies
          </span>
        </Link>

        {/* 3. TV Shows */}
        <Link
          href="/shows"
          onClick={(e) => handleNavClick(navItems[2], e)}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 active:scale-95 ${
            pathname.startsWith("/shows") || pathname.startsWith("/tv")
              ? "text-[#F0F0F0]"
              : "text-[#4A6E8D] hover:text-[#A4C8E1]"
          }`}
        >
          <div className={`p-1 rounded-full transition-colors ${pathname.startsWith("/shows") || pathname.startsWith("/tv") ? "bg-[#A4C8E1]/20 text-[#A4C8E1]" : ""}`}>
            <Tv className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-sans font-medium tracking-tight ${pathname.startsWith("/shows") || pathname.startsWith("/tv") ? "text-[#A4C8E1] font-semibold" : ""}`}>
            Shows
          </span>
        </Link>

        {/* 4. Explore / Genres */}
        <button
          type="button"
          onClick={toggleCategories}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
            isCategoriesDrawerOpen
              ? "text-[#F0F0F0]"
              : "text-[#4A6E8D] hover:text-[#A4C8E1]"
          }`}
        >
          <div className={`p-1 rounded-full transition-colors ${isCategoriesDrawerOpen ? "bg-[#A4C8E1]/20 text-[#A4C8E1]" : ""}`}>
            <LayoutGrid className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-sans font-medium tracking-tight ${isCategoriesDrawerOpen ? "text-[#A4C8E1] font-semibold" : ""}`}>
            Explore
          </span>
        </button>

        {/* 5. Profile */}
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 active:scale-95 ${
            pathname.startsWith("/profile")
              ? "text-[#F0F0F0]"
              : "text-[#4A6E8D] hover:text-[#A4C8E1]"
          }`}
        >
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
            pathname.startsWith("/profile")
              ? "bg-[#A4C8E1] text-[#0B131B] shadow-[0_0_12px_rgba(164,200,225,0.6)]"
              : "bg-[#1B3A57]/70 text-[#A4C8E1] border border-[#4A6E8D]/40"
          }`}>
            N
          </div>
          <span className={`text-[10px] font-sans font-medium tracking-tight ${pathname.startsWith("/profile") ? "text-[#A4C8E1] font-semibold" : ""}`}>
            Profile
          </span>
        </Link>
      </nav>
    </>
  );
}
