"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import F1Dashboard from './F1Dashboard';
import CricketDashboard from './CricketDashboard';
import FootballDashboard from './FootballDashboard';

const TABS = [
  { id: 'f1', label: 'Formula 1', color: '#FF1801' },
  { id: 'cricket', label: 'Cricket', color: '#2E8B57' },
  { id: 'football', label: 'Football', color: '#1A78CF' },
];

export default function SportsHub() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  return (
    <div className="w-full max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8 relative">
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#F0F0F0] tracking-tight mb-4">
          Live Sports <span className="text-[#39AEA9]">Hub</span>
        </h1>
        <p className="text-lg text-[#8FA8AD] max-w-2xl">
          Real-time updates, scores, and standings across your favorite sports.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide border-b border-white/[0.08]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-6 py-3 rounded-t-xl text-sm md:text-base font-semibold transition-colors whitespace-nowrap ${
                isActive ? 'text-white' : 'text-[#8FA8AD] hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="sportsTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full"
                  style={{ backgroundColor: tab.color, boxShadow: `0 0 10px ${tab.color}80` }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area with Animation */}
      <div className="min-h-[600px] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'f1' && <F1Dashboard />}
            {activeTab === 'cricket' && <CricketDashboard />}
            {activeTab === 'football' && <FootballDashboard />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
