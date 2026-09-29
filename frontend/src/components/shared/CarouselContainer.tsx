"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselContainerProps {
  children: React.ReactNode;
  posterType?: "landscape" | "portrait" | "capsule";
  className?: string;
  scrollAmountRatio?: number;
  itemCount?: number;
}

export default function CarouselContainer({
  children,
  posterType = "landscape",
  className = "",
  scrollAmountRatio = 0.75,
  itemCount,
}: CarouselContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  // Mouse drag state
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  const checkScrollState = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth + 4;
    setHasOverflow(overflow);

    if (!overflow) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
  }, []);

  useEffect(() => {
    checkScrollState();
    const el = containerRef.current;
    if (!el) return;

    const handleResize = () => checkScrollState();
    window.addEventListener("resize", handleResize);

    const observer = new ResizeObserver(() => checkScrollState());
    observer.observe(el);

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [checkScrollState, itemCount, children]);

  const handleScroll = (direction: "left" | "right") => {
    const el = containerRef.current;
    if (!el) return;

    const scrollAmount = el.clientWidth * scrollAmountRatio;
    el.scrollTo({
      left: direction === "left" ? el.scrollLeft - scrollAmount : el.scrollLeft + scrollAmount,
      behavior: "smooth",
    });
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    isDownRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDownRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.2;
    if (Math.abs(walk) > 5) {
      hasMovedRef.current = true;
    }
    el.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDownRef.current = false;
    checkScrollState();
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasMovedRef.current = false;
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handleScroll("left");
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleScroll("right");
    }
  };

  // Vertical placement of arrows strictly centered on the poster artwork
  const arrowVerticalClass =
    posterType === "portrait"
      ? "top-[100px] sm:top-[120px] md:top-[135px]"
      : posterType === "capsule"
      ? "top-[46px] sm:top-[50px]"
      : "top-[78px] sm:top-[86px] md:top-[92px]"; // default 16:9 landscape poster center (accounting for container pt-4)

  return (
    <div
      className="relative group/carousel w-full"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Content Carousel"
    >
      {/* Left Arrow: Vertically centered on poster area, half outside the row (-left-4 sm:-left-5) */}
      {hasOverflow && canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll("left")}
          className={`absolute -left-3 sm:-left-5 ${arrowVerticalClass} -translate-y-1/2 z-40 w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#4A6E8D]/40 bg-[#0B131B]/90 hover:bg-[#1B3A57]/90 text-[#F0F0F0] hover:text-[#A4C8E1] backdrop-blur-xl flex items-center justify-center cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.85),0_0_12px_rgba(164,200,225,0.2)] hover:scale-105 active:scale-95 transition-all duration-200 select-none hidden sm:flex`}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Scrollable Track with Left & Right Padding so first & last card text is NEVER covered */}
      <div
        ref={containerRef}
        onScroll={checkScrollState}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onClickCapture={handleClickCapture}
        className={`flex items-start gap-3 sm:gap-4 md:gap-5 overflow-x-auto no-scrollbar scrollbar-hide snap-x snap-mandatory scroll-smooth smooth-scroll-container pl-2 sm:pl-3 md:pl-4 pr-6 sm:pr-8 select-none ${className}`}
      >
        {children}
      </div>

      {/* Right Arrow: Vertically centered on poster area, half outside the row (-right-3 sm:-right-5) */}
      {hasOverflow && canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll("right")}
          className={`absolute -right-3 sm:-right-5 ${arrowVerticalClass} -translate-y-1/2 z-40 w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#4A6E8D]/40 bg-[#0B131B]/90 hover:bg-[#1B3A57]/90 text-[#F0F0F0] hover:text-[#A4C8E1] backdrop-blur-xl flex items-center justify-center cursor-pointer shadow-[0_8px_24px_rgba(0,0,0,0.85),0_0_12px_rgba(164,200,225,0.2)] hover:scale-105 active:scale-95 transition-all duration-200 select-none hidden sm:flex`}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
