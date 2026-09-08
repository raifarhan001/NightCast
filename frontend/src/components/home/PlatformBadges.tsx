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
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-2">
        {badges.map((b) => {
          const Icon = b.icon;
          return (
            <a
              key={b.label}
              href={b.href}
              className="flex items-center gap-2 px-4 py-2.5 rounded-none bg-[#18191D] hover:bg-[#232429] border border-[#28292E] hover:border-[#FA0037] transition-all text-[#DEE1E4] hover:text-white font-mono font-bold text-[11px] uppercase tracking-wider shrink-0 shadow-sm cursor-pointer"
            >
              <Icon className="w-3.5 h-3.5 text-[#FA0037]" />
              <span>{b.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}