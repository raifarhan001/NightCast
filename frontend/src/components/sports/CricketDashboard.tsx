"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCricketData, CricketData, CricketMatch } from '../../lib/sportsApi';
import { Trophy, Calendar, Activity } from 'lucide-react';

function MatchCard({ match }: { match: CricketMatch }) {
  const isLive = match.status === 'live';
  return (
    <div className={`glass-card rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${isLive ? 'border-l-4 border-l-[#2E8B57] shadow-[0_0_15px_rgba(46,139,87,0.15)]' : ''}`}>
      {isLive && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#2E8B57] animate-pulse" />
          <span className="text-xs font-bold text-[#2E8B57] uppercase tracking-wider">Live</span>
        </div>
      )}
      <div className="mb-4">
        <p className="text-xs text-[#8FA8AD] uppercase tracking-wider font-semibold">{match.title}</p>
        {!isLive && <p className="text-xs text-[#8FA8AD] mt-1">{new Date(match.startTime).toLocaleString()}</p>}
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center font-bold text-sm">
              {match.team1.substring(0, 3).toUpperCase()}
            </div>
            <span className="font-semibold text-[#F0F0F0]">{match.team1}</span>
          </div>
          <span className="font-bold text-lg text-[#F0F0F0]">{match.score1 || '-'}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center font-bold text-sm">
              {match.team2.substring(0, 3).toUpperCase()}
            </div>
            <span className="font-semibold text-[#F0F0F0]">{match.team2}</span>
          </div>
          <span className="font-bold text-lg text-[#F0F0F0]">{match.score2 || '-'}</span>
        </div>
      </div>
      
      {match.result && (
        <div className="mt-4 pt-3 border-t border-white/[0.08]">
          <p className="text-sm text-[#39AEA9] font-medium">{match.result}</p>
        </div>
      )}
    </div>
  );
}

export default function CricketDashboard() {
  const { data, isLoading, error } = useQuery<CricketData>({
    queryKey: ['cricket-data'],
    queryFn: fetchCricketData,
  });

  if (isLoading) {
    return (
      <div className="w-full space-y-8 animate-pulse">
        <div className="h-40 glass-card rounded-2xl bg-white/[0.02]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-48 glass-card rounded-2xl bg-white/[0.02]" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-center text-[#8FA8AD] py-10">Failed to load Cricket data</div>;
  }

  return (
    <div className="space-y-8">
      {/* Live Matches */}
      {data.live_matches?.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-[#2E8B57]" />
            <h2 className="text-xl font-bold text-[#F0F0F0]">Live Now</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.live_matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Matches */}
      {data.upcoming_matches?.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-[#39AEA9]" />
            <h2 className="text-xl font-bold text-[#F0F0F0]">Upcoming Matches</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.upcoming_matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Results */}
      {data.recent_results?.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-[#8FA8AD]" />
            <h2 className="text-xl font-bold text-[#F0F0F0]">Recent Results</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.recent_results.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
