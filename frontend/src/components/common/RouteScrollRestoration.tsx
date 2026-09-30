"use client";

import { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ScrollRestorer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isRestoringRef = useRef(false);
  const currentKey = `${pathname}?${searchParams.toString()}`;

  // 1. Save scroll position on scroll (throttled)
  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: any;
    const handleScroll = () => {
      if (isRestoringRef.current) return;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        try {
          const y = window.scrollY;
          // Store both by exact full path and by pathname alone for resilience
          sessionStorage.setItem(`nc_scroll_${currentKey}`, String(y));
          sessionStorage.setItem(`nc_scroll_${pathname}`, String(y));
        } catch {
          // Ignore quota/private browsing issues
        }
      }, 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [currentKey, pathname]);

  // 2. Restore scroll position on route change / mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if we have a saved scroll position for this route
    const saved =
      sessionStorage.getItem(`nc_scroll_${currentKey}`) ||
      sessionStorage.getItem(`nc_scroll_${pathname}`);

    if (!saved) return;
    const targetY = parseFloat(saved);
    if (isNaN(targetY) || targetY <= 0) return;

    isRestoringRef.current = true;
    let attempts = 0;
    const maxAttempts = 25; // Retry for up to ~1.8 seconds while dynamic content/skeletons load

    const tryRestore = () => {
      attempts++;
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );

      // If document has grown enough to satisfy at least 85% of targetY or maxScroll is reached
      if (maxScroll >= targetY || attempts >= maxAttempts) {
        window.scrollTo({
          top: Math.min(targetY, maxScroll),
          behavior: "instant" as ScrollBehavior,
        });
        isRestoringRef.current = false;
        return;
      }

      // Try scrolling anyway and retry next frame / timeout
      window.scrollTo({
        top: Math.min(targetY, maxScroll),
        behavior: "instant" as ScrollBehavior,
      });

      requestAnimationFrame(() => {
        setTimeout(tryRestore, 60);
      });
    };

    // Initial micro-delay for DOM to attach
    const initialTimer = setTimeout(tryRestore, 30);

    return () => {
      clearTimeout(initialTimer);
      isRestoringRef.current = false;
    };
  }, [currentKey, pathname]);

  return null;
}

export default function RouteScrollRestoration() {
  return (
    <Suspense fallback={null}>
      <ScrollRestorer />
    </Suspense>
  );
}
