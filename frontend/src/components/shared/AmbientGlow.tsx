"use client";

import React, { memo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAmbientStore } from "../../store/ambientStore";
import { ImageService } from "../../lib/ImageService";

interface AmbientGlowProps {
  className?: string;
}

function AmbientGlow({ className = "" }: AmbientGlowProps) {
  const heroBackdrop = useAmbientStore((s) => s.heroBackdrop);
  const activeBackdrop = useAmbientStore((s) => s.activeBackdrop);
  const heroTitle = useAmbientStore((s) => s.heroTitle);
  const activeTitle = useAmbientStore((s) => s.activeTitle);

  // Card hover takes dynamic priority, otherwise active hero poster fills the ambient background
  const currentBackdrop = activeBackdrop || heroBackdrop;
  const currentTitle = activeTitle || heroTitle;

  const backdropUrl = currentBackdrop
    ? ImageService.getBackdrop(currentBackdrop, "w1280", currentTitle || "Cinema")
    : null;

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden z-0 select-none ${className}`}
    >
      {/* 1. Dynamic Full-Page Cinema Backdrop with Rich Blur Effect */}
      <AnimatePresence mode="wait">
        {backdropUrl && (
          <motion.div
            key={backdropUrl}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
            className="absolute inset-0 transform-gpu overflow-hidden z-0"
          >
            <Image
              src={backdropUrl}
              alt={currentTitle || "Ambient Backdrop"}
              fill
              unoptimized
              sizes="100vw"
              className="object-cover object-top scale-110 filter blur-[60px] sm:blur-[80px] md:blur-[100px] saturate-[1.8] brightness-[0.72]"
              priority
            />

            {/* Light Scrim for Text/Card Contrast While Keeping Colors Vibrant */}
            <div className="absolute inset-0 bg-[#0B131B]/35" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0B131B]/20 via-transparent to-[#0B131B]/60" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Base Radial Ambient Atmosphere Fallback */}
      <div
        className="absolute inset-0 z-0 opacity-30 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 15% 15%, rgba(27, 58, 87, 0.45) 0%, transparent 45%),
            radial-gradient(circle at 85% 25%, rgba(74, 110, 141, 0.28) 0%, transparent 50%),
            radial-gradient(circle at 50% 80%, rgba(164, 200, 225, 0.14) 0%, transparent 55%),
            radial-gradient(circle at 50% 20%, rgba(44, 62, 80, 0.3) 0%, transparent 60%)
          `,
        }}
      />
    </div>
  );
}

export default memo(AmbientGlow);
