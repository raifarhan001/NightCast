"use client";

import React, { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function RouteProgressBarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-transparent pointer-events-none">
      <div className="h-full bg-gradient-to-r from-orange-600 via-amber-400 via-orange-400 to-amber-300 shadow-[0_0_15px_rgba(249,115,22,0.9)] animate-top-progress rounded-r-full" />
    </div>
  );
}

export default function RouteProgressBar() {
  return (
    <Suspense fallback={null}>
      <RouteProgressBarContent />
    </Suspense>
  );
}
