import { apiFetch } from './api';

// F1 Interfaces
export interface Race {
  id: string;
  name: string;
  date: string;
  circuit: string;
  status: 'upcoming' | 'completed' | 'live';
}

export interface DriverStanding {
  position: number;
  driverId: string;
  driverName: string;
  points: number;
  team: string;
}

export interface ConstructorStanding {
  position: number;
  teamId: string;
  teamName: string;
  points: number;
}

export interface F1Data {
  races: Race[];
  driver_standings: DriverStanding[];
  constructor_standings: ConstructorStanding[];
}

// Cricket Interfaces
export interface CricketMatch {
  id: string;
  title: string;
  status: 'live' | 'upcoming' | 'completed';
  team1: string;
  team2: string;
  score1?: string;
  score2?: string;
  result?: string;
  startTime: string;
}

export interface CricketData {
  live_matches: CricketMatch[];
  upcoming_matches: CricketMatch[];
  recent_results: CricketMatch[];
  series: any[];
}

// Football Interfaces
export interface FootballMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: 'live' | 'upcoming' | 'completed';
  minute?: string;
  startTime: string;
  league: string;
}

export interface FootballStanding {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goalDifference: number;
}

export interface FootballData {
  live_matches: FootballMatch[];
  today_fixtures: FootballMatch[];
  standings?: FootballStanding[];
}

// Fetchers
export async function fetchF1Data(): Promise<F1Data> {
  return apiFetch('/api/v1/f1/2026-data');
}

export async function fetchCricketData(): Promise<CricketData> {
  return apiFetch('/api/v1/sports/cricket');
}

export async function fetchFootballData(leagueCode?: string): Promise<FootballData> {
  const url = leagueCode ? `/api/v1/sports/football/league/${leagueCode}` : '/api/v1/sports/football';
  return apiFetch(url);
}
