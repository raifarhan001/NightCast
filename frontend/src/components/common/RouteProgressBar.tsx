"use client";

import React, { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useIsMutating } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

/**
 * Dispatch programmatic loading events for buttons or custom actions
 */
export function triggerRouteLoading() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nightcast:start-loading"));
  }
}

export function stopRouteLoading() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nightcast:stop-loading"));
  }
}

function RouteProgressBarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMutating = useIsMutating();

  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const timerIdsRef = useRef<NodeJS.Timeout[]>([]);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);
  const prevPathRef = useRef(pathname);
  const prevSearchRef = useRef(searchParams?.toString());
  const wasMutatingRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    timerIdsRef.current.forEach((id) => clearTimeout(id));
    timerIdsRef.current = [];
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  }, []);

  const completeLoading = useCallback(() => {
    clearAllTimers();
    setProgress(100);

    // Fade out after reaching 100%
    const fadeTimer = setTimeout(() => {
      setIsVisible(false);
      const resetTimer = setTimeout(() => {
        setProgress(0);
      }, 300);
      timerIdsRef.current.push(resetTimer);
    }, 200);

    timerIdsRef.current.push(fadeTimer);
  }, [clearAllTimers]);

  const startLoading = useCallback(() => {
    clearAllTimers();
    setIsVisible(true);
    // Instant feedback: start at 22% within 5ms of click!
    setProgress(22);

    // Staged progressive ticks so bar is always actively moving
    const stages = [
      { delay: 120, pct: 45 },
      { delay: 350, pct: 65 },
      { delay: 750, pct: 80 },
      { delay: 1600, pct: 88 },
      { delay: 3000, pct: 93 },
      { delay: 5000, pct: 96 },
    ];

    stages.forEach(({ delay, pct }) => {
      const id = setTimeout(() => {
        setProgress((prev) => (prev < pct ? pct : prev));
      }, delay);
      timerIdsRef.current.push(id);
    });

    // Safety timeout: auto-finish if route hangs or cancelled
    safetyTimeoutRef.current = setTimeout(() => {
      completeLoading();
    }, 9000);
  }, [clearAllTimers, completeLoading]);

  useEffect(() => {
    setMounted(true);
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // Complete loading when pathname or searchParams change (Route successfully fetched & mounted)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const currentSearch = searchParams?.toString();
    if (prevPathRef.current !== pathname || prevSearchRef.current !== currentSearch) {
      prevPathRef.current = pathname;
      prevSearchRef.current = currentSearch;
      completeLoading();
    }
  }, [pathname, searchParams, completeLoading]);

  // Global capture click listener on <a> and <Link> elements for instant 0-5ms feedback
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Ignore right/middle clicks or modifier keys (Ctrl/Cmd/Shift/Alt)
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // If user clicked inside a button (e.g. favorite/watchlist/close button), let button handler handle it
      if (target.closest("button")) return;

      // Find closest anchor tag
      const anchor = target.closest("a");
      if (!anchor) return;

      // Ignore external targets or downloads
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download") || anchor.getAttribute("rel")?.includes("external")) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore hash-only or protocol links
      if (
        href.startsWith("#") ||
        href.startsWith("javascript:") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      // Parse URL
      try {
        const destUrl = new URL(href, window.location.href);
        const currentUrl = new URL(window.location.href);

        // Ignore external hosts
        if (destUrl.origin !== currentUrl.origin) return;

        // Ignore same page clicks with only hash change (e.g. /#top10 when already on /)
        if (
          destUrl.pathname === currentUrl.pathname &&
          destUrl.search === currentUrl.search
        ) {
          return;
        }
      } catch {
        if (!href.startsWith("/") || href.startsWith("//")) return;
      }

      // Valid internal route navigation! Start loading instantly!
      startLoading();
    };

    // Capture phase so we register before any component can stopPropagation
    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
    };
  }, [startLoading]);

  // Listen for custom manual events from buttons (e.g. Play, Search, Category selection)
  useEffect(() => {
    const handleStart = () => startLoading();
    const handleStop = () => completeLoading();

    window.addEventListener("nightcast:start-loading", handleStart);
    window.addEventListener("nightcast:stop-loading", handleStop);

    return () => {
      window.removeEventListener("nightcast:start-loading", handleStart);
      window.removeEventListener("nightcast:stop-loading", handleStop);
    };
  }, [startLoading, completeLoading]);

  // React Query mutating listener
  useEffect(() => {
    if (isMutating > 0 && !wasMutatingRef.current) {
      startLoading();
    } else if (isMutating === 0 && wasMutatingRef.current) {
      completeLoading();
    }
    wasMutatingRef.current = isMutating > 0;
  }, [isMutating, startLoading, completeLoading]);

  if (!mounted) return null;

  return (
    <>
      {/* Cinema Glowing Top Progress Bar */}
      <div
        className="fixed top-0 left-0 right-0 z-[99999] h-[3px] bg-transparent pointer-events-none transition-opacity duration-300"
        style={{ opacity: isVisible ? 1 : 0 }}
      >
        <div
          className="h-full bg-gradient-to-r from-[#39AEA9] via-[#A4C8E1] to-[#F0F0F0] shadow-[0_0_14px_rgba(164,200,225,0.9),0_0_8px_rgba(57,174,169,0.8)] relative transform-gpu will-change-[width,opacity]"
          style={{
            width: `${progress}%`,
            transition:
              progress === 100
                ? "width 180ms ease-out"
                : progress === 0
                ? "none"
                : "width 300ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Glowing head spark / lead particle */}
          <div className="absolute top-0 right-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-[#F0F0F0] to-white shadow-[0_0_12px_#ffffff] opacity-90" />
        </div>
      </div>

      {/* Floating Top-Right Rounded Loading Pill Badge */}
      <div
        className="fixed top-16 right-4 sm:top-20 sm:right-6 z-[99999] pointer-events-none flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0B131B]/95 backdrop-blur-xl border border-[#39AEA9]/50 shadow-[0_12px_36px_rgba(11,19,27,0.95),0_0_16px_rgba(57,174,169,0.3)] transition-all duration-200 transform-gpu"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.95)",
        }}
      >
        <Loader2 className="w-3.5 h-3.5 text-[#39AEA9] animate-spin shrink-0" />
        <span className="text-[11px] font-mono font-bold text-[#F0F0F0] tracking-wider uppercase">
          Loading...
        </span>
        <span className="text-[10px] font-mono font-semibold text-[#A4C8E1] pl-0.5">
          {Math.round(progress)}%
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
