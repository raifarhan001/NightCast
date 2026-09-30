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
  const activeBackdrop = useAmbientStore((s) => s.activeBackdrop);
  const activeTitle = useAmbientStore((s) => s.activeTitle);

  const backdropUrl = activeBackdrop
    ? ImageService.getBackdrop(activeBackdrop, "w780", activeTitle || "Cinema")
    : null;

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden z-0 select-none ${className}`}
      style={{ contain: "strict", willChange: "transform" }}
    >
      {/* 1. Dynamic Hover-Synced Cinema Backdrop Canvas */}
      <AnimatePresence mode="wait">
        {backdropUrl && (
          <motion.div
            key={backdropUrl}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0 transform-gpu overflow-hidden z-10"
          >
            <Image
              src={backdropUrl}
              alt={activeTitle || "Ambient Backdrop"}
              fill
              sizes="50vw"
              className="object-cover object-center scale-105 filter blur-[32px] saturate-[1.4] brightness-[0.7]"
              priority={false}
              loading="lazy"
            />
            {/* Deep Vignette Scrims in Prussian Canvas #0B131B */}
            <div className="absolute inset-0 bg-[#0B131B]/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B131B] via-transparent to-[#0B131B]/90" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Hardware-Accelerated Slate & Ice Blue Radial Glow Atmosphere */}
      <div
        className="absolute inset-0 z-0 opacity-55 pointer-events-none"
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
