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
        <div className={`px-2 py-0.5 rounded-full bg-[#E50914]/20 border border-[#E50914]/40 backdrop-blur-md flex items-center shadow-sm ${className}`}>
          <span className="font-mono font-bold text-[9px] text-[#FF2E3B] leading-none">
            NETFLIX
          </span>
        </div>
      );

    case "prime":
      return (
        <div className={`px-2 py-0.5 rounded-full bg-[#151524]/90 border border-[#282844] backdrop-blur-md flex items-center shadow-sm ${className}`}>
          <span className="font-mono font-bold text-[9px] text-[#38BDF8] uppercase leading-none tracking-wider">
            PRIME
          </span>
        </div>
      );

    case "disney":
      return (
        <div className={`px-2 py-0.5 rounded-full bg-[#00D2FF]/15 border border-[#00D2FF]/40 backdrop-blur-md flex items-center shadow-sm ${className}`}>
          <span className="font-mono font-bold text-[9px] text-[#00D2FF] leading-none tracking-wider">
            DISNEY+
          </span>
        </div>
      );

    case "appletv":
      return (
        <div className={`px-2 py-0.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center gap-1 shadow-sm text-white ${className}`}>
          <span className="font-mono font-bold text-[9px] leading-none tracking-wider">APPLE TV+</span>
        </div>
      );

    case "hbo":
      return (
        <div className={`px-2 py-0.5 rounded-full bg-[#9945FF]/20 border border-[#9945FF]/40 backdrop-blur-md flex items-center shadow-sm ${className}`}>
          <span className="font-mono font-bold text-[9px] text-[#C084FC] leading-none tracking-wider">
            MAX
          </span>
        </div>
      );

    case "hulu":
      return (
        <div className={`px-2 py-0.5 rounded-full bg-[#1CE783]/15 border border-[#1CE783]/40 backdrop-blur-md flex items-center shadow-sm ${className}`}>
          <span className="font-mono font-bold text-[9px] text-[#1CE783] uppercase leading-none tracking-wider">
            HULU
          </span>
        </div>
      );

    case "paramount":
      return (
        <div className={`px-2 py-0.5 rounded-full bg-[#0064FF]/20 border border-[#0064FF]/40 backdrop-blur-md flex items-center shadow-sm ${className}`}>
          <span className="font-mono font-bold text-[9px] text-[#3385FF] leading-none tracking-wider">
            PARAMOUNT+
          </span>
        </div>
      );

    default:
      return null;
  }
}
