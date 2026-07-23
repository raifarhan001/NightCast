"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Flag,
  Radio,
  Calendar,
  Trophy,
  Zap,
  ShieldAlert,
  Cpu,
  X,
  Clock,
  MapPin,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Users,
  Wrench,
  Award,
  ExternalLink
} from "lucide-react";
import { PlayerSkeleton } from "../../components/shared/Skeletons";
import { API_BASE_URL } from "../../lib/api";

interface F1Race {
  round: number;
  name: string;
  circuit: string;
  location: string;
  country: string;
  flag: string;
  date: string;
  time?: string;
  status: "LIVE NOW" | "REPLAY" | "UPCOMING";
  laps?: number;
  length?: string;
  record?: string;
  sessions: {
    fp1?: string;
    fp2?: string;
    fp3?: string;
    sprint?: string;
    qualifying?: string;
    race: string;
  };
}

interface DriverStanding {
  position: number;
  driverName: string;
  driverNumber: string;
  teamName: string;
  points: number;
  wins: number;
  nationality: string;
}

interface ConstructorStanding {
  position: number;
  teamName: string;
  nationality: string;
  points: number;
  wins: number;
}

const COUNTRY_FLAGS: Record<string, string> = {
  Australia: "🇦🇺",
  China: "🇨🇳",
  Japan: "🇯🇵",
  Bahrain: "🇧🇭",
  "Saudi Arabia": "🇸🇦",
  USA: "🇺🇸",
  "United States": "🇺🇸",
  Italy: "🇮🇹",
  Monaco: "🇲🇨",
  Spain: "🇪🇸",
  Canada: "🇨🇦",
  Austria: "🇦🇹",
  UK: "🇬🇧",
  "Great Britain": "🇬🇧",
  Belgium: "🇧🇪",
  Hungary: "🇭🇺",
  Netherlands: "🇳🇱",
  Azerbaijan: "🇦🇿",
  Singapore: "🇸🇬",
  Mexico: "🇲🇽",
  Brazil: "🇧🇷",
  Qatar: "🇶🇦",
  UAE: "🇦🇪",
  "United Arab Emirates": "🇦🇪"
};

const DEFAULT_SCHEDULE_2026: F1Race[] = [
  { round: 1, name: "Australian GP", circuit: "Albert Park Circuit", location: "Melbourne", country: "Australia", flag: "🇦🇺", date: "2026-03-08", status: "REPLAY", laps: 58, length: "5.278 km", record: "1:20.235", sessions: { fp1: "Fri 01:30 UTC", fp2: "Fri 05:00 UTC", fp3: "Sat 01:30 UTC", qualifying: "Sat 05:00 UTC", race: "Sun 04:00 UTC" } },
  { round: 2, name: "Chinese GP", circuit: "Shanghai International", location: "Shanghai", country: "China", flag: "🇨🇳", date: "2026-03-22", status: "REPLAY", laps: 56, length: "5.451 km", record: "1:32.238", sessions: { fp1: "Fri 03:30 UTC", fp2: "Fri 07:30 UTC", sprint: "Sat 03:30 UTC", qualifying: "Sat 07:00 UTC", race: "Sun 07:00 UTC" } },
  { round: 3, name: "Japanese GP", circuit: "Suzuka Circuit", location: "Suzuka", country: "Japan", flag: "🇯🇵", date: "2026-04-05", status: "REPLAY", laps: 53, length: "5.807 km", record: "1:30.983", sessions: { fp1: "Fri 02:30 UTC", fp2: "Fri 06:00 UTC", fp3: "Sat 02:30 UTC", qualifying: "Sat 06:00 UTC", race: "Sun 05:00 UTC" } },
  { round: 4, name: "Bahrain GP", circuit: "Bahrain International", location: "Sakhir", country: "Bahrain", flag: "🇧🇭", date: "2026-04-12", status: "REPLAY", laps: 57, length: "5.412 km", record: "1:31.447", sessions: { fp1: "Fri 11:30 UTC", fp2: "Fri 15:00 UTC", fp3: "Sat 12:30 UTC", qualifying: "Sat 16:00 UTC", race: "Sun 15:00 UTC" } },
  { round: 5, name: "Saudi Arabian GP", circuit: "Jeddah Corniche", location: "Jeddah", country: "Saudi Arabia", flag: "🇸🇦", date: "2026-04-19", status: "REPLAY", laps: 50, length: "6.174 km", record: "1:30.734", sessions: { fp1: "Fri 13:30 UTC", fp2: "Fri 17:00 UTC", fp3: "Sat 13:30 UTC", qualifying: "Sat 17:00 UTC", race: "Sun 17:00 UTC" } },
  { round: 6, name: "Miami GP", circuit: "Miami Autodrome", location: "Miami", country: "USA", flag: "🇺🇸", date: "2026-05-03", status: "REPLAY", laps: 57, length: "5.412 km", record: "1:29.708", sessions: { fp1: "Fri 16:30 UTC", fp2: "Fri 20:30 UTC", sprint: "Sat 16:00 UTC", qualifying: "Sat 20:00 UTC", race: "Sun 19:30 UTC" } },
  { round: 7, name: "Emilia Romagna GP", circuit: "Autodromo Imola", location: "Imola", country: "Italy", flag: "🇮🇹", date: "2026-05-17", status: "REPLAY", laps: 63, length: "4.909 km", record: "1:15.484", sessions: { fp1: "Fri 11:30 UTC", fp2: "Fri 15:00 UTC", fp3: "Sat 10:30 UTC", qualifying: "Sat 14:00 UTC", race: "Sun 13:00 UTC" } },
  { round: 8, name: "Monaco GP", circuit: "Circuit de Monaco", location: "Monte Carlo", country: "Monaco", flag: "🇲🇨", date: "2026-05-24", status: "REPLAY", laps: 78, length: "3.337 km", record: "1:12.909", sessions: { fp1: "Fri 11:30 UTC", fp2: "Fri 15:00 UTC", fp3: "Sat 10:30 UTC", qualifying: "Sat 14:00 UTC", race: "Sun 13:00 UTC" } },
  { round: 9, name: "Spanish GP", circuit: "Circuit de Barcelona", location: "Barcelona", country: "Spain", flag: "🇪🇸", date: "2026-06-07", status: "REPLAY", laps: 66, length: "4.657 km", record: "1:16.330", sessions: { fp1: "Fri 11:30 UTC", fp2: "Fri 15:00 UTC", fp3: "Sat 10:30 UTC", qualifying: "Sat 14:00 UTC", race: "Sun 13:00 UTC" } },
  { round: 10, name: "Canadian GP", circuit: "Circuit Gilles-Villeneuve", location: "Montreal", country: "Canada", flag: "🇨🇦", date: "2026-06-14", status: "REPLAY", laps: 70, length: "4.361 km", record: "1:13.078", sessions: { fp1: "Fri 17:30 UTC", fp2: "Fri 21:00 UTC", fp3: "Sat 16:30 UTC", qualifying: "Sat 20:00 UTC", race: "Sun 18:00 UTC" } },
  { round: 11, name: "Austrian GP", circuit: "Red Bull Ring", location: "Spielberg", country: "Austria", flag: "🇦🇹", date: "2026-06-28", status: "REPLAY", laps: 71, length: "4.318 km", record: "1:05.619", sessions: { fp1: "Fri 11:30 UTC", fp2: "Fri 15:30 UTC", sprint: "Sat 10:00 UTC", qualifying: "Sat 14:00 UTC", race: "Sun 13:00 UTC" } },
  { round: 12, name: "British GP", circuit: "Silverstone Circuit", location: "Silverstone", country: "UK", flag: "🇬🇧", date: "2026-07-05", status: "REPLAY", laps: 52, length: "5.891 km", record: "1:27.097", sessions: { fp1: "Fri 11:30 UTC", fp2: "Fri 15:00 UTC", fp3: "Sat 10:30 UTC", qualifying: "Sat 14:00 UTC", race: "Sun 14:00 UTC" } },
  { round: 13, name: "Belgian GP", circuit: "Spa-Francorchamps", location: "Stavelot", country: "Belgium", flag: "🇧🇪", date: "2026-07-26", status: "LIVE NOW", laps: 44, length: "7.004 km", record: "1:46.286", sessions: { fp1: "Fri 11:30 UTC", fp2: "Fri 15:00 UTC", fp3: "Sat 10:30 UTC", qualifying: "Sat 14:00 UTC", race: "Sun 13:00 UTC" } },
  { round: 14, name: "Hungarian GP", circuit: "Hungaroring", location: "Mogyoród", country: "Hungary", flag: "🇭🇺", date: "2026-08-02", status: "UPCOMING", laps: 70, length: "4.381 km", record: "1:16.627", sessions: { fp1: "Fri 11:30 UTC", fp2: "Fri 15:00 UTC", fp3: "Sat 10:30 UTC", qualifying: "Sat 14:00 UTC", race: "Sun 13:00 UTC" } },
  { round: 15, name: "Dutch GP", circuit: "Circuit Zandvoort", location: "Zandvoort", country: "Netherlands", flag: "🇳🇱", date: "2026-08-30", status: "UPCOMING", laps: 72, length: "4.259 km", record: "1:11.097", sessions: { fp1: "Fri 10:30 UTC", fp2: "Fri 14:00 UTC", fp3: "Sat 09:30 UTC", qualifying: "Sat 13:00 UTC", race: "Sun 13:00 UTC" } },
  { round: 16, name: "Italian GP", circuit: "Autodromo Monza", location: "Monza", country: "Italy", flag: "🇮🇹", date: "2026-09-06", status: "UPCOMING", laps: 53, length: "5.793 km", record: "1:21.046", sessions: { fp1: "Fri 11:30 UTC", fp2: "Fri 15:00 UTC", fp3: "Sat 10:30 UTC", qualifying: "Sat 14:00 UTC", race: "Sun 13:00 UTC" } },
  { round: 17, name: "Azerbaijan GP", circuit: "Baku City Circuit", location: "Baku", country: "Azerbaijan", flag: "🇦🇿", date: "2026-09-20", status: "UPCOMING", laps: 51, length: "6.003 km", record: "1:43.009", sessions: { fp1: "Fri 09:30 UTC", fp2: "Fri 13:00 UTC", fp3: "Sat 08:30 UTC", qualifying: "Sat 12:00 UTC", race: "Sun 11:00 UTC" } },
  { round: 18, name: "Singapore GP", circuit: "Marina Bay Circuit", location: "Marina Bay", country: "Singapore", flag: "🇸🇬", date: "2026-10-04", status: "UPCOMING", laps: 62, length: "4.940 km", record: "1:35.867", sessions: { fp1: "Fri 09:30 UTC", fp2: "Fri 13:00 UTC", fp3: "Sat 09:30 UTC", qualifying: "Sat 13:00 UTC", race: "Sun 12:00 UTC" } },
  { round: 19, name: "United States GP", circuit: "Circuit of Americas", location: "Austin", country: "USA", flag: "🇺🇸", date: "2026-10-18", status: "UPCOMING", laps: 56, length: "5.513 km", record: "1:36.169", sessions: { fp1: "Fri 17:30 UTC", fp2: "Fri 21:30 UTC", sprint: "Sat 18:00 UTC", qualifying: "Sat 22:00 UTC", race: "Sun 19:00 UTC" } },
  { round: 20, name: "Mexico City GP", circuit: "Hermanos Rodríguez", location: "Mexico City", country: "Mexico", flag: "🇲🇽", date: "2026-10-25", status: "UPCOMING", laps: 71, length: "4.304 km", record: "1:17.774", sessions: { fp1: "Fri 18:30 UTC", fp2: "Fri 22:00 UTC", fp3: "Sat 17:30 UTC", qualifying: "Sat 21:00 UTC", race: "Sun 20:00 UTC" } },
  { round: 21, name: "São Paulo GP", circuit: "Interlagos Circuit", location: "São Paulo", country: "Brazil", flag: "🇧🇷", date: "2026-11-08", status: "UPCOMING", laps: 71, length: "4.309 km", record: "1:10.540", sessions: { fp1: "Fri 14:30 UTC", fp2: "Fri 18:30 UTC", sprint: "Sat 14:00 UTC", qualifying: "Sat 18:00 UTC", race: "Sun 17:00 UTC" } },
  { round: 22, name: "Las Vegas GP", circuit: "Las Vegas Strip", location: "Las Vegas", country: "USA", flag: "🇺🇸", date: "2026-11-21", status: "UPCOMING", laps: 50, length: "6.201 km", record: "1:35.490", sessions: { fp1: "Thu 02:30 UTC", fp2: "Thu 06:00 UTC", fp3: "Fri 02:30 UTC", qualifying: "Fri 06:00 UTC", race: "Sat 06:00 UTC" } },
  { round: 23, name: "Qatar GP", circuit: "Lusail International", location: "Lusail", country: "Qatar", flag: "🇶🇦", date: "2026-11-29", status: "UPCOMING", laps: 57, length: "5.419 km", record: "1:24.319", sessions: { fp1: "Fri 13:30 UTC", fp2: "Fri 17:30 UTC", sprint: "Sat 14:00 UTC", qualifying: "Sat 18:00 UTC", race: "Sun 17:00 UTC" } },
  { round: 24, name: "Abu Dhabi GP", circuit: "Yas Marina Circuit", location: "Abu Dhabi", country: "UAE", flag: "🇦🇪", date: "2026-12-06", status: "UPCOMING", laps: 58, length: "5.281 km", record: "1:26.103", sessions: { fp1: "Fri 09:30 UTC", fp2: "Fri 13:00 UTC", fp3: "Sat 10:30 UTC", qualifying: "Sat 14:00 UTC", race: "Sun 13:00 UTC" } }
];

const DEFAULT_DRIVERS_2026: DriverStanding[] = [
  { position: 1, driverName: "Max Verstappen", driverNumber: "1", teamName: "Red Bull Racing", points: 255, wins: 7, nationality: "Dutch" },
  { position: 2, driverName: "Lando Norris", driverNumber: "4", teamName: "McLaren F1 Team", points: 238, wins: 4, nationality: "British" },
  { position: 3, driverName: "Charles Leclerc", driverNumber: "16", teamName: "Scuderia Ferrari", points: 212, wins: 3, nationality: "Monegasque" },
  { position: 4, driverName: "Oscar Piastri", driverNumber: "81", teamName: "McLaren F1 Team", points: 198, wins: 2, nationality: "Australian" },
  { position: 5, driverName: "Lewis Hamilton", driverNumber: "44", teamName: "Scuderia Ferrari", points: 175, wins: 2, nationality: "British" },
  { position: 6, driverName: "George Russell", driverNumber: "63", teamName: "Mercedes-AMG F1", points: 162, wins: 1, nationality: "British" },
  { position: 7, driverName: "Carlos Sainz", driverNumber: "55", teamName: "Williams Racing", points: 110, wins: 0, nationality: "Spanish" },
  { position: 8, driverName: "Fernando Alonso", driverNumber: "14", teamName: "Aston Martin F1", points: 88, wins: 0, nationality: "Spanish" },
  { position: 9, driverName: "Alexander Albon", driverNumber: "23", teamName: "Williams Racing", points: 54, wins: 0, nationality: "Thai" },
  { position: 10, driverName: "Pierre Gasly", driverNumber: "10", teamName: "Alpine F1 Team", points: 42, wins: 0, nationality: "French" }
];

const DEFAULT_CONSTRUCTORS_2026: ConstructorStanding[] = [
  { position: 1, teamName: "McLaren F1 Team", nationality: "British", points: 436, wins: 6 },
  { position: 2, teamName: "Red Bull Racing", nationality: "Austrian", points: 390, wins: 7 },
  { position: 3, teamName: "Scuderia Ferrari", nationality: "Italian", points: 387, wins: 5 },
  { position: 4, teamName: "Mercedes-AMG F1", nationality: "German", points: 280, wins: 1 },
  { position: 5, teamName: "Williams Racing", nationality: "British", points: 164, wins: 0 },
  { position: 6, teamName: "Aston Martin F1", nationality: "British", points: 115, wins: 0 },
  { position: 7, teamName: "Alpine F1 Team", nationality: "French", points: 68, wins: 0 },
  { position: 8, teamName: "Visa Cash App RB", nationality: "Italian", points: 45, wins: 0 },
  { position: 9, teamName: "Haas F1 Team", nationality: "American", points: 38, wins: 0 },
  { position: 10, teamName: "Kick Sauber F1", nationality: "Swiss", points: 18, wins: 0 }
];

const SERVERS = [
  { id: "main", name: "MAIN FEED 4K", type: "main" },
  { id: "dub", name: "HINDI / INT DUB", type: "dub" },
  { id: "telemetry", name: "TELEMETRY DASH", type: "telemetry" }
];

function formatRaceDate(dateStr?: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(monthIdx) || isNaN(day)) return dateStr;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formattedDay = day < 10 ? `0${day}` : `${day}`;
  const monthName = months[monthIdx] || "";
  return `${formattedDay} ${monthName} ${year}`;
}

function formatSessionDateTimePKT(sessionStr: string | undefined, fallbackUtcTime: string, raceDateStr: string, sessionType?: string): string {
  const targetStr = sessionStr || `${formatRaceDate(raceDateStr)} ${fallbackUtcTime}`;
  if (!targetStr) return "";

  let year: number, month: number, day: number;

  const isoMatch = targetStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  } else {
    const parts = (raceDateStr || "2026-07-26").split("-").map(Number);
    year = parts[0] || 2026;
    month = parts[1] || 7;
    day = parts[2] || 26;

    let dateOffset = 0;
    if (targetStr.includes("Fri") || sessionType === "fp1" || sessionType === "fp2") {
      dateOffset = -2;
    } else if (targetStr.includes("Sat") || sessionType === "fp3" || sessionType === "sprint" || sessionType === "qualifying") {
      dateOffset = -1;
    } else if (targetStr.includes("Thu")) {
      dateOffset = -3;
    }
    day += dateOffset;
  }

  const timeMatch = targetStr.match(/(\d{1,2}):(\d{2})/);
  const hours = timeMatch ? parseInt(timeMatch[1], 10) : 12;
  const minutes = timeMatch ? parseInt(timeMatch[2], 10) : 0;

  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  const pktDate = new Date(utcDate.getTime() + (5 * 3600 * 1000));

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dStr = String(pktDate.getUTCDate()).padStart(2, "0");
  const mStr = months[pktDate.getUTCMonth()] || "Jul";
  const yStr = pktDate.getUTCFullYear();

  let pktHours = pktDate.getUTCHours();
  const ampm = pktHours >= 12 ? "PM" : "AM";
  pktHours = pktHours % 12 || 12;
  const pktHoursStr = String(pktHours).padStart(2, "0");
  const pktMinsStr = String(pktDate.getUTCMinutes()).padStart(2, "0");

  return `${dStr} ${mStr} ${yStr} • ${pktHoursStr}:${pktMinsStr} ${ampm} PKT`;
}

function getRaceStatusBadge(raceDateStr: string, isImmediateNext: boolean, originalStatus?: string) {
  if (originalStatus === "LIVE NOW") {
    return {
      label: "LIVE NOW",
      className: "bg-[#EE1240] text-[#FFCC00] font-black shadow-[0_0_15px_rgba(238,18,64,0.7)] animate-pulse border border-[#FFCC00]/50"
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = (raceDateStr || "").split("-").map(Number);
  if (!y || !m || !d) {
    return {
      label: originalStatus || "UPCOMING",
      className: "bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold"
    };
  }

  const raceDate = new Date(y, m - 1, d);
  raceDate.setHours(0, 0, 0, 0);

  if (raceDate < today) {
    return {
      label: "COMPLETED",
      className: "bg-zinc-800/90 text-zinc-400 border border-zinc-700/50 font-bold"
    };
  } else if (isImmediateNext) {
    return {
      label: "NEXT RACE",
      className: "bg-[#EE1240] text-[#FFCC00] font-black shadow-[0_0_15px_rgba(238,18,64,0.8)] animate-pulse border border-[#FFCC00]/60"
    };
  } else {
    return {
      label: "UPCOMING",
      className: "bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold"
    };
  }
}

// Helper to find initial active/next race dynamically
function getInitialActiveRace(raceList: F1Race[]): F1Race {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const liveRace = raceList.find(r => r.status === "LIVE NOW");
  if (liveRace) return liveRace;

  const nextRace = raceList.find(r => {
    if (!r.date) return false;
    const [y, m, d] = r.date.split("-").map(Number);
    if (!y || !m || !d) return false;
    const rDate = new Date(y, m - 1, d);
    rDate.setHours(0, 0, 0, 0);
    return rDate >= today;
  });

  return nextRace || raceList[0];
}

// Memoized Sub-Component for Carousel Race Card
const RaceCarouselCard = React.memo(function RaceCarouselCard({
  race,
  isCurrent,
  isImmediateNext,
  badge,
  onClick
}: {
  race: F1Race;
  isCurrent: boolean;
  isImmediateNext: boolean;
  badge: { label: string; className: string };
  onClick: (race: F1Race) => void;
}) {
  const handleClick = React.useCallback(() => {
    onClick(race);
  }, [onClick, race]);

  return (
    <div
      onClick={handleClick}
      className={`min-w-[200px] sm:min-w-[230px] max-w-[200px] sm:max-w-[230px] snap-start h-[104px] p-3 rounded-2xl border transition-transform duration-200 cursor-pointer relative overflow-hidden group shrink-0 flex flex-col justify-between hover:scale-[1.02] transform-gpu will-change-transform ${
        isImmediateNext
          ? "bg-[#EE1240]/25 border-[#EE1240] ring-1 ring-[#FFCC00]"
          : isCurrent
          ? "bg-blue-600/20 border-blue-500/80"
          : "bg-[#121620]/95 border-white/10 hover:border-white/30 hover:bg-white/10"
      }`}
    >
      {/* Top Row: Round # & Status Badge */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-[#FFCC00] font-mono tracking-wider">RD {race.round}</span>
        <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Middle: Flag + Race Name */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm shrink-0">{race.flag}</span>
          <h3 className="text-xs font-black text-white truncate font-display group-hover:text-[#FFCC00] transition-colors">
            {race.name}
          </h3>
        </div>
      </div>

      {/* Bottom: Location + Date */}
      <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px] font-mono">
        <span className="text-zinc-400 truncate max-w-[110px] sm:max-w-[120px]">{race.location || race.circuit}</span>
        <span className="text-zinc-300 font-bold">{formatRaceDate(race.date)}</span>
      </div>
    </div>
  );
});

// Memoized Sub-Component for Driver Standings Table Row
const DriverRow = React.memo(function DriverRow({ drv }: { drv: DriverStanding }) {
  const isRedBull = drv.teamName.includes("Red Bull");
  const badgeBg =
    drv.position === 1
      ? "bg-[#FFCC00] text-black font-black"
      : drv.position === 2
      ? "bg-slate-300 text-black font-black"
      : drv.position === 3
      ? "bg-amber-700 text-white font-black"
      : "bg-white/10 text-white/70 font-bold";

  const teamBorder =
    isRedBull ? "border-l-4 border-[#FFCC00] bg-[#EE1240]/10" :
    drv.teamName.includes("Ferrari") ? "border-l-2 border-red-500" :
    drv.teamName.includes("McLaren") ? "border-l-2 border-amber-500" :
    drv.teamName.includes("Mercedes") ? "border-l-2 border-teal-400" :
    drv.teamName.includes("Aston") ? "border-l-2 border-emerald-500" :
    drv.teamName.includes("Williams") ? "border-l-2 border-blue-400" :
    drv.teamName.includes("Alpine") ? "border-l-2 border-pink-500" : "border-l-2 border-white/20";

  return (
    <tr className={`hover:bg-white/5 transition-colors group ${teamBorder}`}>
      <td className="py-2 sm:py-2.5 px-2 sm:px-3.5 text-center">
        <span className={`inline-flex items-center justify-center w-5 sm:w-6 h-5 rounded-md text-[9px] ${badgeBg}`}>
          P{drv.position}
        </span>
      </td>
      <td className="py-2 sm:py-2.5 px-2 sm:px-3.5 font-bold text-white font-display group-hover:text-[#FFCC00] transition-colors">
        {drv.driverName}
        {isRedBull && <span className="ml-1 sm:ml-1.5 px-1 sm:px-1.5 py-0.5 rounded text-[8px] font-black bg-[#EE1240] text-[#FFCC00]">RBR</span>}
        <span className="text-[9px] font-normal text-white/40 ml-1.5">({drv.nationality})</span>
      </td>
      <td className="py-2 sm:py-2.5 px-2 sm:px-3.5 text-center font-mono font-bold text-[#FFCC00] text-[10px] sm:text-[11px]">
        #{drv.driverNumber}
      </td>
      <td className="py-2 sm:py-2.5 px-2 sm:px-3.5 text-white/80 font-medium text-[10px] sm:text-[11px] truncate max-w-[100px] sm:max-w-[120px]">
        {drv.teamName}
      </td>
      <td className="py-2 sm:py-2.5 px-2 sm:px-3.5 text-center font-mono font-bold text-white/70 text-[10px] sm:text-[11px]">
        {drv.wins}
      </td>
      <td className="py-2 sm:py-2.5 px-2 sm:px-3.5 text-right pr-3 sm:pr-4 font-mono font-extrabold text-xs sm:text-sm text-white">
        {drv.points}
      </td>
    </tr>
  );
});

// Memoized Sub-Component for Constructor Standings Table Row
const ConstructorRow = React.memo(function ConstructorRow({ c }: { c: ConstructorStanding }) {
  const isRedBull = c.teamName.includes("Red Bull");
  const badgeBg =
    c.position === 1
      ? "bg-[#FFCC00] text-black font-black"
      : c.position === 2
      ? "bg-slate-300 text-black font-black"
      : c.position === 3
      ? "bg-amber-700 text-white font-black"
      : "bg-white/10 text-white/70 font-bold";

  const teamBorder =
    isRedBull ? "border-l-4 border-[#FFCC00] bg-[#EE1240]/15" :
    c.teamName.includes("Ferrari") ? "border-l-2 border-red-500" :
    c.teamName.includes("McLaren") ? "border-l-2 border-amber-500" :
    c.teamName.includes("Mercedes") ? "border-l-2 border-teal-400" :
    c.teamName.includes("Aston") ? "border-l-2 border-emerald-500" :
    c.teamName.includes("Williams") ? "border-l-2 border-blue-400" :
    c.teamName.includes("Alpine") ? "border-l-2 border-pink-500" : "border-l-2 border-white/20";

  return (
    <tr className={`hover:bg-white/5 transition-colors group ${teamBorder}`}>
      <td className="py-2 sm:py-2.5 px-2 sm:px-3.5 text-center">
        <span className={`inline-flex items-center justify-center w-5 sm:w-6 h-5 rounded-md text-[9px] ${badgeBg}`}>
          P{c.position}
        </span>
      </td>
      <td className="py-2 sm:py-2.5 px-2 sm:px-3.5 font-extrabold text-white font-display text-xs group-hover:text-[#FFCC00] transition-colors">
        {c.teamName}
        {isRedBull && <span className="ml-1.5 sm:ml-2 px-1 sm:px-1.5 py-0.5 rounded text-[8px] font-black bg-[#EE1240] text-[#FFCC00]">ORACLE RBR</span>}
      </td>
      <td className="py-2 sm:py-2.5 px-2 sm:px-3.5 text-white/70 font-medium text-[10px] sm:text-[11px]">
        {c.nationality}
      </td>
      <td className="py-2 sm:py-2.5 px-2 sm:px-3.5 text-center font-mono font-bold text-white/70 text-[10px] sm:text-[11px]">
        {c.wins}
      </td>
      <td className="py-2 sm:py-2.5 px-2 sm:px-3.5 text-right pr-3 sm:pr-4 font-mono font-extrabold text-xs sm:text-sm text-white">
        {c.points}
      </td>
    </tr>
  );
});

function F1HubContent() {
  const [races, setRaces] = useState<F1Race[]>(DEFAULT_SCHEDULE_2026);
  const [driverStandings, setDriverStandings] = useState<DriverStanding[]>(DEFAULT_DRIVERS_2026);
  const [constructorStandings, setConstructorStandings] = useState<ConstructorStanding[]>(DEFAULT_CONSTRUCTORS_2026);
  const [activeRace, setActiveRace] = useState<F1Race>(() => getInitialActiveRace(DEFAULT_SCHEDULE_2026));
  const [activeServer, setActiveServer] = useState(SERVERS[0]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showStreamPlayer, setShowStreamPlayer] = useState(false);
  const [selectedModalRace, setSelectedModalRace] = useState<F1Race | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);

  // Keyboard shortcut listener to close open modals on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedModalRace(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Memoize immediate next race round
  const immediateNextRaceRound = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return races.find((r) => {
      if (!r.date) return false;
      const [y, m, d] = r.date.split("-").map(Number);
      if (!y || !m || !d) return false;
      const rDate = new Date(y, m - 1, d);
      rDate.setHours(0, 0, 0, 0);
      return rDate >= today;
    })?.round;
  }, [races]);

  useEffect(() => {
    async function fetchAllF1Data() {
      setIsLoadingApi(true);
      try {
        const backendUrl = API_BASE_URL;
        const res = await fetch(`${backendUrl}/api/f1/2026-data`);
        if (res.ok) {
          const data = await res.json();

          // 1. Extract Driver Standings (checking MRData.StandingsTable.StandingsLists[0] and data.driver_standings)
          let extractedDrivers: DriverStanding[] = [];
          const mrDriverStandings = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings;
          if (Array.isArray(mrDriverStandings) && mrDriverStandings.length > 0) {
            extractedDrivers = mrDriverStandings.map((item: any) => {
              const driverObj = item.Driver || {};
              const constructors = item.Constructors || [];
              const teamName = item.teamName || (constructors[0] ? constructors[0].name : "F1 Team");
              return {
                position: parseInt(item.position || "0", 10),
                driverName: item.driverName || `${driverObj.givenName || ""} ${driverObj.familyName || ""}`.trim() || "F1 Driver",
                driverNumber: item.driverNumber || driverObj.permanentNumber || String(item.position || ""),
                teamName: teamName,
                points: typeof item.points === "number" ? item.points : parseFloat(item.points || "0"),
                wins: parseInt(item.wins || "0", 10),
                nationality: item.nationality || driverObj.nationality || "Global"
              };
            });
          } else if (Array.isArray(data?.driver_standings) && data.driver_standings.length > 0) {
            extractedDrivers = data.driver_standings.map((item: any) => ({
              position: Number(item.position) || 0,
              driverName: String(item.driverName || ""),
              driverNumber: String(item.driverNumber || ""),
              teamName: String(item.teamName || ""),
              points: Number(item.points) || 0,
              wins: Number(item.wins) || 0,
              nationality: String(item.nationality || "")
            }));
          }

          if (extractedDrivers.length > 0) {
            setDriverStandings(extractedDrivers);
          }

          // 2. Extract Constructor Standings (checking MRData.StandingsTable.StandingsLists[0] and data.constructor_standings)
          let extractedConstructors: ConstructorStanding[] = [];
          const mrConstructorStandings = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings;
          if (Array.isArray(mrConstructorStandings) && mrConstructorStandings.length > 0) {
            extractedConstructors = mrConstructorStandings.map((item: any) => {
              const constObj = item.Constructor || {};
              return {
                position: parseInt(item.position || "0", 10),
                teamName: item.teamName || constObj.name || "F1 Team",
                nationality: item.nationality || constObj.nationality || "Global",
                points: typeof item.points === "number" ? item.points : parseFloat(item.points || "0"),
                wins: parseInt(item.wins || "0", 10)
              };
            });
          } else if (Array.isArray(data?.constructor_standings) && data.constructor_standings.length > 0) {
            extractedConstructors = data.constructor_standings.map((item: any) => ({
              position: Number(item.position) || 0,
              teamName: String(item.teamName || ""),
              nationality: String(item.nationality || ""),
              points: Number(item.points) || 0,
              wins: Number(item.wins) || 0
            }));
          }

          if (extractedConstructors.length > 0) {
            setConstructorStandings(extractedConstructors);
          }

          // 3. Extract Schedule (checking MRData.RaceTable.Races and data.races)
          let extractedRaces: F1Race[] = [];
          const mrRaces = data?.MRData?.RaceTable?.Races;
          if (Array.isArray(mrRaces) && mrRaces.length > 0) {
            extractedRaces = mrRaces.map((r: any) => {
              if (r.name && r.circuit) return r;
              const circuitInfo = r.Circuit || {};
              const locationInfo = circuitInfo.Location || {};
              const countryName = locationInfo.country || r.country || "";
              return {
                round: parseInt(r.round || "0", 10),
                name: r.raceName || r.name || "Grand Prix",
                circuit: circuitInfo.circuitName || r.circuit || "Circuit",
                location: locationInfo.locality || r.location || "",
                country: countryName,
                flag: COUNTRY_FLAGS[countryName] || r.flag || "🏎️",
                date: r.date || "",
                time: r.time || "",
                status: r.status || "UPCOMING",
                laps: r.laps || 50,
                length: r.length || "5.0 km",
                record: r.record || "1:25.000",
                sessions: r.sessions || { race: `${r.date || ""} ${r.time || "13:00 UTC"}` }
              };
            });
          } else if (Array.isArray(data?.races) && data.races.length > 0) {
            extractedRaces = data.races;
          }

          if (extractedRaces.length > 0) {
            setRaces(extractedRaces);
            const dynamicActive = getInitialActiveRace(extractedRaces);
            setActiveRace(dynamicActive);
          }
        }
      } catch (err) {
        console.warn("Using local 2026 dataset fallback:", err);
      } finally {
        setIsLoadingApi(false);
      }
    }

    fetchAllF1Data();
  }, []);

  const getStreamUrl = (race: F1Race, serverType: string) => {
    const baseId = `f1-round-${race.round}`;
    if (serverType === "dub") {
      return `https://multiembed.mov/directstream.php?video_id=${baseId}&ds_lang=hi`;
    }
    if (serverType === "telemetry") {
      return `https://multiembed.mov/directstream.php?video_id=${baseId}-telemetry`;
    }
    return `https://multiembed.mov/directstream.php?video_id=${baseId}`;
  };

  const handleSelectRaceCard = React.useCallback((race: F1Race) => {
    setActiveRace(race);
    setSelectedModalRace(race);
  }, []);

  const handleLaunchPlayer = React.useCallback(() => {
    setShowStreamPlayer(true);
  }, []);

  const handleCloseModal = React.useCallback(() => {
    setSelectedModalRace(null);
  }, []);

  const currentStreamUrl = getStreamUrl(activeRace, activeServer.type);

  return (
    <div className="min-h-screen bg-[#080A0F] text-white pt-28 pb-36 md:pb-44 px-6 md:px-12 select-none relative">
      {/* Red Bull Red & Speed Yellow Ambient Background Overlay */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-[#EE1240]/20 via-[#FFCC00]/5 to-transparent pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Active Grand Prix Hero Header Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6 p-4 sm:p-6 md:p-8 rounded-3xl bg-[#121620]/95 backdrop-blur-sm border border-white/10 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#EE1240]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3 relative z-10">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className={`px-2.5 sm:px-3 py-1 rounded-full text-white font-black text-[9px] sm:text-[10px] tracking-widest uppercase flex items-center gap-1.5 ${
                activeRace.status === "LIVE NOW"
                  ? "bg-[#EE1240] text-[#FFCC00]"
                  : activeRace.status === "REPLAY"
                  ? "bg-amber-600 text-white"
                  : "bg-blue-600 text-white"
              }`}>
                <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-[#FFCC00] animate-ping" />
                {activeRace.status === "LIVE NOW" ? "LIVE NOW" : activeRace.round === immediateNextRaceRound ? "NEXT RACE" : activeRace.status}
              </span>
              <span className="px-2.5 sm:px-3 py-1 rounded-full bg-white/10 text-white/80 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                ROUND {activeRace.round} OF {races.length}
              </span>
              <span className="text-xl sm:text-2xl">{activeRace.flag}</span>
            </div>

            <p className="text-[9px] sm:text-[10px] font-black text-[#EE1240] uppercase tracking-widest font-mono flex items-center gap-1">
              <span className="text-[#FFCC00]">ORACLE RED BULL RACING</span> • 2026 CHAMPIONSHIP HUB
            </p>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight font-display uppercase leading-tight text-white">
              {activeRace.name}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 font-medium flex items-center gap-1.5 sm:gap-2">
              <MapPin className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#EE1240] shrink-0" />
              <span>{activeRace.circuit} • {activeRace.location}, {activeRace.country} • {formatRaceDate(activeRace.date)}</span>
            </p>
          </div>

          {/* Telemetry Stats Bar */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/10 text-center shrink-0 w-full lg:w-auto relative z-10">
            <div>
              <p className="text-[8px] sm:text-[9px] font-bold text-zinc-400 uppercase tracking-wider">LAPS</p>
              <p className="text-base sm:text-lg font-extrabold text-white font-mono">{activeRace.laps || 50}</p>
            </div>
            <div className="border-x border-white/10 px-2 sm:px-3">
              <p className="text-[8px] sm:text-[9px] font-bold text-zinc-400 uppercase tracking-wider">LENGTH</p>
              <p className="text-base sm:text-lg font-extrabold text-white font-mono">{activeRace.length || "5.0 km"}</p>
            </div>
            <div>
              <p className="text-[8px] sm:text-[9px] font-bold text-zinc-400 uppercase tracking-wider">RECORD</p>
              <p className="text-xs sm:text-sm font-bold text-[#FFCC00] font-mono">{activeRace.record || "1:25.000"}</p>
            </div>
          </div>
        </div>

        {/* F1 Interactive Player / Standby Section */}
        <div className="space-y-4">
          {showStreamPlayer || activeRace.status === "LIVE NOW" ? (
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-[#EE1240]/40 bg-[#000000]">
              {!isLoaded && (
                <div className="absolute inset-0 z-20">
                  <PlayerSkeleton />
                </div>
              )}
              <iframe
                src={currentStreamUrl}
                onLoad={() => setIsLoaded(true)}
                className={`absolute top-0 left-0 w-full h-full transition-opacity duration-300 ${
                  isLoaded ? "opacity-100" : "opacity-0"
                }`}
                allowFullScreen
                frameBorder="0"
                referrerPolicy="origin"
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            </div>
          ) : (
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-[#EE1240]/40 bg-gradient-to-br from-[#0B0E14] via-[#121620] to-[#080A0F] flex flex-col items-center justify-center p-4 sm:p-6 text-center">
              <div className="absolute inset-0 bg-gradient-to-r from-[#EE1240]/10 via-[#FFCC00]/5 to-[#EE1240]/10 pointer-events-none" />
              
              <div className="relative z-10 space-y-3 sm:space-y-4 max-w-xl mx-auto">
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:py-1.5 rounded-full bg-[#EE1240]/20 border border-[#EE1240]/50 text-[#FFCC00] text-[10px] sm:text-xs font-black font-mono uppercase tracking-widest">
                  <Radio className="w-3.5 h-3.5 text-[#EE1240] animate-pulse" />
                  <span>STANDBY MODE • NEXT LIVE SESSION ON SCHEDULE</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl sm:text-3xl">{activeRace.flag}</span>
                    <p className="text-xl sm:text-3xl md:text-4xl font-black text-white font-display uppercase tracking-wide">
                      {activeRace.name}
                    </p>
                  </div>
                  <p className="text-[11px] sm:text-xs md:text-sm text-zinc-300 font-medium">
                    {activeRace.circuit} • {activeRace.location}, {activeRace.country}
                  </p>
                </div>

                {/* Session Timetable Preview */}
                <div className="p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <p className="text-[9px] sm:text-[10px] font-extrabold text-[#EE1240] font-mono uppercase tracking-wider">
                    SESSION TIMETABLE READY (PAKISTAN TIME / PKT)
                  </p>
                  <div className="flex items-center justify-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-mono font-bold text-white flex-wrap">
                    <div>
                      <span className="text-zinc-400 text-[9px] sm:text-[10px]">FP1: </span>
                      <span>{formatSessionDateTimePKT(activeRace.sessions.fp1, "11:30 UTC", activeRace.date, "fp1").split("•")[1] || "04:30 PM PKT"}</span>
                    </div>
                    <span className="text-white/20">•</span>
                    <div>
                      <span className="text-zinc-400 text-[9px] sm:text-[10px]">QUALIFYING: </span>
                      <span>{formatSessionDateTimePKT(activeRace.sessions.qualifying, "14:00 UTC", activeRace.date, "qualifying").split("•")[1] || "07:00 PM PKT"}</span>
                    </div>
                    <span className="text-white/20">•</span>
                    <div>
                      <span className="text-zinc-400 text-[9px] sm:text-[10px]">RACE: </span>
                      <span className="text-[#FFCC00]">{formatSessionDateTimePKT(activeRace.sessions.race, "13:00 UTC", activeRace.date, "race").split("•")[1] || "06:00 PM PKT"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                  <button
                    onClick={() => setSelectedModalRace(activeRace)}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs uppercase tracking-wider hover:bg-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/10"
                  >
                    <Clock className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#FFCC00]" />
                    <span>View Timetable</span>
                  </button>

                  <button
                    onClick={handleLaunchPlayer}
                    className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-[#EE1240] text-[#FFCC00] font-black text-xs uppercase tracking-wider hover:bg-[#EE1240]/90 transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#FFCC00]/40"
                  >
                    <Play className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-current" />
                    <span>Launch Live Player</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Player Controls & Server Switcher Bar */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#121620]/95 backdrop-blur-sm border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Radio className="w-4 sm:w-5 h-4 sm:h-5 text-[#EE1240] animate-pulse shrink-0" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-extrabold text-white font-display uppercase tracking-wide">
                    {activeRace.name} — {activeServer.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-[#EE1240]/20 text-[#FFCC00] border border-[#EE1240]/50 text-[9px] font-mono font-black tracking-wider uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EE1240] animate-ping" />
                    {showStreamPlayer || activeRace.status === "LIVE NOW" ? "STREAM ACTIVE" : "STANDBY BUFFER"}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-300 font-medium mt-0.5">
                  {activeRace.status === "LIVE NOW"
                    ? "Live High-Definition Broadcast Stream Active"
                    : "Session Stream Standby Buffer • Synchronized for FP1, FP2, FP3, Quali & Main GP"}
                </p>
              </div>
            </div>

            {/* Server Selector Pills */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {SERVERS.map((srv) => (
                <button
                  key={srv.id}
                  onClick={() => {
                    setActiveServer(srv);
                    setIsLoaded(false);
                    setShowStreamPlayer(true);
                  }}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-extrabold transition-all duration-200 cursor-pointer flex-1 sm:flex-none text-center ${
                    activeServer.id === srv.id
                      ? "bg-[#EE1240] text-[#FFCC00] scale-105 border border-[#FFCC00]/40"
                      : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                  }`}
                >
                  {srv.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* UNIFIED CHAMPIONSHIP DASHBOARD */}
        <div className="space-y-10 pt-6 border-t border-white/10">
          {/* SECTION 1: 2026 RACE CALENDAR CAROUSEL STRIP */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-[9px] sm:text-[10px] font-bold text-[#EE1240] uppercase tracking-widest font-mono flex items-center gap-2">
                  <span className="text-[#FFCC00]">ORACLE RED BULL RACING</span> • FIA FORMULA 1 WORLD CHAMPIONSHIP
                  {isLoadingApi && <RefreshCw className="w-3 h-3 animate-spin text-[#EE1240]" />}
                </p>
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white font-display flex items-center gap-2">
                  <span>2026 Race Calendar</span>
                  <span className="text-xs font-mono font-normal text-zinc-400">({races.length} RACES)</span>
                </h2>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span className="hidden sm:inline-block font-semibold">Click card for session timetable</span>
              </div>
            </div>

            {/* Horizontal Scrollable Carousel Strip (Touch friendly with hardware acceleration) */}
            <div className="flex items-center gap-3 overflow-x-auto touch-pan-x snap-x snap-mandatory pb-3 pt-1 px-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent scroll-smooth transform-gpu">
              {races.map((race) => {
                const isCurrent = activeRace.round === race.round;
                const isImmediateNext = race.round === immediateNextRaceRound;
                const badge = getRaceStatusBadge(race.date, isImmediateNext, race.status);

                return (
                  <RaceCarouselCard
                    key={race.round}
                    race={race}
                    isCurrent={isCurrent}
                    isImmediateNext={isImmediateNext}
                    badge={badge}
                    onClick={handleSelectRaceCard}
                  />
                );
              })}
            </div>
          </section>

          {/* SECTION 2 & 3: DUAL STANDINGS DASHBOARD (SIDE-BY-SIDE GRID) */}
          <section className="space-y-4 pt-2 border-t border-white/10">
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold text-[#EE1240] uppercase tracking-widest font-mono">
                CHAMPIONSHIP LEADERBOARDS
              </p>
              <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white font-display">2026 Championship Standings</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* DRIVER STANDINGS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm sm:text-base font-extrabold text-white font-display flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#FFCC00]" />
                    <span>Driver Standings</span>
                  </h3>
                  <span className="text-xs font-mono text-zinc-400 font-bold">TOP {driverStandings.length}</span>
                </div>

                <div className="bg-[#121620]/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl [contain:content]">
                  <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/20">
                    <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-full">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5 text-[9px] sm:text-[10px] font-extrabold text-white/50 uppercase font-mono">
                          <th className="py-2.5 sm:py-3 px-2 sm:px-3.5 w-12 text-center">POS</th>
                          <th className="py-2.5 sm:py-3 px-2 sm:px-3.5">DRIVER</th>
                          <th className="py-2.5 sm:py-3 px-2 sm:px-3.5 w-14 sm:w-16 text-center">NO</th>
                          <th className="py-2.5 sm:py-3 px-2 sm:px-3.5">TEAM</th>
                          <th className="py-2.5 sm:py-3 px-2 sm:px-3.5 w-14 sm:w-16 text-center">WINS</th>
                          <th className="py-2.5 sm:py-3 px-2 sm:px-3.5 w-16 sm:w-20 text-right pr-3 sm:pr-4">PTS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs font-medium">
                        {driverStandings.map((drv) => (
                          <DriverRow key={drv.position} drv={drv} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* CONSTRUCTOR STANDINGS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm sm:text-base font-extrabold text-white font-display flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-blue-400" />
                    <span>Constructor Standings</span>
                  </h3>
                  <span className="text-xs font-mono text-zinc-400 font-bold">TOP {constructorStandings.length}</span>
                </div>

                <div className="bg-[#121620]/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl [contain:content]">
                  <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/20">
                    <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-full">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5 text-[9px] sm:text-[10px] font-extrabold text-white/50 uppercase font-mono">
                          <th className="py-2.5 sm:py-3 px-2 sm:px-3.5 w-12 text-center">POS</th>
                          <th className="py-2.5 sm:py-3 px-2 sm:px-3.5">CONSTRUCTOR / TEAM</th>
                          <th className="py-2.5 sm:py-3 px-2 sm:px-3.5">NATION</th>
                          <th className="py-2.5 sm:py-3 px-2 sm:px-3.5 w-14 sm:w-16 text-center">WINS</th>
                          <th className="py-2.5 sm:py-3 px-2 sm:px-3.5 w-16 sm:w-20 text-right pr-3 sm:pr-4">PTS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs font-medium">
                        {constructorStandings.map((c) => (
                          <ConstructorRow key={c.position} c={c} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Session Timetable Glassmorphism Modal */}
      {selectedModalRace && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedModalRace(null)}
        >
          <div 
            className="bg-[#080A0F] border border-white/15 rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-[0_0_40px_rgba(238,18,64,0.25)] relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedModalRace(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              title="Close (ESC)"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl">{selectedModalRace.flag}</span>
                <div>
                  <span className="text-[10px] font-mono text-[#FFCC00] font-bold uppercase">
                    ROUND {selectedModalRace.round} OF {races.length}
                  </span>
                  <h3 className="text-xl font-extrabold text-white font-display">
                    {selectedModalRace.name}
                  </h3>
                </div>
              </div>
              <p className="text-xs text-white/60 font-medium">
                {selectedModalRace.circuit} • {selectedModalRace.location}, {selectedModalRace.country}
              </p>
            </div>

            {/* Session Schedule Breakdown */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#EE1240] font-mono flex items-center justify-between">
                <span>SESSION TIMETABLE (PKT)</span>
                <span className="text-[#FFCC00] font-bold">UTC+5</span>
              </p>

              <div className="space-y-2 text-xs divide-y divide-white/5 bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="flex justify-between py-1.5 font-medium">
                  <span className="text-zinc-300">Practice 1 (FP1)</span>
                  <span className="font-mono font-bold text-white">
                    {formatSessionDateTimePKT(selectedModalRace.sessions.fp1, "11:30 UTC", selectedModalRace.date, "fp1")}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 font-medium">
                  <span className="text-zinc-300">Practice 2 (FP2)</span>
                  <span className="font-mono font-bold text-white">
                    {formatSessionDateTimePKT(selectedModalRace.sessions.fp2, "15:00 UTC", selectedModalRace.date, "fp2")}
                  </span>
                </div>
                {selectedModalRace.sessions.fp3 && (
                  <div className="flex justify-between py-1.5 font-medium">
                    <span className="text-zinc-300">Practice 3 (FP3)</span>
                    <span className="font-mono font-bold text-white">
                      {formatSessionDateTimePKT(selectedModalRace.sessions.fp3, "10:30 UTC", selectedModalRace.date, "fp3")}
                    </span>
                  </div>
                )}
                {selectedModalRace.sessions.sprint && (
                  <div className="flex justify-between py-1.5 font-medium">
                    <span className="text-[#FFCC00] font-bold">Sprint Session</span>
                    <span className="font-mono font-bold text-white">
                      {formatSessionDateTimePKT(selectedModalRace.sessions.sprint, "10:00 UTC", selectedModalRace.date, "sprint")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 font-medium">
                  <span className="text-zinc-300">Qualifying</span>
                  <span className="font-mono font-bold text-white">
                    {formatSessionDateTimePKT(selectedModalRace.sessions.qualifying, "14:00 UTC", selectedModalRace.date, "qualifying")}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 font-medium pt-2">
                  <span className="text-[#EE1240] font-extrabold uppercase">Main Grand Prix Race</span>
                  <span className="font-mono font-extrabold text-white">
                    {formatSessionDateTimePKT(selectedModalRace.sessions.race, "13:00 UTC", selectedModalRace.date, "race")}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Action CTA */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleSelectRaceCard(selectedModalRace)}
                className="flex-1 py-3 rounded-2xl bg-[#EE1240] text-[#FFCC00] font-extrabold text-xs uppercase tracking-wider hover:bg-[#EE1240]/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#EE1240]/40 border border-[#FFCC00]/40"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Load Live Stream</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function F1Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050508] pt-28 px-6 max-w-7xl mx-auto space-y-6">
        <div className="h-64 w-full bg-white/5 rounded-3xl animate-pulse" />
      </div>
    }>
      <F1HubContent />
    </Suspense>
  );
}
