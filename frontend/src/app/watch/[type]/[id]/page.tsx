"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { apiFetch, getStoredToken } from '../../../../lib/api';
import { saveWatchProgress, getSavedTimestamp, getCleanMediaId, getContinueWatchingList, getStorageKey, LocalProgressItem } from '../../../../lib/progress';
import { ImageService } from '../../../../lib/ImageService';
import {
  Play,
  X,
  AlertTriangle,
  RotateCcw,
  SkipForward,
  FastForward,
  Rewind,
  Clock,
  Maximize2,
  Minimize2,
  Tv,
  List,
  Keyboard,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Download,
} from 'lucide-react';
import { soundFx } from '../../../../lib/soundEffects';
import AmbientGlow from '../../../../components/shared/AmbientGlow';
import { useAmbientStore } from '../../../../store/ambientStore';
import { useUserStore } from '../../../../store/userStore';
import NightCastPlayer from '../../../../components/player/NightCastPlayer';
import MovieRow from '../../../../components/shared/MovieRow';
import EpisodeCard from '../../../../components/shared/EpisodeCard';
import { PlayerSkeleton } from '../../../../components/shared/Skeletons';

function attachTimestampToUrl(url: string, seconds: number): string {
  if (!url) return url;
  try {
    const urlObj = new URL(url);
    if (seconds > 3) {
      const s = Math.floor(seconds).toString();
      // VidLink uses 'startAt'
      urlObj.searchParams.set('startAt', s);
      // VidBolt & standard iframe players accept start, time, t
      urlObj.searchParams.set('start', s);
      urlObj.searchParams.set('time', s);
      urlObj.searchParams.set('t', s);
      urlObj.searchParams.set('progress', s);
    }
    if (url.includes('vidlink.pro')) {
      if (!urlObj.searchParams.has('primaryColor')) {
        urlObj.searchParams.set('primaryColor', '39AEA9');
      }
      if (!urlObj.searchParams.has('autoplay')) {
        urlObj.searchParams.set('autoplay', 'true');
      }
    } else if (url.includes('vidbolt.xyz')) {
      if (!urlObj.searchParams.has('theme')) {
        urlObj.searchParams.set('theme', '39AEA9');
      }
    }
    return urlObj.toString();
  } catch {
    if (seconds > 3) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}startAt=${Math.floor(seconds)}&start=${Math.floor(seconds)}&time=${Math.floor(seconds)}&t=${Math.floor(seconds)}`;
    }
    return url;
  }
}

function formatPlayerTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activeProfile, settings } = useUserStore();
  const type = Array.isArray(params.type) ? params.type[0] : params.type;
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = getCleanMediaId(rawId);

  const initialSeason = useMemo(() => {
    const fromQuery = searchParams.get('season');
    if (fromQuery) {
      const s = parseInt(fromQuery, 10);
      if (!isNaN(s) && s >= 1) return s;
    }
    return 1;
  }, [searchParams]);

  const initialEpisode = useMemo(() => {
    const fromQuery = searchParams.get('episode');
    if (fromQuery) {
      const ep = parseInt(fromQuery, 10);
      if (!isNaN(ep) && ep >= 1) return ep;
    }
    return 1;
  }, [searchParams]);

  const [currentSeason, setCurrentSeason] = useState(initialSeason);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [meta, setMeta] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const buildServers = useCallback((seasonNum: number, episodeNum: number) => {
    return [
      {
        id: 'vidbolt',
        name: 'Server 1 (VidBolt - Fast HD Stream)',
        url: type === 'tv'
          ? `https://vidbolt.xyz/tv/${id}/${seasonNum}/${episodeNum}?theme=39AEA9`
          : type === 'anime'
          ? `https://vidbolt.xyz/anime/${id}/${episodeNum}?theme=39AEA9`
          : `https://vidbolt.xyz/movie/${id}?theme=39AEA9`,
        type: 'iframe',
        language: 'en',
        language_name: 'vidbolt.xyz'
      },
      {
        id: 'screenscape',
        name: 'ScreenScape (Hindi Dubbed 🇮🇳)',
        url: type === 'tv' || type === 'anime'
          ? `https://nxsha.screenscape.me/embed?tmdb=${id}&type=tv&s=${seasonNum}&e=${episodeNum}&lan=hindi`
          : `https://nxsha.screenscape.me/embed?tmdb=${id}&type=movie&lan=hindi`,
        type: 'iframe',
        language: 'hi',
        language_name: 'ScreenScape (Hindi Dubbed)'
      },
      {
        id: 'vidlink',
        name: 'Server 2 (VidLink Pro)',
        url: type === 'tv'
          ? `https://vidlink.pro/tv/${id}/${seasonNum}/${episodeNum}?primaryColor=39AEA9&autoplay=true`
          : `https://vidlink.pro/movie/${id}?primaryColor=39AEA9&autoplay=true`,
        type: 'iframe',
        language: 'en',
        language_name: 'vidlink.pro'
      },
      {
        id: 'nightcast-native',
        name: 'Server 3 (AutoEmbed - Fast)',
        url: type === 'tv'
          ? `https://player.autoembed.cc/embed/tv/${id}/${seasonNum}/${episodeNum}`
          : `https://player.autoembed.cc/embed/movie/${id}`,
        type: 'iframe',
        language: 'en',
        language_name: 'AutoEmbed'
      },
      {
        id: 'vidsrc-to',
        name: 'Server 4 (VidSrc VIP)',
        url: type === 'tv'
          ? `https://vidsrc.to/embed/tv/${id}/${seasonNum}/${episodeNum}`
          : `https://vidsrc.to/embed/movie/${id}`,
        type: 'iframe',
        language: 'en',
        language_name: 'vidsrc.to'
      },
      {
        id: 'vidsrc',
        name: 'Server 5 (VidSrc Mirror)',
        url: type === 'tv'
          ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${seasonNum}&episode=${episodeNum}`
          : `https://vidsrc.me/embed/movie?tmdb=${id}`,
        type: 'iframe',
        language: 'en',
        language_name: 'vidsrc.me'
      }
    ];
  }, [type, id]);

  const [servers, setServers] = useState<any[]>(() => buildServers(initialSeason, initialEpisode));

  const [activeServerId, setActiveServerId] = useState<string>('vidbolt');
  const [resumeTime, setResumeTime] = useState<number>(0);
  const [playerUrl, setPlayerUrl] = useState<string>("");

  const [seasonEpisodes, setSeasonEpisodes] = useState<any[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [failedServerIds, setFailedServerIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Playback Tracking Refs
  const playbackSecondsRef = useRef<number>(0);
  const watchDurationSecondsRef = useRef<number>(0);
  const hasRealPlayerEventsRef = useRef<boolean>(false);
  const lastRealPlayerEventTimeRef = useRef<number>(0);
  const lastBackendSaveTimeRef = useRef<number>(0);
  const hasSavedFinishingRef = useRef<boolean>(false);

  // Luxury Cinema Experience States
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isAdShieldActive, setIsAdShieldActive] = useState<boolean>(false);

  // Restore client preferences and saved progress safely after mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('nightcast_preferred_server');
        localStorage.removeItem('nightcast_preferred_server_v2');
        localStorage.removeItem('nightcast_preferred_server_v4');
        localStorage.removeItem('nightcast_preferred_server_v6');
        const savedServer = localStorage.getItem('nightcast_preferred_server_v7');
        if (savedServer && ['screenscape', 'vidbolt', 'vidlink', 'nightcast-native', 'vidsrc-to', 'vidsrc'].includes(savedServer)) {
          setActiveServerId(savedServer);
        } else if (settings?.preferred_language === 'hi') {
          setActiveServerId('screenscape');
        } else {
          setActiveServerId('vidbolt');
        }
        const savedShield = localStorage.getItem('nightcast_ad_shield_v2');
        if (savedShield !== null) {
          setIsAdShieldActive(savedShield === 'true');
        }
      } catch {}

      if (!searchParams.get('season') && type === 'tv' && id) {
        const savedList = getContinueWatchingList();
        const match = savedList.find((x: LocalProgressItem) => getCleanMediaId(x.id) === id && x.season);
        if (match?.season) setCurrentSeason(match.season);
        if (match?.episode) setCurrentEpisode(match.episode);
      }
    }
  }, [type, id, searchParams, settings?.preferred_language]);
  const [isEpisodeDrawerOpen, setIsEpisodeDrawerOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Next Episode & Auto-play states
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const [nextCountdown, setNextCountdown] = useState(10);
  const [isAutoPlayDismissed, setIsAutoPlayDismissed] = useState(false);
  const showNextOverlayRef = useRef(false);
  const isAutoPlayDismissedRef = useRef(false);

  useEffect(() => {
    showNextOverlayRef.current = showNextOverlay;
  }, [showNextOverlay]);

  useEffect(() => {
    isAutoPlayDismissedRef.current = isAutoPlayDismissed;
  }, [isAutoPlayDismissed]);

  useEffect(() => {
    setFailedServerIds([]);
    setToastMessage(null);
    setShowNextOverlay(false);
    showNextOverlayRef.current = false;
    setIsAutoPlayDismissed(false);
    isAutoPlayDismissedRef.current = false;
    hasSavedFinishingRef.current = false;
    setNextCountdown(10);
  }, [id, currentSeason, currentEpisode]);

  const rawActiveServer = useMemo(() => {
    const list = servers && servers.length > 0 ? servers : buildServers(currentSeason, currentEpisode);
    const target = list.find((s: any) => s.id === activeServerId) || list[0];
    if (target && target.type === 'iframe') {
      if (target.id === 'screenscape') {
        return {
          ...target,
          url: type === 'tv' || type === 'anime'
            ? `https://nxsha.screenscape.me/embed?tmdb=${id}&type=tv&s=${currentSeason}&e=${currentEpisode}&lan=hindi`
            : `https://nxsha.screenscape.me/embed?tmdb=${id}&type=movie&lan=hindi`
        };
      }
      if (target.id === 'vidlink') {
        return {
          ...target,
          url: type === 'tv'
            ? `https://vidlink.pro/tv/${id}/${currentSeason}/${currentEpisode}?primaryColor=39AEA9&autoplay=true`
            : `https://vidlink.pro/movie/${id}?primaryColor=39AEA9&autoplay=true`
        };
      }
      if (target.id === 'nightcast-native') {
        return {
          ...target,
          url: type === 'tv'
            ? `https://player.autoembed.cc/embed/tv/${id}/${currentSeason}/${currentEpisode}`
            : `https://player.autoembed.cc/embed/movie/${id}`
        };
      }
      if (target.id === 'vidbolt') {
        return {
          ...target,
          url: type === 'tv'
            ? `https://vidbolt.xyz/tv/${id}/${currentSeason}/${currentEpisode}?theme=39AEA9`
            : type === 'anime'
            ? `https://vidbolt.xyz/anime/${id}/${currentEpisode}?theme=39AEA9`
            : `https://vidbolt.xyz/movie/${id}?theme=39AEA9`
        };
      }
      if (target.id === 'vidsrc-to') {
        return {
          ...target,
          url: type === 'tv'
            ? `https://vidsrc.to/embed/tv/${id}/${currentSeason}/${currentEpisode}`
            : `https://vidsrc.to/embed/movie/${id}`
        };
      }
      if (target.id === 'vidsrc') {
        return {
          ...target,
          url: type === 'tv'
            ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${currentSeason}&episode=${currentEpisode}`
            : `https://vidsrc.me/embed/movie?tmdb=${id}`
        };
      }
    }
    return target;
  }, [servers, buildServers, currentSeason, currentEpisode, activeServerId, type, id]);
  const isServerFailed = rawActiveServer && failedServerIds.includes(rawActiveServer.id);

  const activeServer = useMemo(() => {
    if (!rawActiveServer) return null;
    if (isServerFailed) {
      let fallbackUrl = rawActiveServer.url;
      if (rawActiveServer.id === 'screenscape') {
        fallbackUrl = type === 'tv'
          ? `https://vidbolt.xyz/tv/${id}/${currentSeason}/${currentEpisode}?theme=39AEA9`
          : `https://vidbolt.xyz/movie/${id}?theme=39AEA9`;
      } else if (rawActiveServer.id === 'vidbolt') {
        fallbackUrl = type === 'tv'
          ? `https://vidlink.pro/tv/${id}/${currentSeason}/${currentEpisode}?primaryColor=39AEA9&autoplay=true`
          : `https://vidlink.pro/movie/${id}?primaryColor=39AEA9&autoplay=true`;
      } else if (rawActiveServer.id === 'vidlink') {
        fallbackUrl = type === 'tv'
          ? `https://player.autoembed.cc/embed/tv/${id}/${currentSeason}/${currentEpisode}`
          : `https://player.autoembed.cc/embed/movie/${id}`;
      } else if (rawActiveServer.id === 'nightcast-native') {
        fallbackUrl = type === 'tv'
          ? `https://vidsrc.to/embed/tv/${id}/${currentSeason}/${currentEpisode}`
          : `https://vidsrc.to/embed/movie/${id}`;
      } else if (rawActiveServer.id === 'vidsrc-to') {
        fallbackUrl = type === 'tv'
          ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${currentSeason}&episode=${currentEpisode}`
          : `https://vidsrc.me/embed/movie?tmdb=${id}`;
      } else if (rawActiveServer.id === 'vidsrc') {
        fallbackUrl = type === 'tv'
          ? `https://vidbolt.xyz/tv/${id}/${currentSeason}/${currentEpisode}?theme=39AEA9`
          : `https://vidbolt.xyz/movie/${id}?theme=39AEA9`;
      }
      return {
        ...rawActiveServer,
        type: 'iframe',
        url: fallbackUrl
      };
    }
    return rawActiveServer;
  }, [rawActiveServer, isServerFailed, type, id, currentSeason, currentEpisode]);

  useEffect(() => {
    const s = parseInt(searchParams.get('season') || '1', 10);
    const ep = parseInt(searchParams.get('episode') || '1', 10);
    setCurrentSeason(s);
    setCurrentEpisode(ep);
  }, [searchParams]);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        if (!id || !type) return;
        const data = await apiFetch(`/api/tmdb/${type}/${id}`);
        setMeta(data);

        const backdrop = data?.backdrop_path || data?.poster_path;
        const title = data?.title || data?.name;
        if (backdrop) {
          useAmbientStore.getState().setActiveBackdrop(backdrop, title);
        }

        const recs = await apiFetch(`/api/tmdb/${type}/${id}/recommendations`);
        setRecommendations(recs || []);
      } catch (err) {
        console.error("Meta fetch error", err);
      }
    };
    fetchMeta();

    return () => {
      useAmbientStore.getState().clearActiveBackdrop(0);
    };
  }, [id, type]);

  useEffect(() => {
    if ((type !== 'tv' && type !== 'anime') || !id) return;
    const fetchEpisodes = async () => {
      setEpisodesLoading(true);
      try {
        const data = await apiFetch(`/api/tmdb/tv/${id}/season/${currentSeason}`);
        setSeasonEpisodes(data?.episodes || []);
      } catch (err) {
        console.error("Season fetch error", err);
        setSeasonEpisodes([]);
      } finally {
        setEpisodesLoading(false);
      }
    };
    fetchEpisodes();
  }, [id, type, currentSeason]);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        if (!id || !type) return;
        const lang = settings?.preferred_language === 'hi' ? 'hi' : 'all';
        const data = await apiFetch(
          `/api/tmdb/${type}/${id}/streams?season=${currentSeason}&episode=${currentEpisode}&language=${lang}`
        );
        if (data?.servers && data.servers.length > 0) {
          setServers(data.servers);
          const preferred = typeof window !== 'undefined'
            ? localStorage.getItem('nightcast_preferred_server_v7')
            : null;
          if (preferred && data.servers.some((s: any) => s.id === preferred)) {
            setActiveServerId(preferred);
          } else if (settings?.preferred_language === 'hi' && data.servers.some((s: any) => s.id === 'screenscape')) {
            setActiveServerId('screenscape');
          } else {
            const vidboltServer = data.servers.find((s: any) => s.id === 'vidbolt');
            setActiveServerId(vidboltServer ? 'vidbolt' : data.servers[0].id);
          }
        }
      } catch (err) {
        console.error("Streams fetch error", err);
      }
    };
    fetchServers();
  }, [id, type, currentSeason, currentEpisode, settings?.preferred_language]);

  useEffect(() => {
    if (!activeServer) return;
    const isTv = type === 'tv';
    const queryTime = searchParams.get('time') || searchParams.get('t');
    const parsedQuery = queryTime ? parseInt(queryTime, 10) : 0;
    const seconds = parsedQuery > 3
      ? parsedQuery
      : getSavedTimestamp(
          id,
          isTv ? currentSeason : undefined,
          isTv ? currentEpisode : undefined,
          type as 'movie' | 'tv',
          activeProfile?.id
        );

    const finalUrl = attachTimestampToUrl(activeServer.url, seconds);
    setPlayerUrl(finalUrl);
    setResumeTime(seconds);
    playbackSecondsRef.current = seconds;
    setIsIframeLoaded(false);
  }, [activeServer, id, type, currentSeason, currentEpisode, searchParams, activeProfile?.id]);

  // If iframe onLoad hasn't fired after 2 seconds (due to adblocker or sandbox), mark as loaded so heartbeat and progress can run
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setIsIframeLoaded(true);
    }, 2000);
    return () => clearTimeout(fallbackTimer);
  }, [playerUrl]);

  // ScreenScape Progress bridge communication
  useEffect(() => {
    if (activeServerId === 'screenscape' && isIframeLoaded) {
      const iframe = document.getElementById("screenscape-player") as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        if (resumeTime > 3) {
          try {
            iframe.contentWindow.postMessage({
              type: "SCREENSCAPE_SET_PROGRESS",
              tmdb: id,
              season: type === 'tv' ? currentSeason : undefined,
              episode: type === 'tv' ? currentEpisode : undefined,
              progress: resumeTime
            }, "https://nxsha.screenscape.me");
          } catch {}
        }
        try {
          iframe.contentWindow.postMessage({
            type: "SCREENSCAPE_GET_PROGRESS",
            tmdb: id,
            season: type === 'tv' ? currentSeason : undefined,
            episode: type === 'tv' ? currentEpisode : undefined,
            requestId: `sc-${Date.now()}`
          }, "https://nxsha.screenscape.me");
        } catch {}
      }
    }
  }, [activeServerId, isIframeLoaded, resumeTime, id, type, currentSeason, currentEpisode]);

  const movieTitle = meta?.title || meta?.name || "Loading Stream...";
  const releaseYear = meta?.release_date || meta?.first_air_date
    ? new Date(meta.release_date || meta.first_air_date).getFullYear().toString() : "2026";

  const seasons = useMemo(() => {
    return meta?.seasons || [{ season_number: 1, episode_count: 8, name: "Season 1" }];
  }, [meta]);

  const selectedSeasonData = useMemo(() => {
    return seasons.find((s: any) => s.season_number === currentSeason) || seasons[0];
  }, [seasons, currentSeason]);

  const episodesCount = selectedSeasonData?.episode_count || 8;

  const nextEpisodeInfo = useMemo(() => {
    if (type !== 'tv') return null;
    const currentSeasonObj = seasons.find((s: any) => s.season_number === currentSeason);
    const maxEpInSeason = seasonEpisodes.length > 0 ? seasonEpisodes.length : (currentSeasonObj?.episode_count || 8);

    if (currentEpisode < maxEpInSeason) {
      const nextEpData = seasonEpisodes.find((ep: any) => ep.episode_number === currentEpisode + 1);
      return {
        season: currentSeason,
        episode: currentEpisode + 1,
        title: nextEpData?.name || `Episode ${currentEpisode + 1}`,
        still_path: nextEpData?.still_path || null,
        isNewSeason: false
      };
    } else {
      const validSeasons = seasons
        .filter((s: any) => s.season_number > 0)
        .sort((a: any, b: any) => a.season_number - b.season_number);
      const nextSeasonObj = validSeasons.find((s: any) => s.season_number > currentSeason);
      if (nextSeasonObj) {
        return {
          season: nextSeasonObj.season_number,
          episode: 1,
          title: nextSeasonObj.name || `Season ${nextSeasonObj.season_number}`,
          still_path: null,
          isNewSeason: true
        };
      }
    }
    return null;
  }, [type, seasons, seasonEpisodes, currentSeason, currentEpisode]);

  const getEstimatedDuration = useCallback((): number => {
    if (type === 'movie') {
      if (meta?.runtime && meta.runtime > 0) return meta.runtime * 60;
      return 7200;
    }
    const epData = seasonEpisodes.find((ep) => ep.episode_number === currentEpisode);
    if (epData?.runtime && epData.runtime > 0) return epData.runtime * 60;

    if (Array.isArray(meta?.episode_run_time) && meta.episode_run_time.length > 0 && meta.episode_run_time[0] > 0) {
      return meta.episode_run_time[0] * 60;
    }
    return 2700;
  }, [type, meta, seasonEpisodes, currentEpisode]);

  const handleEpisodeChange = useCallback((s: number, ep: number) => {
    // Before switching, record the current episode as completed/skipped in Watch History
    if (id && meta) {
      const curTime = playbackSecondsRef.current || 0;
      const estDuration = getEstimatedDuration();
      const cleanMediaId = getCleanMediaId(id);

      saveWatchProgress({
        id: cleanMediaId,
        media_type: 'tv',
        title: meta.title || meta.name || 'Untitled',
        poster_path: meta.poster_path || null,
        backdrop_path: meta.backdrop_path || null,
        season: currentSeason,
        episode: currentEpisode,
        timestamp_seconds: curTime,
        duration_seconds: estDuration,
        progress_percent: 100.0,
        next_season: s,
        next_episode: ep,
      }, activeProfile?.id);

      if (activeProfile?.id) {
        apiFetch('/api/v1/progress/update', {
          method: 'POST',
          headers: { 'X-Profile-ID': activeProfile.id },
          body: JSON.stringify({
            mediaType: 'tv',
            id: cleanMediaId,
            currentTime: curTime > 0 ? curTime : estDuration,
            duration: estDuration,
            progress: 100.0,
            season: currentSeason,
            episode: currentEpisode,
            event: 'skipped',
            title: meta.title || meta.name || 'Untitled',
            posterPath: meta.poster_path,
            backdropPath: meta.backdrop_path,
          })
        }).catch(console.error);
      }
    }

    setShowNextOverlay(false);
    showNextOverlayRef.current = false;
    setIsAutoPlayDismissed(false);
    isAutoPlayDismissedRef.current = false;
    setNextCountdown(10);
    setCurrentSeason(s);
    setCurrentEpisode(ep);
    playbackSecondsRef.current = 0;
    watchDurationSecondsRef.current = 0;
    hasRealPlayerEventsRef.current = false;
    setIsIframeLoaded(false);
    router.push(`/watch/tv/${id}?season=${s}&episode=${ep}`, { scroll: false });
  }, [id, router, meta, activeProfile?.id, currentSeason, currentEpisode, getEstimatedDuration]);

  const triggerNextEpisodeOverlay = useCallback(() => {
    if (type === 'tv' && nextEpisodeInfo && !isAutoPlayDismissedRef.current && !showNextOverlayRef.current) {
      setShowNextOverlay(true);
      showNextOverlayRef.current = true;
      setNextCountdown(10);
    }
  }, [type, nextEpisodeInfo]);

  // Countdown timer effect for auto-playing next episode
  useEffect(() => {
    if (!showNextOverlay || !nextEpisodeInfo) return;

    if (nextCountdown <= 0) {
      handleEpisodeChange(nextEpisodeInfo.season, nextEpisodeInfo.episode);
      return;
    }

    const timer = setTimeout(() => {
      setNextCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [showNextOverlay, nextCountdown, nextEpisodeInfo, handleEpisodeChange]);

  const handlePlayerProgress = useCallback((currentTime: number, duration: number) => {
    if (!id) return;
    playbackSecondsRef.current = currentTime;
    try {
      const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
      
      saveWatchProgress({
        id: id,
        media_type: type as 'movie' | 'tv',
        title: meta?.title || meta?.name || 'Untitled',
        poster_path: meta?.poster_path || null,
        backdrop_path: meta?.backdrop_path || null,
        season: type === 'tv' ? currentSeason : undefined,
        episode: type === 'tv' ? currentEpisode : undefined,
        timestamp_seconds: currentTime,
        duration_seconds: duration,
        progress_percent: progressPercent,
        next_season: nextEpisodeInfo?.season,
        next_episode: nextEpisodeInfo?.episode,
      }, activeProfile?.id);

      // Auto-trigger next episode overlay in web series when nearing the end
      if (type === 'tv' && duration > 60 && (currentTime >= duration - 25 || progressPercent >= 90)) {
        if (!isAutoPlayDismissedRef.current && !showNextOverlayRef.current) {
          triggerNextEpisodeOverlay();
        }
      }

      const now = Date.now();
      const isFinishing = duration > 0 && (progressPercent >= 90.0 || (duration > 60 && currentTime >= duration - 25));
      if (!isFinishing && progressPercent < 85.0) {
        hasSavedFinishingRef.current = false;
      }

      let shouldSaveBackend = (now - lastBackendSaveTimeRef.current >= 8000);
      if (isFinishing && !hasSavedFinishingRef.current) {
        shouldSaveBackend = true;
        hasSavedFinishingRef.current = true;
      }

      if (activeProfile && meta && shouldSaveBackend) {
        lastBackendSaveTimeRef.current = now;
        const cleanMediaId = getCleanMediaId(id);
        apiFetch('/api/progress/update', {
          method: 'POST',
          headers: { 'X-Profile-ID': activeProfile.id },
          body: JSON.stringify({
            mediaType: type,
            id: cleanMediaId,
            currentTime: currentTime,
            duration: duration,
            progress: progressPercent,
            season: type === 'tv' ? currentSeason : undefined,
            episode: type === 'tv' ? currentEpisode : undefined,
            event: isFinishing ? 'ended' : 'progress',
            title: meta.title || meta.name || 'Untitled',
            posterPath: meta.poster_path,
            backdropPath: meta.backdrop_path,
          })
        }).catch(console.error);
      }
    } catch (e) {
      console.error("Failed to save progress", e);
    }
  }, [id, activeProfile, meta, type, currentSeason, currentEpisode, nextEpisodeInfo, triggerNextEpisodeOverlay]);

  const handleSeekDelta = useCallback((deltaSeconds: number) => {
    const estDuration = getEstimatedDuration();
    const current = playbackSecondsRef.current || 0;
    const newTime = Math.max(0, Math.min(estDuration - 5, current + deltaSeconds));
    playbackSecondsRef.current = newTime;
    handlePlayerProgress(newTime, estDuration);

    const baseRaw = activeServer?.url || playerUrl;
    const updatedUrl = attachTimestampToUrl(baseRaw, newTime);
    setPlayerUrl(updatedUrl);
    setResumeTime(newTime);
    soundFx.playTap();
    const sign = deltaSeconds > 0 ? "+" : "";
    const minStr = Math.round(Math.abs(deltaSeconds) / 60);
    setToastMessage(`Skipped ${sign}${Math.abs(deltaSeconds) >= 60 ? `${minStr}m` : `${deltaSeconds}s`} (Now at ${formatPlayerTime(newTime)})`);
  }, [getEstimatedDuration, handlePlayerProgress, activeServer, playerUrl]);

  // 1. Reset & load saved timestamp on route / episode change
  useEffect(() => {
    if (!id) return;
    const isTv = type === 'tv';
    const queryTime = searchParams.get('time') || searchParams.get('t');
    const parsedQuery = queryTime ? parseInt(queryTime, 10) : 0;
    const initialSeconds = parsedQuery > 3
      ? parsedQuery
      : getSavedTimestamp(
          id,
          isTv ? currentSeason : undefined,
          isTv ? currentEpisode : undefined,
          type as 'movie' | 'tv',
          activeProfile?.id
        );
    playbackSecondsRef.current = initialSeconds;
    watchDurationSecondsRef.current = 0;
    hasRealPlayerEventsRef.current = false;
    setResumeTime(initialSeconds);
  }, [id, currentSeason, currentEpisode, type, searchParams, activeProfile?.id]);

  // 2. When TMDB meta loads, ensure metadata in localStorage is updated with high-quality backdrop & title
  useEffect(() => {
    if (!id || !meta) return;
    try {
      const storageKey = getStorageKey(activeProfile?.id);
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const map = JSON.parse(raw);
        const specificKey = type === 'tv' ? `${id}_s${currentSeason}e${currentEpisode}` : id;
        const target = map[specificKey] || map[id];
        if (target) {
          target.title = meta.title || meta.name || target.title;
          target.poster_path = meta.poster_path || target.poster_path;
          target.backdrop_path = meta.backdrop_path || target.backdrop_path;
          localStorage.setItem(storageKey, JSON.stringify(map));
        }
      }
    } catch {
      // Ignore
    }
  }, [id, meta, type, currentSeason, currentEpisode, activeProfile?.id]);

  // 3. PostMessage listener for embed players (VidLink MEDIA_DATA, Vidking PLAYER_EVENT, VidBolt, etc.)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        let data = event.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            return;
          }
        }
        if (!data || typeof data !== 'object') return;

        let curTime: number | undefined;
        let dur: number | undefined;

        // A. VidLink MEDIA_DATA event (emits real-time watched seconds every 2s even when user seeks/skips)
        if (data.type === 'MEDIA_DATA' && data.data) {
          hasRealPlayerEventsRef.current = true;
          let watchedSec: number | undefined;
          let durSec: number | undefined;

          // VidLink data is an object dictionary keyed by tmdbId, e.g. { "1377237": { progress: ... } }
          const rawDict = data.data;
          let mediaEntry = rawDict[id] || rawDict[String(id)];
          if (!mediaEntry && typeof rawDict === 'object') {
            const keys = Object.keys(rawDict);
            for (const k of keys) {
              if (k === id || String(k) === String(id) || (rawDict[k] && String(rawDict[k].id) === String(id))) {
                mediaEntry = rawDict[k];
                break;
              }
            }
            if (!mediaEntry && keys.length === 1 && typeof rawDict[keys[0]] === 'object') {
              mediaEntry = rawDict[keys[0]];
            }
          }

          if (mediaEntry) {
            if (type === 'tv' && mediaEntry.show_progress) {
              const epKey = `s${currentSeason}e${currentEpisode}`;
              const epProg = mediaEntry.show_progress[epKey]?.progress || mediaEntry.progress;
              if (epProg) {
                watchedSec = epProg.currentTime ?? epProg.timestamp ?? epProg.watched;
                durSec = epProg.duration;
              }
            } else if (mediaEntry.progress) {
              watchedSec = mediaEntry.progress.currentTime ?? mediaEntry.progress.timestamp ?? mediaEntry.progress.watched;
              durSec = mediaEntry.progress.duration;
            }
          }

          // Direct fallback if data.data is already the progress object
          if (watchedSec === undefined) {
            const p = data.data.progress;
            watchedSec = p?.currentTime ?? p?.timestamp ?? data.data.currentTime ?? data.data.timestamp ?? p?.watched ?? data.data.watched;
            durSec = p?.duration ?? data.data.duration;
          }

          if (watchedSec !== undefined && !isNaN(Number(watchedSec))) {
            curTime = Number(watchedSec);
            dur = Number(durSec);
          }
        } else if (data.type === 'PLAYER_EVENT' && data.data) {
          // B. VidLink / Vidking real-time PLAYER_EVENT (emits on "seeked", "play", "pause")
          hasRealPlayerEventsRef.current = true;
          const pData = data.data;
          const p = pData.progress;
          const watchedSec = pData.currentTime ?? pData.timestamp ?? p?.currentTime ?? p?.timestamp ?? pData.watched ?? p?.watched;
          const durSec = pData.duration ?? p?.duration;

          if (watchedSec !== undefined && !isNaN(Number(watchedSec))) {
            curTime = Number(watchedSec);
            dur = Number(durSec);
          }
          if (pData.event === 'ended' || data.event === 'ended') {
            if (type === 'tv' && !isAutoPlayDismissedRef.current && !showNextOverlayRef.current) {
              triggerNextEpisodeOverlay();
            }
          }
        } else if (
          data.type === 'SCREENSCAPE_WATCH_HISTORY_WITH_PROGRESS_RESPONSE' ||
          data.type === 'SCREENSCAPE_GET_PROGRESS_RESPONSE' ||
          data.type === 'SCREENSCAPE_PROGRESS_RESPONSE'
        ) {
          // C. ScreenScape Watch History & Progress Bridge
          hasRealPlayerEventsRef.current = true;
          const hist = data.watchHistory || data.progress || data.data;
          let watchedSec: number | undefined;
          let durSec: number | undefined;
          if (Array.isArray(hist) && hist.length > 0) {
            const entry = hist.find((h: any) => String(h.tmdb) === String(id) || String(h.id) === String(id)) || hist[0];
            watchedSec = entry?.currentTime ?? entry?.progress ?? entry?.time ?? entry?.watched;
            durSec = entry?.duration;
          } else if (typeof hist === 'object' && hist !== null) {
            watchedSec = hist.currentTime ?? hist.progress ?? hist.time ?? hist.watched;
            durSec = hist.duration;
          } else if (typeof data.progress === 'number') {
            watchedSec = data.progress;
            durSec = data.duration;
          }
          if (watchedSec !== undefined && !isNaN(Number(watchedSec))) {
            curTime = Number(watchedSec);
            dur = durSec ? Number(durSec) : undefined;
          }
        } else if (data.event === 'timeupdate' || data.type === 'timeupdate') {
          curTime = Number(data.currentTime ?? data.data?.currentTime);
          dur = Number(data.duration ?? data.data?.duration);
        } else if (typeof data.currentTime === 'number') {
          curTime = data.currentTime;
          dur = typeof data.duration === 'number' ? data.duration : undefined;
        }

        // C. Universal time/progress extraction fallback
        if (curTime === undefined) {
          const rawCurrent =
            data.currentTime ??
            data.current_time ??
            data.data?.currentTime ??
            data.data?.current_time ??
            data.position ??
            data.time ??
            data.seconds ??
            data.data?.position ??
            data.data?.time ??
            data.data?.seconds ??
            data.watched ??
            data.data?.watched;
          const rawDuration =
            data.duration ??
            data.duration_seconds ??
            data.data?.duration ??
            data.data?.duration_seconds;

          if (rawCurrent !== undefined && !isNaN(Number(rawCurrent))) {
            curTime = Number(rawCurrent);
            if (rawDuration !== undefined && !isNaN(Number(rawDuration))) {
              dur = Number(rawDuration);
            }
          }
        }

        if (curTime !== undefined && !isNaN(curTime) && curTime >= 1) {
          lastRealPlayerEventTimeRef.current = Date.now();
          hasRealPlayerEventsRef.current = true;
          playbackSecondsRef.current = curTime;
          setResumeTime(curTime);
          const validDur = (dur && !isNaN(dur) && dur > 0) ? dur : getEstimatedDuration();
          handlePlayerProgress(curTime, validDur);
        }

        // Check for ended / completion events from iframe player
        if (
          data.event === 'ended' ||
          data.type === 'ended' ||
          data.data?.event === 'ended' ||
          (data.event === 'pause' && curTime && dur && curTime >= dur - 15)
        ) {
          if (type === 'tv' && !isAutoPlayDismissedRef.current && !showNextOverlayRef.current) {
            triggerNextEpisodeOverlay();
          }
        }
      } catch {
        // Ignore cross-origin non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handlePlayerProgress, meta, type, currentSeason, currentEpisode, triggerNextEpisodeOverlay, resumeTime, getEstimatedDuration]);

  // 4. Fallback Watcher Heartbeat: for iframe servers that do NOT emit continuous postMessage (e.g. VidSrc, VidSrc VIP, VidBolt)
  useEffect(() => {
    if (!id || !meta) return;
    const estDuration = getEstimatedDuration();
    let lastTickTime = Date.now();

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = (now - lastTickTime) / 1000;
      lastTickTime = now;

      // Only pause if the user actually switched to another tab or minimized the browser window
      if (document.hidden) return;

      // If we received REAL continuous player postMessage events (e.g. VidLink) in the last 8 seconds, let real events drive progress
      if (Date.now() - lastRealPlayerEventTimeRef.current < 8000) return;

      if (!isIframeLoaded) return;
      if (estDuration > 0 && playbackSecondsRef.current >= estDuration - 10) return;

      // Add actual elapsed seconds (capped at 10s to prevent large leaps if computer was asleep)
      const deltaSec = Math.min(Math.max(elapsedSeconds, 1), 10);
      watchDurationSecondsRef.current += deltaSec;
      playbackSecondsRef.current += deltaSec;

      // Save progress whenever user has watched for >= 3 seconds
      if (playbackSecondsRef.current >= 3) {
        handlePlayerProgress(playbackSecondsRef.current, estDuration);
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [id, meta, isIframeLoaded, handlePlayerProgress, getEstimatedDuration]);

  // Initial save to establish Continue Watching entry once metadata is loaded
  useEffect(() => {
    if (!id || !meta) return;
    const estDuration = getEstimatedDuration();
    const saved = getSavedTimestamp(
      id,
      type === 'tv' ? currentSeason : undefined,
      type === 'tv' ? currentEpisode : undefined,
      type as 'movie' | 'tv',
      activeProfile?.id
    );
    if (saved > 3) {
      const initialTimer = setTimeout(() => {
        handlePlayerProgress(saved, estDuration);
      }, 2000);
      return () => clearTimeout(initialTimer);
    }
  }, [id, meta, type, currentSeason, currentEpisode, handlePlayerProgress, getEstimatedDuration, activeProfile?.id]);

  // 5. Save progress on unmount / navigation / beforeunload
  useEffect(() => {
    const saveOnExit = () => {
      const curTime = playbackSecondsRef.current;
      if (curTime >= 3 && meta && id) {
        const estDuration = getEstimatedDuration();
        const progressPercent = estDuration > 0 ? (curTime / estDuration) * 100 : 0;
        const isFinishing = progressPercent >= 90.0 || (estDuration > 60 && curTime >= estDuration - 25);
        const cleanMediaId = getCleanMediaId(id);

        // 1. Synchronously save to scoped LocalStorage
        saveWatchProgress({
          id: cleanMediaId,
          media_type: type as 'movie' | 'tv',
          title: meta.title || meta.name || 'Untitled',
          poster_path: meta.poster_path || null,
          backdrop_path: meta.backdrop_path || null,
          season: type === 'tv' ? currentSeason : undefined,
          episode: type === 'tv' ? currentEpisode : undefined,
          timestamp_seconds: curTime,
          duration_seconds: estDuration,
          progress_percent: progressPercent,
          next_season: nextEpisodeInfo?.season,
          next_episode: nextEpisodeInfo?.episode,
        }, activeProfile?.id);

        // 2. Beacon to backend if activeProfile exists
        if (activeProfile?.id) {
          const payload = {
            mediaType: type,
            id: cleanMediaId,
            currentTime: curTime,
            duration: estDuration,
            progress: progressPercent,
            season: type === 'tv' ? currentSeason : undefined,
            episode: type === 'tv' ? currentEpisode : undefined,
            event: isFinishing ? 'ended' : 'progress',
            title: meta.title || meta.name || 'Untitled',
            posterPath: meta.poster_path,
            backdropPath: meta.backdrop_path,
          };
          const token = getStoredToken();
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Profile-ID': activeProfile.id,
          };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          try {
            fetch('/api/v1/progress/update', {
              method: 'POST',
              headers,
              body: JSON.stringify(payload),
              keepalive: true,
            }).catch(() => {});
          } catch {}
        }
      }
    };

    window.addEventListener('beforeunload', saveOnExit);
    window.addEventListener('pagehide', saveOnExit);
    return () => {
      window.removeEventListener('beforeunload', saveOnExit);
      window.removeEventListener('pagehide', saveOnExit);
      saveOnExit();
    };
  }, [id, meta, type, currentSeason, currentEpisode, activeProfile, nextEpisodeInfo, getEstimatedDuration]);

  const handleHlsError = useCallback(() => {
    if (activeServer) {
      console.warn(`Player error on server ${activeServer.id}. Falling back.`);
      setFailedServerIds(prev => [...prev, activeServer.id]);
      const nextServer = servers.find(s => s.id !== activeServer.id && !failedServerIds.includes(s.id));
      if (nextServer) {
        setActiveServerId(nextServer.id);
        setToastMessage(`Server ${activeServer.name} failed. Switched to ${nextServer.name}.`);
      } else {
        setToastMessage("All servers unavailable for this title.");
      }
    }
  }, [activeServer, servers, failedServerIds]);

  // Cycle Stream Servers (Server 1 -> Server 2 -> Server 3)
  const cycleNextServer = useCallback(() => {
    if (!servers || servers.length === 0) return;
    const currentIdx = servers.findIndex(s => s.id === activeServerId);
    const nextIdx = (currentIdx + 1) % servers.length;
    const nextServer = servers[nextIdx];
    if (nextServer && !failedServerIds.includes(nextServer.id)) {
      setActiveServerId(nextServer.id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('nightcast_preferred_server_v7', nextServer.id);
      }
      soundFx.playTap();
      setToastMessage(`Switched stream engine to ${nextServer.name}`);
    }
  }, [servers, activeServerId, failedServerIds]);

  // Next Episode shortcut handler
  const handleNextEpisodeShortcut = useCallback(() => {
    if (type === 'tv' && nextEpisodeInfo) {
      soundFx.playTap();
      handleEpisodeChange(nextEpisodeInfo.season, nextEpisodeInfo.episode);
    }
  }, [type, nextEpisodeInfo, handleEpisodeChange]);

  const toggleNativeFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, []);

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if (e.key === 'Escape') {
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
          return;
        }
        if (isEpisodeDrawerOpen) {
          setIsEpisodeDrawerOpen(false);
          return;
        }
        if (isTheaterMode) {
          setIsTheaterMode(false);
          soundFx.playChime();
          return;
        }
      }

      if (e.shiftKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeekDelta(300);
      } else if (e.shiftKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeekDelta(-300);
      } else if ((e.altKey || e.ctrlKey) && e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeekDelta(600);
      } else if ((e.altKey || e.ctrlKey) && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeekDelta(-600);
      } else if (e.key === ']') {
        e.preventDefault();
        handleSeekDelta(60);
      } else if (e.key === '[') {
        e.preventDefault();
        handleSeekDelta(-60);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setIsTheaterMode(prev => {
          soundFx.playChime();
          return !prev;
        });
      } else if (e.key === 'e' || e.key === 'E') {
        if (type === 'tv') {
          e.preventDefault();
          soundFx.playTap();
          setIsEpisodeDrawerOpen(prev => !prev);
        }
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        cycleNextServer();
      } else if (e.key === 'n' || e.key === 'N') {
        if (type === 'tv' && nextEpisodeInfo) {
          e.preventDefault();
          handleNextEpisodeShortcut();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        soundFx.playTap();
        toggleNativeFullscreen();
      } else if (e.key === '?') {
        e.preventDefault();
        soundFx.playTap();
        setIsShortcutsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isTheaterMode,
    isEpisodeDrawerOpen,
    isShortcutsOpen,
    type,
    nextEpisodeInfo,
    cycleNextServer,
    handleNextEpisodeShortcut,
    toggleNativeFullscreen,
    handleSeekDelta
  ]);

  // Lock body scroll when theater mode is active
  useEffect(() => {
    if (isTheaterMode) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isTheaterMode]);

  const renderPlayerScreen = (isTheater: boolean) => (
    <div
      className={`relative w-full ${
        isTheater
          ? 'max-w-7xl max-h-[85vh] aspect-video rounded-2xl'
          : 'aspect-video rounded-2xl sm:rounded-3xl'
      } overflow-hidden border border-white/[0.1] bg-[#0B131B] shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_50px_rgba(57,174,169,0.2)]`}
    >

      {!isIframeLoaded && activeServer?.type !== 'hls' && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          <PlayerSkeleton />
        </div>
      )}

      {mounted && playerUrl ? (
        activeServer?.type === 'hls' ? (
          <NightCastPlayer
            streamUrl={playerUrl}
            isHls={true}
            startAt={resumeTime}
            onProgress={handlePlayerProgress}
            onEnded={triggerNextEpisodeOverlay}
            poster={meta?.backdrop_path ? `https://image.tmdb.org/t/p/original${meta.backdrop_path}` : undefined}
            onError={handleHlsError}
          />
        ) : (
          <iframe
            id={activeServerId === 'screenscape' ? 'screenscape-player' : undefined}
            key={`${activeServerId}-${id}-${type === 'tv' ? `s${currentSeason}e${currentEpisode}` : 'movie'}-${playerUrl}`}
            src={playerUrl}
            onLoad={() => setIsIframeLoaded(true)}
            className="absolute top-0 left-0 w-full h-full border-0 rounded-2xl sm:rounded-3xl"
            allowFullScreen
            scrolling="no"
            title="NightCast Media Player"
            referrerPolicy="origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            sandbox={
              isAdShieldActive
                ? "allow-scripts allow-same-origin allow-forms allow-presentation"
                : undefined
            }
          />
        )
      ) : (
        <PlayerSkeleton />
      )}


      {/* Up Next in 10s Countdown Overlay */}
      {type === 'tv' && nextEpisodeInfo && showNextOverlay && (
        <div className="absolute bottom-12 right-3 sm:bottom-16 sm:right-6 z-40 max-w-sm w-[calc(100%-1.5rem)] sm:w-88 bg-[#0B131B]/80 backdrop-blur-3xl backdrop-saturate-150 border border-[#39AEA9]/50 rounded-2xl p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_20px_50px_rgba(0,0,0,0.95),0_0_35px_rgba(57,174,169,0.25)] animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#39AEA9] animate-ping" />
              <span className="text-[11px] font-sans font-bold tracking-wider uppercase text-[#39AEA9]">
                Up Next in {nextCountdown}s
              </span>
            </div>
            <button
              onClick={() => {
                setShowNextOverlay(false);
                showNextOverlayRef.current = false;
                setIsAutoPlayDismissed(true);
                isAutoPlayDismissedRef.current = true;
              }}
              className="w-6 h-6 rounded-full bg-white/[0.08] hover:bg-white/[0.2] flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Cancel auto-play"
              aria-label="Cancel auto-play"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="py-2.5">
            <div className="flex items-center gap-2 text-xs text-[#8FA8AD] font-sans font-medium mb-1">
              <span className="px-1.5 py-0.5 rounded bg-[#39AEA9]/20 text-[#39AEA9] text-[10px] font-semibold border border-[#39AEA9]/30">
                S{nextEpisodeInfo.season} E{nextEpisodeInfo.episode}
              </span>
              <span>{nextEpisodeInfo.isNewSeason ? 'Next Season' : 'Next Chapter'}</span>
            </div>
            <h4 className="text-sm font-display font-bold text-white truncate">
              {nextEpisodeInfo.title}
            </h4>
          </div>

          {/* Linear Countdown Bar */}
          <div className="w-full h-1.5 bg-white/[0.1] rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-[#A4C8E1] to-[#39AEA9] transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(57,174,169,0.8)]"
              style={{ width: `${Math.max(0, Math.min(100, (nextCountdown / 10) * 100))}%` }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEpisodeChange(nextEpisodeInfo.season, nextEpisodeInfo.episode)}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#A4C8E1] to-[#39AEA9] hover:opacity-95 text-[#0B131B] font-sans font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Now</span>
            </button>
            <button
              onClick={() => {
                setShowNextOverlay(false);
                showNextOverlayRef.current = false;
                setIsAutoPlayDismissed(true);
                isAutoPlayDismissedRef.current = true;
              }}
              className="py-2 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#8FA8AD] hover:text-white font-sans font-medium text-xs border border-white/[0.08] transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen max-w-7xl mx-auto pt-20 pb-28 px-4 sm:px-6 md:px-12 relative bg-[#0B131B] text-[#F0F0F0]">
      <AmbientGlow />

      {/* 1. Fullscreen Theater Mode Overlay via React Portal directly into body */}
      {mounted && isTheaterMode && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] w-screen h-screen bg-[#0B131B]/98 backdrop-blur-3xl flex flex-col justify-between items-center p-3 sm:p-5 animate-in fade-in duration-200">
          {/* Top HUD Bar */}
          <div className="w-full max-w-7xl flex items-center justify-between pb-2 px-2 sm:px-4 text-white z-20">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#39AEA9] animate-pulse shrink-0" />
              <h2 className="text-sm sm:text-base font-bold font-display text-white truncate max-w-xs sm:max-w-md md:max-w-lg">
                {movieTitle}
                {type === 'tv' && (
                  <span className="text-[#39AEA9] font-sans text-xs ml-2 font-semibold px-2 py-0.5 rounded bg-white/[0.08] border border-white/[0.1]">
                    S{currentSeason} E{currentEpisode}
                  </span>
                )}
              </h2>
              <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold bg-white/[0.08] text-[#8FA8AD] border border-white/[0.1]">
                {rawActiveServer?.name || "Server 1"}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {type === 'tv' && (
                <button
                  onClick={() => {
                    soundFx.playTap();
                    setIsEpisodeDrawerOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#39AEA9] text-xs font-sans font-medium border border-white/[0.1] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                  title="Episodes [E]"
                  aria-label="Episodes [E]"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Episodes [E]</span>
                </button>
              )}
              <button
                onClick={() => {
                  soundFx.playTap();
                  setIsAdShieldActive(prev => {
                    const next = !prev;
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('nightcast_ad_shield_v2', String(next));
                    }
                    setToastMessage(next ? "Ad-Shield ON: Sandbox enabled (Turn OFF if stream shows 'Playback Disabled')" : "Ad-Shield OFF: Full playback permissions restored");
                    return next;
                  });
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-sans font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] ${
                  isAdShieldActive
                    ? 'bg-[#39AEA9]/20 hover:bg-[#39AEA9]/30 text-[#39AEA9] border-[#39AEA9]/40'
                    : 'bg-white/[0.08] hover:bg-white/[0.15] text-[#8FA8AD] hover:text-white border-white/[0.1]'
                }`}
                title={isAdShieldActive ? "Ad-Shield is active (Turn off if stream blocks sandbox)" : "Ad-Shield is turned off"}
                aria-label={isAdShieldActive ? "Ad-Shield is active" : "Ad-Shield is inactive"}
              >
                {isAdShieldActive ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-[#39AEA9]" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-[#8FA8AD]" />
                )}
                <span className="hidden sm:inline">
                  {isAdShieldActive ? "Ad-Shield ON" : "Ad-Shield OFF"}
                </span>
              </button>
              <button
                onClick={cycleNextServer}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#8FA8AD] hover:text-white text-xs font-sans font-medium border border-white/[0.1] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                title="Cycle Server [S]"
                aria-label="Cycle Server [S]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Server [S]</span>
              </button>
              <button
                onClick={toggleNativeFullscreen}
                className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#8FA8AD] hover:text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                title="Toggle Fullscreen [F]"
                aria-label="Toggle Fullscreen [F]"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  soundFx.playTap();
                  setIsShortcutsOpen(true);
                }}
                className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#8FA8AD] hover:text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                title="Shortcuts [?]"
                aria-label="Keyboard Shortcuts [?]"
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  soundFx.playChime();
                  setIsTheaterMode(false);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#A4C8E1] to-[#39AEA9] text-[#0B131B] font-bold text-xs shadow-lg hover:opacity-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                title="Exit Theater Mode [Esc or T]"
                aria-label="Exit Theater Mode [Esc or T]"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Theater [Esc]</span>
              </button>
            </div>
          </div>

          {/* Main Cinema Screen Box */}
          <div className="w-full max-w-7xl max-h-[86vh] flex-1 flex items-center justify-center relative my-auto">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Ambilight Aurora Halo Behind Player */}
              <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-r from-[#39AEA9]/25 via-[#5B8FB9]/20 to-[#39AEA9]/25 rounded-[40px] blur-3xl -z-10 opacity-70 pointer-events-none" />
              {renderPlayerScreen(true)}
            </div>
          </div>

          <div className="text-[11px] text-[#8FA8AD] font-sans pb-1 text-center">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.1] text-[#39AEA9] font-mono">T</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-white/[0.1] text-[#39AEA9] font-mono">Esc</kbd> to exit • <kbd className="px-1.5 py-0.5 rounded bg-white/[0.1] text-[#39AEA9] font-mono">F</kbd> for fullscreen • <kbd className="px-1.5 py-0.5 rounded bg-white/[0.1] text-[#39AEA9] font-mono">N</kbd> next episode
          </div>
        </div>,
        document.body
      )}

      {/* 2. Normal View Player Container */}
      <div className="space-y-6">
        {/* Back to Browse Navigation Button */}
        <div className="flex items-center justify-between pb-1">
          <button
            onClick={() => {
              soundFx.playTap();
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/');
              }
            }}
            aria-label="Back to browse"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-xs font-semibold text-[#F0F0F0] transition-all duration-200 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#39AEA9] group-hover:-translate-x-0.5 transition-transform duration-200" />
            <span>Back</span>
          </button>
        </div>

        <div className="relative w-full">
          {/* Ambilight Aurora Halo Behind Player */}
          <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-r from-[#39AEA9]/20 via-[#5B8FB9]/15 to-[#39AEA9]/20 rounded-[40px] blur-3xl -z-10 opacity-70 pointer-events-none transition-opacity duration-1000 animate-pulse" />

          {/* Screen Box */}
          {isTheaterMode ? (
            <div className="relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.08] bg-[#0B131B] flex flex-col items-center justify-center gap-3 text-[#8FA8AD]">
              <p className="text-sm font-sans font-medium text-white">Playing in Cinema Theater Mode</p>
              <button
                onClick={() => setIsTheaterMode(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#39AEA9] text-xs font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
              >
                Return to Normal View
              </button>
            </div>
          ) : (
            renderPlayerScreen(false)
          )}
        </div>


        {/* Source Error / Fallback Notification Toast */}
        {toastMessage && (
          <div className="p-3.5 px-5 bg-[#39AEA9]/15 border border-[#39AEA9]/40 rounded-2xl flex items-center justify-between text-xs font-sans text-[#F8FAFC] shadow-xl animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#39AEA9] shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-[#39AEA9] hover:text-white text-xs font-sans font-semibold px-2.5 py-1 rounded-full hover:bg-[#39AEA9]/20 transition-all cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Ad-Shield Sandbox Warning Banner when Active */}
        {mounted && isAdShieldActive && (
          <div className="p-3.5 px-5 bg-amber-500/10 border border-amber-500/35 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans text-amber-200 shadow-xl animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Ad-Shield Sandbox Active:</strong> Some stream servers (VidSrc/VidBolt) block playback when sandbox is enabled. If player says &quot;Playback Disabled&quot; or &quot;Please Disable Sandbox&quot;, click here:
              </span>
            </div>
            <button
              onClick={() => {
                soundFx.playTap();
                setIsAdShieldActive(false);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('nightcast_ad_shield_v2', 'false');
                }
                setToastMessage("Ad-Shield disabled. Full playback permissions restored.");
              }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0B131B] font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
            >
              Disable Sandbox &amp; Play
            </button>
          </div>
        )}

        {/* Server Selector Bar */}
        <div className="p-5 bg-white/[0.04] backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.12] rounded-2xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_16px_40px_rgba(0,0,0,0.6)]">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs font-sans font-medium text-[#8FA8AD] mb-1">
              <span className="w-2 h-2 bg-gradient-to-r from-[#A4C8E1] to-[#39AEA9] animate-pulse rounded-full" />
              <span>Stream Engine</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight font-display text-[#F8FAFC]">
              {movieTitle} <span className="text-[#8FA8AD] font-sans font-normal text-base">({releaseYear})</span>
            </h1>
          </div>

          {/* Server Selection & Action Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Server List */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#0B131B]/60 backdrop-blur-xl border border-white/[0.1] rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
              {servers.map((srv) => {
                const isActive = srv.id === activeServerId;
                const isFailed = failedServerIds.includes(srv.id);
                const isHindi = srv.language === 'hi' || srv.id === 'screenscape';
                return (
                  <button
                    key={srv.id}
                    onClick={() => {
                      if (!isFailed) {
                        soundFx.playTap();
                        setActiveServerId(srv.id);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('nightcast_preferred_server_v7', srv.id);
                        }
                      }
                    }}
                    disabled={isFailed}
                    className={
                      isFailed
                        ? "px-3.5 py-1.5 rounded-lg text-xs font-sans text-[#8FA8AD]/30 line-through cursor-not-allowed"
                        : isActive
                        ? "px-3.5 py-1.5 rounded-lg text-xs font-sans font-semibold bg-gradient-to-r from-[#A4C8E1] to-[#39AEA9] text-[#0B131B] shadow-[0_0_12px_rgba(57,174,169,0.5)] transition-all cursor-pointer flex items-center gap-1.5"
                        : isHindi
                        ? "px-3.5 py-1.5 rounded-lg text-xs font-sans font-semibold text-[#FFB347] bg-[#FFB347]/10 hover:bg-[#FFB347]/20 border border-[#FFB347]/30 transition-all cursor-pointer flex items-center gap-1.5"
                        : "px-3.5 py-1.5 rounded-lg text-xs font-sans font-medium text-[#8FA8AD] hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                    }
                  >
                    {isHindi && !isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#FFB347] animate-pulse" />}
                    {srv.name}
                  </button>
                );
              })}
            </div>

            {/* Quick Action Pill Controls (Ad-Shield, Theater Mode, Episode Drawer, Shortcuts, Downloads) */}
            <div className="flex items-center gap-2">
              {/* Direct Download Mirrors */}
              <a
                href={`https://nxsha.screenscape.me/download/${type === 'tv' ? 'tv' : 'movie'}/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => soundFx.playTap()}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.08] hover:bg-white/[0.14] text-[#8FA8AD] hover:text-[#39AEA9] text-xs font-sans font-medium transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                title="Direct Download Links Across Mirrors (ScreenScape)"
                aria-label="Direct Download Links"
              >
                <Download className="w-3.5 h-3.5 text-[#39AEA9]" />
                <span className="hidden sm:inline font-semibold">Downloads</span>
              </a>
              {/* Ad-Shield Toggle Button */}
              <button
                onClick={() => {
                  soundFx.playTap();
                  setIsAdShieldActive(prev => {
                    const next = !prev;
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('nightcast_ad_shield_v2', String(next));
                    }
                    setToastMessage(next ? "Ad-Shield ON: Sandbox enabled (Turn OFF if stream shows 'Playback Disabled')" : "Ad-Shield OFF: Full stream permissions restored");
                    return next;
                  });
                }}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-sans font-medium transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] ${
                  isAdShieldActive
                    ? 'bg-[#39AEA9]/15 hover:bg-[#39AEA9]/25 text-[#39AEA9] border-[#39AEA9]/40 shadow-[0_0_12px_rgba(57,174,169,0.25)]'
                    : 'bg-white/[0.08] hover:bg-white/[0.14] text-[#8FA8AD] hover:text-white border-white/[0.1]'
                }`}
                title={isAdShieldActive ? "Ad-Shield is active (Turn off if stream blocks sandbox)" : "Ad-Shield is turned off (Allow all permissions)"}
                aria-label={isAdShieldActive ? "Ad-Shield is active" : "Ad-Shield is inactive"}
              >
                {isAdShieldActive ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-[#39AEA9]" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-[#8FA8AD]" />
                )}
                <span className="hidden sm:inline font-semibold">
                  {isAdShieldActive ? "Ad Shield: ON" : "Ad Shield: OFF"}
                </span>
              </button>

              {/* Theater Mode Button */}
              <button
                onClick={() => {
                  soundFx.playChime();
                  setIsTheaterMode(prev => !prev);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-sans font-medium transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] ${
                  isTheaterMode
                    ? 'bg-[#39AEA9] text-[#0B131B] border-[#39AEA9] font-bold shadow-[0_0_15px_rgba(57,174,169,0.5)]'
                    : 'bg-white/[0.08] hover:bg-white/[0.14] text-[#E2E8F0] hover:text-white border-white/[0.1]'
                }`}
                title="Cinema Theater Mode [T]"
                aria-label="Cinema Theater Mode [T]"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#39AEA9]" />
                <span className="hidden sm:inline">Theater [T]</span>
              </button>

              {/* Episode Drawer Button for TV */}
              {type === 'tv' && (
                <button
                  onClick={() => {
                    soundFx.playTap();
                    setIsEpisodeDrawerOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-[#E2E8F0] hover:text-white font-sans font-medium text-xs border border-white/[0.1] transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                  title="Quick Episode Drawer [E]"
                  aria-label="Quick Episode Drawer [E]"
                >
                  <List className="w-3.5 h-3.5 text-[#39AEA9]" />
                  <span className="hidden sm:inline">Episodes [E]</span>
                </button>
              )}

              {/* Keyboard Shortcuts Button */}
              <button
                onClick={() => {
                  soundFx.playTap();
                  setIsShortcutsOpen(true);
                }}
                className="p-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-[#8FA8AD] hover:text-white font-sans text-xs border border-white/[0.1] transition-all active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                title="Keyboard Shortcuts [?]"
                aria-label="Keyboard Shortcuts [?]"
              >
                <Keyboard className="w-3.5 h-3.5 text-[#39AEA9]" />
              </button>
            </div>


          </div>
        </div>

        {/* Slide-over Episode Drawer for Quick TV Navigation */}
        {mounted && isEpisodeDrawerOpen && type === 'tv' && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[100001] flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="fixed inset-0 cursor-pointer"
              onClick={() => setIsEpisodeDrawerOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Episode Drawer"
              className="relative w-full max-w-md h-full bg-[#0B131B]/95 backdrop-blur-2xl border-l border-white/[0.1] p-3.5 sm:p-6 flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.9)] z-10 animate-in slide-from-right duration-300"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div>
                  <div className="flex items-center gap-2 text-xs text-[#8FA8AD] font-sans">
                    <Tv className="w-3.5 h-3.5 text-[#39AEA9]" />
                    <span>Episode Drawer</span>
                  </div>
                  <h3 className="font-display font-bold text-lg text-white truncate max-w-[260px]">
                    {movieTitle}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    soundFx.playTap();
                    setIsEpisodeDrawerOpen(false);
                  }}
                  className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                  title="Close [Esc]"
                  aria-label="Close episode drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Season Select pills in Drawer */}
              <div className="flex gap-1.5 py-3 overflow-x-auto no-scrollbar border-b border-white/[0.08]">
                {seasons.map((s: any) => (
                  <button
                    key={s.season_number}
                    onClick={() => {
                      soundFx.playTap();
                      handleEpisodeChange(s.season_number, 1);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-sans shrink-0 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9] ${
                      currentSeason === s.season_number
                        ? 'bg-gradient-to-r from-[#A4C8E1] to-[#39AEA9] text-[#0B131B] font-bold shadow-[0_0_10px_rgba(57,174,169,0.4)]'
                        : 'bg-white/[0.06] text-[#8FA8AD] hover:text-white'
                    }`}
                  >
                    {s.name || `Season ${s.season_number}`}
                  </button>
                ))}
              </div>

              {/* Episodes List in Drawer */}
              <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-2.5">
                {episodesLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
                  ))
                ) : seasonEpisodes.length > 0 ? (
                  seasonEpisodes.map((ep: any) => {
                    const isActive = ep.episode_number === currentEpisode;
                    return (
                      <EpisodeCard
                        key={ep.episode_number}
                        episode={ep}
                        seasonNumber={currentSeason}
                        isActive={isActive}
                        fallbackBackdrop={meta?.backdrop_path || meta?.poster_path}
                        defaultRuntime={meta?.episode_run_time?.[0]}
                        compact={true}
                        onClick={() => {
                          soundFx.playTap();
                          handleEpisodeChange(currentSeason, ep.episode_number);
                          setIsEpisodeDrawerOpen(false);
                        }}
                      />
                    );
                  })
                ) : (
                  Array.from({ length: episodesCount }).map((_, i) => {
                    const epNum = i + 1;
                    const isActive = epNum === currentEpisode;
                    return (
                      <EpisodeCard
                        key={epNum}
                        episode={{
                          episode_number: epNum,
                          name: `Episode ${epNum}`,
                          overview: meta?.overview ? `${meta.overview.slice(0, 100)}...` : `Episode ${epNum} of Season ${currentSeason}.`,
                          runtime: meta?.episode_run_time?.[0] || null,
                          still_path: meta?.backdrop_path || null
                        }}
                        seasonNumber={currentSeason}
                        isActive={isActive}
                        fallbackBackdrop={meta?.backdrop_path || meta?.poster_path}
                        defaultRuntime={meta?.episode_run_time?.[0]}
                        compact={true}
                        onClick={() => {
                          soundFx.playTap();
                          handleEpisodeChange(currentSeason, epNum);
                          setIsEpisodeDrawerOpen(false);
                        }}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Keyboard Shortcuts HUD modal */}
        {mounted && isShortcutsOpen && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[100002] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div
              className="fixed inset-0 cursor-pointer"
              onClick={() => setIsShortcutsOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Cinema Pro Keyboard Shortcuts"
              className="relative bg-[#0B131B]/95 backdrop-blur-2xl border border-white/[0.15] rounded-3xl p-6 max-w-md w-full shadow-[0_0_60px_rgba(57,174,169,0.25)] space-y-5 z-10 animate-in zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#39AEA9]/20 text-[#39AEA9]">
                    <Keyboard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-white">Cinema Pro Shortcuts</h3>
                    <p className="text-xs text-[#8FA8AD] font-sans">Control your playback without a mouse</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    soundFx.playTap();
                    setIsShortcutsOpen(false);
                  }}
                  className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                  title="Close"
                  aria-label="Close shortcuts dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs font-sans">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                  <span className="text-[#E2E8F0] font-medium">Cinema Theater Mode</span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-[#0B131B] text-[#39AEA9] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                    T
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                  <span className="text-[#E2E8F0] font-medium">Toggle Native Fullscreen</span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-[#0B131B] text-[#39AEA9] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                    F
                  </kbd>
                </div>
                {type === 'tv' && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                    <span className="text-[#E2E8F0] font-medium">Toggle Episode Drawer</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-[#0B131B] text-[#39AEA9] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                      E
                    </kbd>
                  </div>
                )}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                  <span className="text-[#E2E8F0] font-medium">Cycle Stream Engine (Servers)</span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-[#0B131B] text-[#39AEA9] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                    S
                  </kbd>
                </div>
                {type === 'tv' && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                    <span className="text-[#E2E8F0] font-medium">Skip to Next Episode</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-[#0B131B] text-[#39AEA9] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                      N
                    </kbd>
                  </div>
                )}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                  <span className="text-[#E2E8F0] font-medium">Toggle This Shortcuts Cheat Sheet</span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-[#0B131B] text-[#39AEA9] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                    ?
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                  <span className="text-[#E2E8F0] font-medium">Quick Seek ±5 Minutes</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-0.5 rounded-lg bg-[#0B131B] text-[#39AEA9] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                      Shift
                    </kbd>
                    <span className="text-[#8FA8AD] text-xs">+</span>
                    <kbd className="px-2 py-0.5 rounded-lg bg-[#0B131B] text-[#39AEA9] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                      ➔ / ⬅
                    </kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                  <span className="text-[#E2E8F0] font-medium">Quick Seek ±10 Minutes</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-0.5 rounded-lg bg-[#0B131B] text-[#39AEA9] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                      Alt
                    </kbd>
                    <span className="text-[#8FA8AD] text-xs">+</span>
                    <kbd className="px-2 py-0.5 rounded-lg bg-[#0B131B] text-[#39AEA9] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                      ➔ / ⬅
                    </kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                  <span className="text-[#E2E8F0] font-medium">Fine Seek ±1 Minute</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-0.5 rounded-lg bg-[#0B131B] text-[#39AEA9] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                      [
                    </kbd>
                    <span className="text-[#8FA8AD] text-xs">/</span>
                    <kbd className="px-2 py-0.5 rounded-lg bg-[#0B131B] text-[#39AEA9] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                      ]
                    </kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                  <span className="text-[#E2E8F0] font-medium">Close Overlay / Exit Theater</span>
                  <kbd className="px-2 py-1 rounded-lg bg-[#0B131B] text-[#8FA8AD] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                    Esc
                  </kbd>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    soundFx.playTap();
                    setIsShortcutsOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#A4C8E1] to-[#39AEA9] text-[#0B131B] font-bold text-xs shadow-md cursor-pointer hover:opacity-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* TV Season & Episode Selector */}
        {type === 'tv' && (
          <section className="space-y-5 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-lg font-bold font-display text-[#F8FAFC]">Episodes</h3>
                  <p className="text-xs text-[#8FA8AD] font-sans">Chapter selection</p>
                </div>
                {nextEpisodeInfo && (
                  <button
                    onClick={() => handleEpisodeChange(nextEpisodeInfo.season, nextEpisodeInfo.episode)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.08] hover:bg-[#39AEA9]/20 text-[#39AEA9] hover:text-white border border-[#39AEA9]/30 text-xs font-sans font-semibold transition-all cursor-pointer ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39AEA9]"
                    title={`Skip directly to S${nextEpisodeInfo.season} E${nextEpisodeInfo.episode}`}
                    aria-label={`Skip directly to S${nextEpisodeInfo.season} E${nextEpisodeInfo.episode}`}
                  >
                    <SkipForward className="w-3 h-3 fill-current" />
                    <span>Next: S{nextEpisodeInfo.season} E{nextEpisodeInfo.episode}</span>
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#0B131B]/60 backdrop-blur-xl border border-white/[0.08] rounded-xl">
                {seasons.map((s: any) => (
                  <button
                    key={s.season_number}
                    onClick={() => handleEpisodeChange(s.season_number, 1)}
                    className={
                      currentSeason === s.season_number
                        ? "px-3.5 py-1.5 rounded-lg text-xs font-sans font-semibold bg-gradient-to-r from-[#A4C8E1] to-[#39AEA9] text-[#0B131B] shadow-[0_0_12px_rgba(57,174,169,0.4)] cursor-pointer"
                        : "px-3.5 py-1.5 rounded-lg text-xs font-sans font-medium text-[#8FA8AD] hover:text-white hover:bg-white/[0.08] cursor-pointer"
                    }
                  >
                    {s.name || `Season ${s.season_number}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3.5">
              {episodesLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] animate-pulse h-28" />
                ))
              ) : seasonEpisodes.length > 0 ? (
                seasonEpisodes.map((ep: any) => {
                  const isActive = ep.episode_number === currentEpisode;
                  return (
                    <EpisodeCard
                      key={ep.episode_number}
                      episode={ep}
                      seasonNumber={currentSeason}
                      isActive={isActive}
                      fallbackBackdrop={meta?.backdrop_path || meta?.poster_path}
                      defaultRuntime={meta?.episode_run_time?.[0]}
                      onClick={() => {
                        soundFx.playTap();
                        handleEpisodeChange(currentSeason, ep.episode_number);
                      }}
                    />
                  );
                })
              ) : (
                Array.from({ length: episodesCount }).map((_, i) => {
                  const epNum = i + 1;
                  const isActive = epNum === currentEpisode;
                  return (
                    <EpisodeCard
                      key={epNum}
                      episode={{
                        episode_number: epNum,
                        name: `Episode ${epNum}`,
                        overview: meta?.overview ? `${meta.overview.slice(0, 140)}...` : `Episode ${epNum} of Season ${currentSeason}.`,
                        runtime: meta?.episode_run_time?.[0] || null,
                        still_path: meta?.backdrop_path || null
                      }}
                      seasonNumber={currentSeason}
                      isActive={isActive}
                      fallbackBackdrop={meta?.backdrop_path || meta?.poster_path}
                      defaultRuntime={meta?.episode_run_time?.[0]}
                      onClick={() => {
                        soundFx.playTap();
                        handleEpisodeChange(currentSeason, epNum);
                      }}
                    />
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* Real Cast Member Showcase */}
        {meta?.cast && meta.cast.length > 0 && (
          <section className="space-y-4 pt-6 border-t border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-[#A4C8E1] to-[#39AEA9]" />
              <div>
                <h3 className="font-display text-lg font-bold text-[#F8FAFC]">Cast Showcase</h3>
                <p className="text-xs text-[#8FA8AD] font-sans">Actors &amp; Roles</p>
              </div>
            </div>
            <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
              {meta.cast.map((c: any, idx: number) => {
                const avatar = ImageService.getProfile(c.profile_path, c.name);
                return (
                  <div key={idx} className="flex flex-col items-center shrink-0 w-24 gap-2 text-center">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-white/[0.1] bg-[#0B131B]">
                      <Image src={avatar} alt={c.name} fill sizes="56px" className="object-cover" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-[#F8FAFC] truncate max-w-[85px]">{c.name}</p>
                      <p className="text-[11px] font-sans text-[#8FA8AD] truncate max-w-[85px]">{c.character}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Live TMDB Recommendations Row */}
        {recommendations.length > 0 && (
          <div className="pt-6 border-t border-white/[0.08]">
            <MovieRow
              title="More Like This"
              items={recommendations.map(m => ({ ...m, media_type: type }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
