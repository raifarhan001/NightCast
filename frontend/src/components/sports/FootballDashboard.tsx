"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchFootballData, FootballData, FootballMatch } from '../../lib/sportsApi';
import { Activity, Calendar, Trophy } from 'lucide-react';

const LEAGUES = [
  { code: 'PL', name: 'Premier League' },
  { code: 'PD', name: 'La Liga' },
  { code: 'BL1', name: 'Bundesliga' },
  { code: 'SA', name: 'Serie A' },
];

function FootballMatchCard({ match }: { match: FootballMatch }) {
  const isLive = match.status === 'live';
  return (
    <div className={`glass-card rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.04] transition-colors ${isLive ? 'border-l-4 border-l-[#1A78CF]' : ''}`}>
      <div className="flex-1 flex justify-end pr-4 text-right">
        <span className="font-semibold text-[#F0F0F0]">{match.homeTeam}</span>
      </div>
      
      <div className="flex flex-col items-center justify-center w-20 px-2">
        {isLive ? (
          <>
            <span className="text-[#1A78CF] text-xs font-bold mb-1 animate-pulse">{match.minute}'</span>
            <div className="bg-[#1A78CF]/20 px-3 py-1 rounded-lg border border-[#1A78CF]/30">
              <span className="font-bold text-lg text-[#F0F0F0]">{match.homeScore} - {match.awayScore}</span>
            </div>
          </>
        ) : match.status === 'completed' ? (
          <div className="bg-white/[0.05] px-3 py-1 rounded-lg">
            <span className="font-bold text-lg text-[#F0F0F0]">{match.homeScore} - {match.awayScore}</span>
          </div>
        ) : (
          <span className="text-sm font-medium text-[#8FA8AD]">
            {new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      
      <div className="flex-1 flex justify-start pl-4">
        <span className="font-semibold text-[#F0F0F0]">{match.awayTeam}</span>
      </div>
    </div>
  );
}

export default function FootballDashboard() {
  const [activeLeague, setActiveLeague] = useState(LEAGUES[0].code);

  const { data, isLoading, error } = useQuery<FootballData>({
    queryKey: ['football-data', activeLeague],
    queryFn: () => fetchFootballData(activeLeague),
  });

  return (
    <div className="space-y-8">
      {/* League Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {LEAGUES.map((league) => (
          <button
            key={league.code}
            onClick={() => setActiveLeague(league.code)}
            className={`px-5 py-2 rounded-xl whitespace-nowrap transition-all duration-200 text-sm font-semibold ${
              activeLeague === league.code
                ? 'bg-[#1A78CF] text-white shadow-[0_0_15px_rgba(26,120,207,0.4)]'
                : 'bg-white/[0.05] text-[#8FA8AD] hover:bg-white/[0.1] hover:text-white'
            }`}
          >
            {league.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="w-full space-y-8 animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 glass-card rounded-2xl bg-white/[0.02]" />
            <div className="h-64 glass-card rounded-2xl bg-white/[0.02]" />
          </div>
        </div>
      ) : error || !data ? (
        <div className="text-center text-[#8FA8AD] py-10">Failed to load Football data</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Matches Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Live Matches */}
            {data.live_matches?.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-[#1A78CF]" />
                  <h2 className="text-lg font-bold text-[#F0F0F0]">Live Now</h2>
                </div>
                <div className="space-y-3">
                  {data.live_matches.map((match) => (
                    <FootballMatchCard key={match.id} match={match} />
                  ))}
                </div>
              </section>
            )}

            {/* Today's Fixtures */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-[#F0F0F0]" />
                <h2 className="text-lg font-bold text-[#F0F0F0]">Today's Matches</h2>
              </div>
              <div className="space-y-3">
                {data.today_fixtures?.length > 0 ? (
                  data.today_fixtures.map((match) => (
                    <FootballMatchCard key={match.id} match={match} />
                  ))
                ) : (
                  <div className="text-center py-6 text-[#8FA8AD] glass-card rounded-2xl">
                    No matches scheduled for today
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Standings Column */}
          <div className="lg:col-span-5">
            <section className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.08]">
                <Trophy className="w-5 h-5 text-[#1A78CF]" />
                <h2 className="text-lg font-bold text-[#F0F0F0]">Standings</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-[#8FA8AD] uppercase bg-white/[0.02]">
                    <tr>
                      <th className="px-3 py-2 rounded-tl-lg">#</th>
                      <th className="px-3 py-2">Team</th>
                      <th className="px-2 py-2 text-center">P</th>
                      <th className="px-2 py-2 text-center">GD</th>
                      <th className="px-2 py-2 text-center rounded-tr-lg">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.standings?.slice(0, 10).map((team) => (
                      <tr key={team.team} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-3 py-2 font-medium text-[#8FA8AD]">{team.position}</td>
                        <td className="px-3 py-2 font-semibold text-[#F0F0F0] whitespace-nowrap">{team.team}</td>
                        <td className="px-2 py-2 text-center text-[#8FA8AD]">{team.played}</td>
                        <td className="px-2 py-2 text-center text-[#8FA8AD]">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                        <td className="px-2 py-2 text-center font-bold text-[#1A78CF]">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-center">
                <button className="text-xs font-medium text-[#39AEA9] hover:text-white transition-colors">View Full Table →</button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
