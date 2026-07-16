import React from 'react';

const platforms = [
  {
    name: 'NETFLIX',
    icon: 'N',
    bg: 'from-red-600/20 to-red-950/20',
    border: 'border-red-900/30 hover:border-red-500/50',
    text: 'text-red-400',
    glow: 'hover:shadow-[0_0_25px_rgba(220,38,38,0.25)]',
    targetId: 'row-netflix'
  },
  {
    name: 'PRIME VIDEO',
    icon: 'P',
    bg: 'from-sky-600/20 to-sky-950/20',
    border: 'border-sky-900/30 hover:border-sky-500/50',
    text: 'text-sky-400',
    glow: 'hover:shadow-[0_0_25px_rgba(14,165,233,0.25)]',
    targetId: 'row-prime'
  },
  {
    name: 'CRUNCHYROLL',
    icon: 'C',
    bg: 'from-orange-600/20 to-orange-950/20',
    border: 'border-orange-900/30 hover:border-orange-500/50',
    text: 'text-orange-400',
    glow: 'hover:shadow-[0_0_25px_rgba(249,115,22,0.25)]',
    targetId: 'row-crunchyroll'
  },
  {
    name: 'DISNEY+',
    icon: 'D',
    bg: 'from-blue-600/20 to-indigo-950/20',
    border: 'border-blue-900/30 hover:border-blue-500/50',
    text: 'text-blue-400',
    glow: 'hover:shadow-[0_0_25px_rgba(59,130,246,0.25)]',
    targetId: 'row-disney'
  },
  {
    name: 'HBO MAX',
    icon: 'H',
    bg: 'from-purple-600/20 to-purple-950/20',
    border: 'border-purple-900/30 hover:border-purple-500/50',
    text: 'text-purple-400',
    glow: 'hover:shadow-[0_0_25px_rgba(168,85,247,0.25)]',
    targetId: 'row-hbo'
  }
];

export default function PlatformBadges() {
  const handleScroll = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 my-16">
      <div className="flex items-center gap-3 mb-7">
        <div className="h-5 w-1 rounded-full bg-cyan shadow-glow-cyan-sm" />
        <div>
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">
            Browse by Platform
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {platforms.map((platform) => (
          <button
            key={platform.name}
            onClick={() => handleScroll(platform.targetId)}
            className={`group relative py-5 px-4 rounded-2xl border text-xs font-black tracking-[0.15em] uppercase transition-all duration-400 ease-out-expo flex items-center justify-center overflow-hidden ${platform.bg} ${platform.border} ${platform.text} ${platform.glow} hover:-translate-y-0.5`}
          >
            <span className="relative z-10 flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-black/30 backdrop-blur-sm text-[11px] font-black">
                {platform.icon}
              </span>
              <span className="tracking-[0.2em]">{platform.name}</span>
            </span>
            <span className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        ))}
      </div>
    </div>
  );
}
