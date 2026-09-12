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
      {/* Cinema Ice Blue Glowing Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] bg-transparent pointer-events-none">
        <div className="h-full bg-gradient-to-r from-[#4A6E8D] via-[#A4C8E1] to-[#F0F0F0] shadow-[0_0_12px_rgba(164,200,225,0.8)] animate-top-progress" />
      </div>

      {/* Floating Top-Right Rounded Loading Indicator Badge */}
      <div className="fixed top-20 right-6 z-[9999] pointer-events-none flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0B131B]/95 backdrop-blur-md border border-[#4A6E8D]/40 shadow-[0_12px_36px_rgba(11,19,27,0.9)] animate-in fade-in slide-in-from-top-2 duration-200">
        <Loader2 className="w-3.5 h-3.5 text-[#A4C8E1] animate-spin" />
        <span className="text-[11px] font-mono font-bold text-[#F0F0F0] tracking-wider uppercase">
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
