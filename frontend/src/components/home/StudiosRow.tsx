"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Studio {
  id: string;
  name: string;
  href: string;
  color: string;
  logo: React.ReactNode;
}

const STUDIOS: Studio[] = [
  {
    id: "netflix",
    name: "Netflix",
    href: "/search?studio=netflix&name=Netflix&provider=8&network=213",
    color: "#E50914",
    logo: (
      <span className="font-black text-xl sm:text-2xl tracking-tighter text-[#E50914] font-display uppercase drop-shadow-[0_0_12px_rgba(229,9,20,0.5)]">
        NETFLIX
      </span>
    ),
  },
  {
    id: "prime",
    name: "Amazon Prime Video",
    href: "/search?studio=prime&name=Amazon%20Prime%20Video&provider=9|119&network=1024",
    color: "#00A8E1",
    logo: (
      <div className="flex flex-col items-center leading-none">
        <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#00A8E1] lowercase font-sans">
          prime video
        </span>
        <svg className="w-12 h-2.5 text-[#00A8E1] fill-current -mt-0.5" viewBox="0 0 100 20">
          <path d="M5 5 Q50 22 95 8 Q55 14 5 5 Z" />
          <polygon points="90,4 98,8 91,12" />
        </svg>
      </div>
    ),
  },
  {
    id: "appletv",
    name: "Apple TV",
    href: "/search?studio=appletv&name=Apple%20TV%2B&provider=350&network=2552",
    color: "#FFFFFF",
    logo: (
      <div className="flex items-center gap-1 font-sans text-white font-semibold text-base sm:text-lg">
        <svg className="w-5 h-5 fill-current" viewBox="0 0 170 170">
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.66-7.79-11.89-14.24-5.35-8.2-9.62-17.5-12.82-27.91-3.2-10.41-4.8-20.59-4.8-30.54 0-14.07 3.5-25.75 10.5-35.03 7-9.28 15.89-13.98 26.67-14.1 5.35 0 11.04 1.34 17.07 4.02 6.03 2.68 9.97 4.08 11.82 4.2 1.48-.22 5.66-1.68 12.54-4.38 6.88-2.7 12.74-3.86 17.58-3.5 13.06.87 23.36 5.86 30.9 14.97-11.45 6.96-17.05 16.36-16.8 28.2.25 9.4 3.86 17.3 10.84 23.7 6.98 6.4 15.35 10.05 25.11 10.95-2.23 6.96-5.12 14.28-8.67 21.96zM119.22 33.64c0-7.39 2.68-14.34 8.04-20.85 5.36-6.51 12.01-10.84 19.95-12.99.74 8.02-1.9 15.22-7.92 21.6-6.02 6.38-13.08 10.45-20.07 12.24z"/>
        </svg>
        <span className="font-extrabold tracking-tighter">tv+</span>
      </div>
    ),
  },
  {
    id: "crunchyroll",
    name: "Crunchyroll",
    href: "/search?studio=crunchyroll&name=Crunchyroll&provider=283&genre=16&lang=ja",
    color: "#F47521",
    logo: (
      <div className="flex items-center gap-1.5 text-[#F47521]">
        <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-current" />
        </div>
        <span className="font-black text-sm sm:text-base tracking-tight font-sans">
          crunchyroll
        </span>
      </div>
    ),
  },
  {
    id: "disney",
    name: "Disney Plus",
    href: "/search?studio=disney&name=Disney%2B&provider=337&network=2739",
    color: "#00D2FF",
    logo: (
      <div className="flex items-center text-[#00D2FF] font-serif">
        <span className="font-black text-xl sm:text-2xl italic tracking-tight font-display">
          Disney
        </span>
        <span className="text-xl sm:text-2xl font-bold -ml-0.5 text-white">+</span>
      </div>
    ),
  },
  {
    id: "hulu",
    name: "Hulu",
    href: "/search?studio=hulu&name=Hulu&provider=15&network=453",
    color: "#1CE783",
    logo: (
      <span className="font-black text-2xl sm:text-3xl tracking-tight text-[#1CE783] font-sans lowercase drop-shadow-[0_0_12px_rgba(28,231,131,0.4)]">
        hulu
      </span>
    ),
  },
  {
    id: "hbo",
    name: "HBO Max",
    href: "/search?studio=hbo&name=HBO%20Max&provider=384|1899&network=3186|49",
    color: "#9945FF",
    logo: (
      <div className="flex items-center gap-1">
        <span className="font-black text-lg sm:text-xl tracking-tighter text-white font-sans">
          HBO
        </span>
        <span className="font-bold text-xs sm:text-sm text-[#9945FF] uppercase tracking-wider">
          MAX
        </span>
      </div>
    ),
  },
  {
    id: "mgm",
    name: "MGM Plus",
    href: "/search?studio=mgm&name=MGM%2B&provider=569&company=21",
    color: "#D4AF37",
    logo: (
      <div className="flex items-center text-[#D4AF37] font-serif">
        <span className="font-black text-lg sm:text-xl tracking-wider font-display">
          MGM
        </span>
        <span className="text-lg font-bold text-white ml-0.5">+</span>
      </div>
    ),
  },
  {
    id: "paramount",
    name: "Paramount Plus",
    href: "/search?studio=paramount&name=Paramount%2B&provider=531&network=4330",
    color: "#0064FF",
    logo: (
      <div className="flex items-center gap-1 text-white font-sans">
        <span className="font-black text-sm sm:text-base italic tracking-tight font-serif">
          Paramount
        </span>
        <span className="text-base font-extrabold text-[#0064FF]">+</span>
      </div>
    ),
  },
  {
    id: "marvel",
    name: "Marvel Studios",
    href: "/search?studio=marvel&name=Marvel%20Studios&company=420",
    color: "#E23636",
    logo: (
      <div className="px-2 py-0.5 bg-[#E23636] text-white font-black text-[11px] sm:text-xs tracking-widest uppercase font-display border border-white/30 rounded">
        MARVEL
      </div>
    ),
  },
];

export default function StudiosRow() {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScrollPosition = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const handleScroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="space-y-3 px-4 sm:px-6 md:px-12 select-none relative group/row">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight">
          Studios & Platforms
        </h2>

        {/* Desktop Navigation Arrows */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => handleScroll("left")}
            disabled={!showLeftArrow}
            className={`w-8 h-8 rounded-full bg-[#081E30] border border-[#5C7C89]/30 text-[#5C7C89] hover:text-white hover:bg-[#1F4959] flex items-center justify-center transition-all cursor-pointer ${
              !showLeftArrow ? "opacity-30 cursor-not-allowed" : "hover:border-[#5C7C89]"
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleScroll("right")}
            disabled={!showRightArrow}
            className={`w-8 h-8 rounded-full bg-[#081E30] border border-[#5C7C89]/30 text-[#5C7C89] hover:text-white hover:bg-[#1F4959] flex items-center justify-center transition-all cursor-pointer ${
              !showRightArrow ? "opacity-30 cursor-not-allowed" : "hover:border-[#5C7C89]"
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Studios Carousel */}
      <div
        ref={rowRef}
        onScroll={checkScrollPosition}
        className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pt-2 pb-2"
      >
        {STUDIOS.map((studio) => (
          <Link
            key={studio.id}
            href={studio.href}
            className="group/studio flex flex-col items-center gap-2 shrink-0 snap-start select-none cursor-pointer"
          >
            {/* Studio Capsule Card */}
            <div className="w-36 sm:w-44 md:w-48 h-20 sm:h-24 rounded-2xl bg-[#081E30] border border-[#5C7C89]/25 flex items-center justify-center p-4 transition-all duration-300 group-hover/studio:scale-105 group-hover/studio:border-[#5C7C89] group-hover/studio:bg-[#0D2A42] group-hover/studio:shadow-[0_10px_25px_-5px_rgba(31,73,89,0.5),0_0_15px_rgba(92,124,137,0.3)] shadow-md">
              <div className="transition-transform duration-300 group-hover/studio:scale-110">
                {studio.logo}
              </div>
            </div>

            {/* Label */}
            <span className="text-[11px] sm:text-xs font-semibold text-[#5C7C89] group-hover/studio:text-white transition-colors truncate max-w-[140px] text-center">
              {studio.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
