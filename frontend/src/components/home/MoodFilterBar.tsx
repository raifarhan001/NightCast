"use client";

import React from "react";
import { Zap, Moon, Flame, Eye, Coffee, Compass } from "lucide-react";
import { soundFx } from "../../lib/soundEffects";

export interface MoodItem {
  id: string;
  label: string;
  sublabel: string;
  icon: any;
  genreId?: number;
  gradient: string;
}

export const MOODS: MoodItem[] = [
  {
    id: "all",
    label: "All Vibes",
    sublabel: "Complete Universe",
    icon: Compass,
    gradient: "from-[#39AEA9] to-[#A2D5AB]",
  },
  {
    id: "mindfuck",
    label: "Mindfuck & Twists",
    sublabel: "High IQ Thrillers",
    icon: Zap,
    genreId: 9648, // Mystery
    gradient: "from-[#7C3AED] to-[#A78BFA]",
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk Nights",
    sublabel: "Neon Sci-Fi Dystopia",
    icon: Moon,
    genreId: 878, // Sci-Fi
    gradient: "from-[#06B6D4] to-[#3B82F6]",
  },
  {
    id: "adrenaline",
    label: "Adrenaline Rush",
    sublabel: "Non-Stop Action",
    icon: Flame,
    genreId: 28, // Action
    gradient: "from-[#EF4444] to-[#F97316]",
  },
  {
    id: "psychological",
    label: "Dark Psychological",
    sublabel: "Chilling & Intense",
    icon: Eye,
    genreId: 53, // Thriller
    gradient: "from-[#8B5CF6] to-[#EC4899]",
  },
  {
    id: "comfort",
    label: "Late Night Comfort",
    sublabel: "Feel-Good & Chill",
    icon: Coffee,
    genreId: 35, // Comedy
    gradient: "from-[#10B981] to-[#6EE7B7]",
  },
];

interface MoodFilterBarProps {
  activeMood: string;
  onSelectMood: (moodId: string, genreId?: number) => void;
}

export default function MoodFilterBar({ activeMood, onSelectMood }: MoodFilterBarProps) {
  return (
    <div className="w-full px-4 sm:px-8 md:px-14 py-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-sans font-semibold tracking-wider uppercase text-[#8FA8AD] flex items-center gap-1.5">
          <span>Choose Your Frequency</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#39AEA9] animate-pulse" />
        </span>
      </div>

      {/* Horizontal Scrolling Pill Strip */}
      <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar scrollbar-none pb-2 pt-1 -mx-2 px-2">
        {MOODS.map((mood) => {
          const Icon = mood.icon;
          const isActive = activeMood === mood.id;

          return (
            <button
              key={mood.id}
              onClick={() => {
                soundFx.playTap();
                onSelectMood(mood.id, mood.genreId);
              }}
              onMouseEnter={() => soundFx.playHover()}
              className={`group shrink-0 px-4 py-2.5 rounded-2xl border transition-all duration-200 flex items-center gap-3 cursor-pointer text-left ${
                isActive
                  ? "bg-[#142024] border-[#39AEA9] text-white shadow-[0_0_20px_rgba(57,174,169,0.35)] scale-102"
                  : "bg-[#121A1D]/80 hover:bg-[#152024] border-white/[0.08] hover:border-white/20 text-[#CBD5E1]"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                  isActive
                    ? `bg-gradient-to-r ${mood.gradient} text-[#0A0F11]`
                    : "bg-white/[0.06] text-[#8FA8AD] group-hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div>
                <div className="text-xs font-sans font-bold leading-tight flex items-center gap-1">
                  <span>{mood.label}</span>
                </div>
                <div className="text-[10px] font-sans text-[#8FA8AD] leading-tight mt-0.5">
                  {mood.sublabel}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
