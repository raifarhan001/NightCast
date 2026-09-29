import React from "react";
import { HeroSkeleton, MovieRowSkeleton } from "../components/shared/Skeletons";

export default function Loading() {
  return (
    <div className="w-full min-h-screen bg-[#0B131B] pb-24 overflow-hidden select-none">
      <HeroSkeleton />
      <MovieRowSkeleton />
      <MovieRowSkeleton />
    </div>
  );
}
