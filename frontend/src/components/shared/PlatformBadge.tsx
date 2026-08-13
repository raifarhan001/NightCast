"use client";

import React from "react";

export type PlatformType = "netflix" | "prime" | "disney" | "appletv" | "hbo" | "hulu" | "paramount";

interface PlatformInfo {
  id: PlatformType;
  name: string;
  badge: React.ReactNode;
}

export function getPlatformForItem(item: {
  id: string | number;
  title?: string;
  name?: string;
  overview?: string;
  networks?: Array<{ name: string }>;
  production_companies?: Array<{ name: string }>;
}): PlatformType {
  const text = `${item.title || ""} ${item.name || ""} ${item.overview || ""}`.toLowerCase();

  // Known Franchises & Network patterns
  if (
    text.includes("disney") ||
    text.includes("marvel") ||
    text.includes("star wars") ||
    text.includes("pixar") ||
    text.includes("mandalorian") ||
    text.includes("loki") ||
    text.includes("avengers") ||
    text.includes("x-men")
  ) {
    return "disney";
  }

  if (
    text.includes("stranger things") ||
    text.includes("squid game") ||
    text.includes("wednesday") ||
    text.includes("money heist") ||
    text.includes("bridgerton") ||
    text.includes("black mirror") ||
    text.includes("arcane") ||
    text.includes("the witcher") ||
    text.includes("netflix")
  ) {
    return "netflix";
  }

  if (
    text.includes("reacher") ||
    text.includes("the boys") ||
    text.includes("invincible") ||
    text.includes("rings of power") ||
    text.includes("fallout") ||
    text.includes("jack ryan") ||
    text.includes("prime video") ||
    text.includes("amazon")
  ) {
    return "prime";
  }

  if (
    text.includes("ted lasso") ||
    text.includes("severance") ||
    text.includes("silo") ||
    text.includes("foundation") ||
    text.includes("morning show") ||
    text.includes("apple tv")
  ) {
    return "appletv";
  }

  if (
    text.includes("game of thrones") ||
    text.includes("house of the dragon") ||
    text.includes("last of us") ||
    text.includes("euphoria") ||
    text.includes("succession") ||
    text.includes("sopranos") ||
    text.includes("hbo") ||
    text.includes("warner")
  ) {
    return "hbo";
  }

  if (
    text.includes("shogun") ||
    text.includes("the bear") ||
    text.includes("fargo") ||
    text.includes("hulu")
  ) {
    return "hulu";
  }

  // Deterministic fallback distribution based on item ID
  const numId = typeof item.id === "number" ? item.id : parseInt(String(item.id).replace(/\D/g, "") || "0", 10);
  const platforms: PlatformType[] = ["netflix", "prime", "disney", "hbo", "appletv", "netflix", "prime"];
  return platforms[Math.abs(numId) % platforms.length];
}

interface PlatformBadgeProps {
  item: {
    id: string | number;
    title?: string;
    name?: string;
    overview?: string;
  };
  className?: string;
}

export default function PlatformBadge({ item, className = "" }: PlatformBadgeProps) {
  const platform = getPlatformForItem(item);

  switch (platform) {
    case "netflix":
      return (
        <div className={`px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md border border-[#E50914]/40 flex items-center gap-1 shadow-md ${className}`}>
          <span className="font-black text-[11px] sm:text-xs text-[#E50914] font-display leading-none drop-shadow-[0_0_6px_rgba(229,9,20,0.8)]">
            N
          </span>
        </div>
      );

    case "prime":
      return (
        <div className={`px-1.5 py-0.5 rounded bg-[#001b2e]/85 backdrop-blur-md border border-[#00A8E1]/40 flex items-center gap-0.5 shadow-md ${className}`}>
          <span className="font-extrabold text-[9px] sm:text-[10px] text-[#00A8E1] lowercase leading-none font-sans">
            prime
          </span>
        </div>
      );

    case "disney":
      return (
        <div className={`px-1.5 py-0.5 rounded bg-[#03112c]/85 backdrop-blur-md border border-[#00D2FF]/40 flex items-center gap-0.5 shadow-md ${className}`}>
          <span className="font-bold text-[9px] sm:text-[10px] text-[#00D2FF] italic font-serif leading-none">
            Disney+
          </span>
        </div>
      );

    case "appletv":
      return (
        <div className={`px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/30 flex items-center gap-0.5 shadow-md text-white ${className}`}>
          <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 170 170">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.66-7.79-11.89-14.24-5.35-8.2-9.62-17.5-12.82-27.91-3.2-10.41-4.8-20.59-4.8-30.54 0-14.07 3.5-25.75 10.5-35.03 7-9.28 15.89-13.98 26.67-14.1 5.35 0 11.04 1.34 17.07 4.02 6.03 2.68 9.97 4.08 11.82 4.2 1.48-.22 5.66-1.68 12.54-4.38 6.88-2.7 12.74-3.86 17.58-3.5 13.06.87 23.36 5.86 30.9 14.97-11.45 6.96-17.05 16.36-16.8 28.2.25 9.4 3.86 17.3 10.84 23.7 6.98 6.4 15.35 10.05 25.11 10.95-2.23 6.96-5.12 14.28-8.67 21.96zM119.22 33.64c0-7.39 2.68-14.34 8.04-20.85 5.36-6.51 12.01-10.84 19.95-12.99.74 8.02-1.9 15.22-7.92 21.6-6.02 6.38-13.08 10.45-20.07 12.24z"/>
          </svg>
          <span className="font-bold text-[8px] sm:text-[9px] leading-none">tv+</span>
        </div>
      );

    case "hbo":
      return (
        <div className={`px-1.5 py-0.5 rounded bg-[#16002c]/85 backdrop-blur-md border border-[#9945FF]/40 flex items-center gap-0.5 shadow-md ${className}`}>
          <span className="font-black text-[9px] sm:text-[10px] text-white font-sans leading-none">
            MAX
          </span>
        </div>
      );

    case "hulu":
      return (
        <div className={`px-1.5 py-0.5 rounded bg-[#002213]/85 backdrop-blur-md border border-[#1CE783]/40 flex items-center gap-0.5 shadow-md ${className}`}>
          <span className="font-black text-[9px] sm:text-[10px] text-[#1CE783] lowercase font-sans leading-none">
            hulu
          </span>
        </div>
      );

    case "paramount":
      return (
        <div className={`px-1.5 py-0.5 rounded bg-[#001736]/85 backdrop-blur-md border border-[#0064FF]/40 flex items-center gap-0.5 shadow-md ${className}`}>
          <span className="font-bold text-[9px] sm:text-[10px] text-[#0064FF] leading-none">
            Paramount+
          </span>
        </div>
      );

    default:
      return null;
  }
}
