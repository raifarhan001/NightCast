"use client";

import React from 'react';
import { Languages, Volume2, Globe, Sparkles } from 'lucide-react';
import { LanguageType, LanguageBucket } from '../utils/languageDetector';

interface AudioLanguageSelectorProps {
  selectedLanguage: LanguageType;
  onSelectLanguage: (lang: LanguageType) => void;
  buckets: LanguageBucket;
  disabled?: boolean;
}

export const AudioLanguageSelector: React.FC<AudioLanguageSelectorProps> = ({
  selectedLanguage,
  onSelectLanguage,
  buckets,
  disabled = false
}) => {
  const englishCount = buckets?.english?.length || 0;
  const hindiCount = buckets?.hindi?.length || 0;
  const unknownCount = buckets?.unknown?.length || 0;

  const options: Array<{
    id: LanguageType;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    count: number;
    accentColor: string;
  }> = [
    {
      id: 'english',
      label: 'English / Original',
      shortLabel: 'English',
      icon: <Globe className="w-3.5 h-3.5 text-cyan-400" />,
      count: englishCount,
      accentColor: 'border-cyan-500/40 text-cyan-300'
    },
    {
      id: 'hindi',
      label: 'Hindi Dubbed',
      shortLabel: 'Hindi Dubbed',
      icon: <Volume2 className="w-3.5 h-3.5 text-amber-400" />,
      count: hindiCount,
      accentColor: 'border-amber-500/40 text-amber-300'
    }
  ];

  // Include Unknown / Other bucket if it has available sources
  if (unknownCount > 0) {
    options.push({
      id: 'unknown',
      label: 'Original / Multi',
      shortLabel: 'Original',
      icon: <Sparkles className="w-3.5 h-3.5 text-rose-400" />,
      count: unknownCount,
      accentColor: 'border-rose-500/40 text-rose-300'
    });
  }

  return (
    <div className="flex items-center gap-2 select-none">
      <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/50 mr-1">
        <Languages className="w-3.5 h-3.5 text-rose-400/80" />
        <span>Audio</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
        {options.map((opt) => {
          const isActive = selectedLanguage === opt.id;
          const isAvailable = opt.count > 0;

          return (
            <button
              key={opt.id}
              onClick={() => isAvailable && !disabled && onSelectLanguage(opt.id)}
              disabled={disabled || !isAvailable}
              className={`flex items-center gap-1.5 transition-all duration-200 ${
                isActive
                  ? 'gtv-tab-pill-active !bg-gradient-to-r !from-rose-500 !to-amber-500 !text-white shadow-lg shadow-rose-900/30'
                  : isAvailable
                  ? 'gtv-tab-pill text-white/80 hover:text-white hover:bg-white/10'
                  : 'px-3 py-1.5 rounded-full text-xs font-semibold text-white/30 cursor-not-allowed opacity-50'
              }`}
              title={
                !isAvailable
                  ? `${opt.label} audio is not available for this title`
                  : `Switch to ${opt.label}`
              }
            >
              <span className="shrink-0">{opt.icon}</span>
              <span className="truncate">{opt.shortLabel}</span>
              {opt.count > 0 && (
                <span
                  className={`ml-0.5 px-1.5 py-0.2 text-[9px] font-mono rounded-full font-extrabold ${
                    isActive
                      ? 'bg-black/40 text-white'
                      : 'bg-white/10 text-white/70'
                  }`}
                >
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AudioLanguageSelector;
