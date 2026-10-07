"use client";

import React, { Suspense } from 'react';
import SportsHub from '../../components/sports/SportsHub';

function SportsSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto pb-24 animate-pulse">
      <div className="h-12 w-64 bg-white/[0.05] rounded-xl mb-4" />
      <div className="h-6 w-96 bg-white/[0.05] rounded-lg mb-8" />
      <div className="flex gap-4 mb-10 border-b border-white/[0.08] pb-4">
        <div className="h-10 w-24 bg-white/[0.05] rounded-t-xl" />
        <div className="h-10 w-24 bg-white/[0.05] rounded-t-xl" />
        <div className="h-10 w-24 bg-white/[0.05] rounded-t-xl" />
      </div>
      <div className="h-[600px] w-full glass-card rounded-3xl bg-white/[0.02]" />
    </div>
  );
}

export default function SportsPage() {
  return (
    <div className="min-h-screen bg-[#0B131B] pt-20 px-4 sm:px-6 lg:px-8 pl-4 sm:pl-[100px]">
      <Suspense fallback={<SportsSkeleton />}>
        <SportsHub />
      </Suspense>
    </div>
  );
}
