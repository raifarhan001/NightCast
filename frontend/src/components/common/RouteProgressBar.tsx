"use client";

import React, { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

function RouteProgressBarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [navigating, setNavigating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setNavigating(true);
    const timer = setTimeout(() => {
      setNavigating(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  const isLoading = navigating || isFetching > 0 || isMutating > 0;

  if (!mounted || !isLoading) return null;

  return (
    <>
      {/* Prime Cyan Glowing Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent pointer-events-none">
        <div className="h-full bg-gradient-to-r from-[#00A8E1] via-[#00D2FF] to-[#00A8E1] shadow-[0_0_20px_rgba(0,168,225,0.9)] animate-top-progress rounded-r-full" />
      </div>

      {/* Floating Top-Right Apple Liquid Glass Loading Indicator Badge */}
      <div className="fixed top-20 right-6 z-[9999] pointer-events-none flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#050811]/85 backdrop-blur-2xl border border-white/20 shadow-[0_12px_36px_rgba(0,168,225,0.4),inset_0_1px_0_0_rgba(255,255,255,0.3)] animate-in fade-in slide-in-from-top-2 duration-200">
        <Loader2 className="w-4 h-4 text-[#00A8E1] animate-spin" />
        <span className="text-xs font-bold text-white tracking-wide font-sans">
          Loading...
        </span>
      </div>
    </>
  );
}

export default function RouteProgressBar() {
  return (
    <Suspense fallback={null}>
      <RouteProgressBarContent />
    </Suspense>
  );
}
