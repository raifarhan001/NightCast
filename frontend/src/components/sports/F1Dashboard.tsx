"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchF1Data, F1Data } from '../../lib/sportsApi';
import { Flag, Trophy, Users, Timer } from 'lucide-react';

export default function F1Dashboard() {
  const { data, isLoading, error } = useQuery<F1Data>({
    queryKey: ['f1-data'],
    queryFn: fetchF1Data,
  });

  if (isLoading) {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="h-48 glass-card rounded-2xl bg-white/[0.02]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 glass-card rounded-2xl bg-white/[0.02]" />
          <div className="h-64 glass-card rounded-2xl bg-white/[0.02]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-center text-[#8FA8AD] py-10">Failed to load F1 data</div>;
  }

  const nextRace = data.races?.find(r => r.status === 'upcoming') || data.races?.[0];

  return (
    <div className="space-y-6">
      {/* Next Race Banner */}
      {nextRace && (
        <div className="glass-card rounded-2xl p-6 border-l-4 border-l-[#FF1801] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF1801]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="flex flex-col md:flex-row justify-between items-center relative z-10">
            <div>
              <div className="flex items-center gap-2 text-[#FF1801] font-semibold mb-2">
                <Timer className="w-5 h-5" />
                <span>Next Race</span>
              </div>
              <h2 className="text-2xl font-bold text-[#F0F0F0]">{nextRace.name}</h2>
              <p className="text-[#8FA8AD]">{nextRace.circuit}</p>
            </div>
            <div className="mt-4 md:mt-0 text-right">
              <p className="text-lg text-[#F0F0F0] font-medium">{new Date(nextRace.date).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Driver Standings */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4 border-b border-white/[0.08] pb-4">
            <Trophy className="w-5 h-5 text-[#FF1801]" />
            <h3 className="text-lg font-semibold text-[#F0F0F0]">Driver Standings</h3>
          </div>
          <div className="space-y-3">
            {data.driver_standings?.slice(0, 10).map((driver) => (
              <div key={driver.driverId} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-4">
                  <span className="w-6 text-center font-bold text-[#8FA8AD]">{driver.position}</span>
                  <div>
                    <p className="font-semibold text-[#F0F0F0]">{driver.driverName}</p>
                    <p className="text-xs text-[#8FA8AD]">{driver.team}</p>
                  </div>
                </div>
                <span className="font-bold text-[#FF1801]">{driver.points} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Constructor Standings */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4 border-b border-white/[0.08] pb-4">
            <Users className="w-5 h-5 text-[#FF1801]" />
            <h3 className="text-lg font-semibold text-[#F0F0F0]">Constructor Standings</h3>
          </div>
          <div className="space-y-3">
            {data.constructor_standings?.slice(0, 5).map((team) => (
              <div key={team.teamId} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-4">
                  <span className="w-6 text-center font-bold text-[#8FA8AD]">{team.position}</span>
                  <p className="font-semibold text-[#F0F0F0]">{team.teamName}</p>
                </div>
                <span className="font-bold text-[#FF1801]">{team.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
