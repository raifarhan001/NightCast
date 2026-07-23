"use client";

import React from "react";
import { Film, Tv, Sparkles, Flame, Award, Clapperboard } from "lucide-react";

const badges = [
  { label: "Apple Originals", icon: Award, href: "#row-netflix" },
  { label: "Prime Video", icon: Film, href: "#row-prime" },
  { label: "Disney+", icon: Clapperboard, href: "#row-disney" },
  { label: "Crunchyroll", icon: Sparkles, href: "#row-crunchyroll" },
  { label: "HBO Max", icon: Flame, href: "#row-hbo" },
];

export default function PlatformBadges() {
  return (
    <div className="py-6 px-6 md:px-16 lg:px-20 select-none">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
        {badges.map((b) => {
          const Icon = b.icon;
          return (
            <a
              key={b.label}
              href={b.href}
              className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-white/30 text-white font-bold text-xs uppercase tracking-wider shrink-0 shadow-lg active:scale-95"
            >
              <Icon className="w-4 h-4 text-white" />
              <span>{b.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}