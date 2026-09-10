"use client";

import React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAmbientStore } from "../../store/ambientStore";
import { ImageService } from "../../lib/ImageService";

interface AmbientGlowProps {
  variant?: "teal" | "cinema" | "violet" | "amber";
  className?: string;
}

export default function AmbientGlow({ className = "" }: AmbientGlowProps) {
  const activeBackdrop = useAmbientStore((s) => s.activeBackdrop);
  const activeTitle = useAmbientStore((s) => s.activeTitle);

  const backdropUrl = activeBackdrop
    ? ImageService.getBackdrop(activeBackdrop, "w1280", activeTitle || "Cinema")
    : null;

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden z-0 select-none ${className}`}>
      {/* 1. Dynamic Hover-Synced Cinema Backdrop Canvas */}
      <AnimatePresence mode="sync">
        {backdropUrl && (
          <motion.div
            key={backdropUrl}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 0.45, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 transform-gpu will-change-transform overflow-hidden z-10"
          >
            <Image
              src={backdropUrl}
              alt={activeTitle || "Ambient Backdrop"}
              fill
              sizes="100vw"
              className="object-cover object-center filter blur-[55px] sm:blur-[75px] saturate-[1.65] brightness-[0.75]"
              priority
            />
            {/* Deep Vignette Scrims to preserve full foreground contrast */}
            <div className="absolute inset-0 bg-[#0A0F11]/45" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F11] via-transparent to-[#0A0F11]/90" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A0F11]/75 via-transparent to-[#0A0F11]/75" />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 30%, rgba(10,15,17,0.1) 0%, rgba(10,15,17,0.65) 60%, #0A0F11 100%)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Ambient Aurora Glow Blobs (Idle Atmosphere) */}
      <div className="absolute inset-0 z-0">
        {/* Primary Cyan/Teal Aurora Blob */}
        <motion.div
          animate={{
            scale: [1, 1.25, 0.95, 1],
            x: [0, 40, -30, 0],
            y: [0, -40, 20, 0],
            opacity: [0.14, 0.24, 0.16, 0.14],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full bg-gradient-to-br from-[#39AEA9] via-[#A2D5AB]/30 to-transparent blur-[140px] will-change-transform"
        />

        {/* Secondary Deep Violet / Cinema Bloom */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1.05, 1],
            x: [0, -50, 40, 0],
            y: [0, 50, -30, 0],
            opacity: [0.1, 0.2, 0.12, 0.1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
          className="absolute top-1/4 -right-40 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-[#7C3AED]/25 via-[#39AEA9]/20 to-transparent blur-[160px] will-change-transform"
        />

        {/* Center Warm Ambient Glow for Depth */}
        <motion.div
          animate={{
            scale: [0.9, 1.15, 0.9],
            opacity: [0.06, 0.14, 0.06],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 6,
          }}
          className="absolute top-2/3 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#E11D48]/15 via-[#39AEA9]/15 to-transparent blur-[150px] will-change-transform"
        />
      </div>

      {/* 3. Subtle Cinema Film Grain Texture */}
      <div
        className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none z-20"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />
    </div>
  );
}
