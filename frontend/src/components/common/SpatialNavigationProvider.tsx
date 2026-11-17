"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Direction,
  TV_KEY_MAP,
  TV_NUM_KEY_CODES,
  isTvUserAgent,
  findNextSpatialElement,
  focusAndScrollIntoView,
  focusInitialInteractiveElement,
  handleSmartTvBack,
} from "../../lib/spatialNavigation";
import { Tv, Compass, CornerDownLeft, ArrowLeft } from "lucide-react";

interface SpatialNavigationContextType {
  isTvMode: boolean;
  setTvMode: (val: boolean) => void;
  focusInitial: () => boolean;
  focusElement: (el: HTMLElement) => void;
}

const SpatialNavigationContext = createContext<SpatialNavigationContextType>({
  isTvMode: false,
  setTvMode: () => {},
  focusInitial: () => false,
  focusElement: () => {},
});

export const useSpatialNavigation = () => useContext(SpatialNavigationContext);

export default function SpatialNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // TV mode starts true on TV devices, or turns true on first remote / arrow key press
  const [isTvMode, setIsTvModeState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return isTvUserAgent();
  });

  const [showTvPill, setShowTvPill] = useState(false);
  const hidePillTimerRef = useRef<NodeJS.Timeout | null>(null);

  const setTvMode = useCallback((active: boolean) => {
    setIsTvModeState(active);
    if (typeof document !== "undefined") {
      if (active) {
        document.documentElement.setAttribute("data-tv-mode", "true");
        setShowTvPill(true);
        if (hidePillTimerRef.current) clearTimeout(hidePillTimerRef.current);
        hidePillTimerRef.current = setTimeout(() => {
          setShowTvPill(false);
        }, 5000);
      } else {
        document.documentElement.removeAttribute("data-tv-mode");
        document.querySelectorAll('[data-tv-focused="true"]').forEach((el) => {
          el.removeAttribute("data-tv-focused");
        });
        setShowTvPill(false);
      }
    }
  }, []);

  const focusInitial = useCallback(() => {
    return focusInitialInteractiveElement();
  }, []);

  const focusElement = useCallback((el: HTMLElement) => {
    focusAndScrollIntoView(el);
  }, []);

  // Sync data-tv-mode attribute on mount
  useEffect(() => {
    if (isTvMode && typeof document !== "undefined") {
      document.documentElement.setAttribute("data-tv-mode", "true");
    }
  }, [isTvMode]);

  // Route change: automatically focus initial element on each view
  useEffect(() => {
    // Only auto-focus if in TV Mode or on Smart TV device
    const shouldAutoFocus = isTvMode || isTvUserAgent();

    if (shouldAutoFocus) {
      // 1. Immediate attempt after DOM commit
      const t1 = setTimeout(() => {
        focusInitial();
      }, 180);

      // 2. Retry after async data / Hero feed mounts
      const t2 = setTimeout(() => {
        const active = document.activeElement;
        if (!active || active === document.body || !document.querySelector('[data-tv-focused="true"]')) {
          focusInitial();
        }
      }, 650);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [pathname, isTvMode, focusInitial]);

  // Mouse / Pointer detection: deactivate TV Mode styling on mouse move or touch
  useEffect(() => {
    if (typeof window === "undefined") return;

    let mouseMoveThreshold = 0;
    const handlePointerMove = () => {
      // Only switch away from TV mode if mouse actually moves significantly
      mouseMoveThreshold += 1;
      if (mouseMoveThreshold > 3 && isTvMode) {
        setTvMode(false);
        mouseMoveThreshold = 0;
      }
    };

    const handlePointerDown = () => {
      if (isTvMode) {
        setTvMode(false);
        mouseMoveThreshold = 0;
      }
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("touchstart", handlePointerDown, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isTvMode, setTvMode]);

  // Master D-Pad / Remote Navigation Event Listener
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const keyCode = e.keyCode;

      // Identify key type
      const isUp = TV_KEY_MAP.UP.includes(key) || TV_NUM_KEY_CODES.UP.includes(keyCode);
      const isDown = TV_KEY_MAP.DOWN.includes(key) || TV_NUM_KEY_CODES.DOWN.includes(keyCode);
      const isLeft = TV_KEY_MAP.LEFT.includes(key) || TV_NUM_KEY_CODES.LEFT.includes(keyCode);
      const isRight = TV_KEY_MAP.RIGHT.includes(key) || TV_NUM_KEY_CODES.RIGHT.includes(keyCode);
      const isArrow = isUp || isDown || isLeft || isRight;

      const isSelect =
        TV_KEY_MAP.SELECT.includes(key) || TV_NUM_KEY_CODES.SELECT.includes(keyCode);
      const isBack =
        TV_KEY_MAP.BACK.includes(key) || TV_NUM_KEY_CODES.BACK.includes(keyCode);

      // If user pressed any TV navigation key, ensure TV mode is active
      if (isArrow || isSelect || isBack) {
        if (!isTvMode) {
          setTvMode(true);
        }
      }

      // -------------------------------------------------------------
      // 1. Back Button Handling
      // -------------------------------------------------------------
      if (isBack) {
        const active = document.activeElement as HTMLInputElement | null;
        // If typing inside an input and Backspace is pressed, let it delete character unless empty
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
          if (key === "Backspace" && active.value && active.value.length > 0) {
            return; // Allow native backspace text deletion
          }
        }

        e.preventDefault();
        e.stopPropagation();
        handleSmartTvBack(router);
        return;
      }

      // -------------------------------------------------------------
      // 2. Spatial Arrow D-Pad Navigation
      // -------------------------------------------------------------
      if (isArrow) {
        const active = document.activeElement as HTMLElement | null;

        // If inside an <input> or <textarea>, allow left/right cursor movement unless at boundary
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
          const input = active as HTMLInputElement;
          const cursorPos = input.selectionStart ?? 0;
          const textLen = input.value.length;

          if (isLeft && cursorPos > 0) {
            return; // let cursor move left inside input
          }
          if (isRight && cursorPos < textLen) {
            return; // let cursor move right inside input
          }
          // On Up / Down inside input, we allow leaving the input to spatial elements
        }

        // PREVENT DEFAULT: eliminates native jittery page jump-scrolling!
        e.preventDefault();
        e.stopPropagation();

        // Determine Direction
        let dir: Direction = "right";
        if (isUp) dir = "up";
        if (isDown) dir = "down";
        if (isLeft) dir = "left";
        if (isRight) dir = "right";

        // Current candidate
        let currentTarget = active;
        if (!currentTarget || currentTarget === document.body || !currentTarget.isConnected) {
          // If no active element, focus initial element
          focusInitial();
          return;
        }

        // Find next spatial element
        const next = findNextSpatialElement(currentTarget, dir);
        if (next) {
          focusAndScrollIntoView(next);
        }
        return;
      }

      // -------------------------------------------------------------
      // 3. OK / Enter / Select Key Handling
      // -------------------------------------------------------------
      if (isSelect) {
        const active = document.activeElement as HTMLElement | null;
        if (active && active !== document.body) {
          // If it's a clickable element or custom role="button", trigger click
          if (
            active.tagName === "BUTTON" ||
            active.tagName === "A" ||
            active.getAttribute("role") === "button" ||
            active.hasAttribute("data-tv-card") ||
            active.tabIndex >= 0
          ) {
            // Let native click proceed or dispatch click if custom component
            if (active.tagName !== "INPUT" && active.tagName !== "TEXTAREA") {
              e.preventDefault();
              active.click();
            }
          }
        } else {
          // Focus first interactive element if nothing selected
          focusInitial();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isTvMode, setTvMode, router, focusInitial]);

  return (
    <SpatialNavigationContext.Provider
      value={{
        isTvMode,
        setTvMode,
        focusInitial,
        focusElement,
      }}
    >
      {children}

      {/* Discreet TV Remote Navigation Pill Indicator */}
      {isTvMode && showTvPill && (
        <aside
          role="status"
          aria-label="Smart TV Remote Navigation Active"
          className="fixed bottom-6 right-6 z-[9999] pointer-events-none flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[#0B131B]/90 backdrop-blur-2xl border border-[#39AEA9]/50 text-white text-xs font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_20px_rgba(57,174,169,0.4)] animate-in fade-in slide-in-from-bottom-3 duration-300"
        >
          <div className="w-2 h-2 rounded-full bg-[#39AEA9] animate-pulse" />
          <Tv className="w-3.5 h-3.5 text-[#39AEA9]" />
          <span className="text-[#F0F0F0] tracking-wide">TV Remote Active</span>
          <span className="text-[#8FA8AD] text-[10px] font-mono">D-Pad • OK • Back</span>
        </aside>
      )}
    </SpatialNavigationContext.Provider>
  );
}
