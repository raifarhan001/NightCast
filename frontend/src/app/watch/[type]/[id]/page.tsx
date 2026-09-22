"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { apiFetch, API_BASE_URL } from '../../../../lib/api';
import { saveWatchProgress, getSavedTimestamp, getCleanMediaId, getContinueWatchingList, LocalProgressItem } from '../../../../lib/progress';
import { ImageService } from '../../../../lib/ImageService';
import {
  Play,
  Star,
  Globe,
  X,
  Check,
  Loader2,
  AlertTriangle,
  RotateCcw,
  SkipForward,
  Maximize2,
  Minimize2,
  Tv,
  List,
  Keyboard,
  Sparkles,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { soundFx } from '../../../../lib/soundEffects';
import AmbientGlow from '../../../../components/shared/AmbientGlow';
import { useAmbientStore } from '../../../../store/ambientStore';
import { useUserStore } from '../../../../store/userStore';
import HLSPlayer from '../../../../components/player/HLSPlayer';
import NightCastPlayer from '../../../../components/player/NightCastPlayer';
import MovieRow from '../../../../components/shared/MovieRow';
import { PlayerSkeleton } from '../../../../components/shared/Skeletons';

function attachTimestampToUrl(url: string, seconds: number): string {
  if (!url) return url;
  try {
    const urlObj = new URL(url);
    if (seconds > 5) {
      const s = Math.floor(seconds).toString();
      // VidLink uses 'start'
      urlObj.searchParams.set('start', s);
      // VidSrc and VidBolt use 't'
      urlObj.searchParams.set('t', s);
      // VidKing and others use 'progress'
      urlObj.searchParams.set('progress', s);
      // VidBolt uses 'startAt'
      urlObj.searchParams.set('startAt', s);
    }
    if (url.includes('vidlink.pro')) {
      if (!urlObj.searchParams.has('primaryColor')) {
        urlObj.searchParams.set('primaryColor', '22c55e');
      }
      if (!urlObj.searchParams.has('autoplay')) {
        urlObj.searchParams.set('autoplay', 'true');
      }
    } else if (url.includes('vidbolt.xyz')) {
      if (!urlObj.searchParams.has('theme')) {
        urlObj.searchParams.set('theme', '22c55e');
      }
    }
    return urlObj.toString();
  } catch {
    if (seconds > 5) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}start=${Math.floor(seconds)}&t=${Math.floor(seconds)}`;
    }
    return url;
  }
}

function formatDurationTime(totalSeconds: number): string {
  const secs = Math.floor(totalSeconds);
  const hrs = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const remSecs = secs % 60;
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
  }
  return `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
}

export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activeProfile } = useUserStore();
  const type = Array.isArray(params.type) ? params.type[0] : params.type;
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = getCleanMediaId(rawId);

  const initialSeason = useMemo(() => {
    const fromQuery = searchParams.get('season');
    if (fromQuery) {
      const s = parseInt(fromQuery, 10);
      if (!isNaN(s) && s >= 1) return s;
    }
    if (typeof window !== 'undefined' && type === 'tv' && id) {
      const savedList = getContinueWatchingList();
      const match = savedList.find((x: LocalProgressItem) => getCleanMediaId(x.id) === id && x.season);
      if (match && match.season) return match.season;
    }
    return 1;
  }, [searchParams, type, id]);

  const initialEpisode = useMemo(() => {
    const fromQuery = searchParams.get('episode');
    if (fromQuery) {
      const ep = parseInt(fromQuery, 10);
      if (!isNaN(ep) && ep >= 1) return ep;
    }
    if (typeof window !== 'undefined' && type === 'tv' && id) {
      const savedList = getContinueWatchingList();
      const match = savedList.find((x: LocalProgressItem) => getCleanMediaId(x.id) === id && x.episode);
      if (match && match.episode) return match.episode;
    }
    return 1;
  }, [searchParams, type, id]);

  const [currentSeason, setCurrentSeason] = useState(initialSeason);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [meta, setMeta] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const buildServers = useCallback((seasonNum: number, episodeNum: number) => {
    return [
      {
        id: 'vidsrc',
        name: 'Server 1 (VidSrc)',
        url: type === 'tv'
          ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${seasonNum}&episode=${episodeNum}`
          : `https://vidsrc.me/embed/movie?tmdb=${id}`,
        type: 'iframe',
        language: 'en',
        language_name: 'vidsrc.me'
      },
      {
        id: 'vidsrc-to',
        name: 'Server 2 (VidSrc VIP)',
        url: type === 'tv'
          ? `https://vidsrc.to/embed/tv/${id}/${seasonNum}/${episodeNum}`
          : `https://vidsrc.to/embed/movie/${id}`,
        type: 'iframe',
        language: 'en',
        language_name: 'vidsrc.to'
      },
      {
        id: 'vidbolt',
        name: 'Server 3 (VidBolt)',
        url: type === 'tv'
          ? `https://vidbolt.xyz/tv/${id}/${seasonNum}/${episodeNum}`
          : type === 'anime'
          ? `https://vidbolt.xyz/anime/${id}/${episodeNum}`
          : `https://vidbolt.xyz/movie/${id}`,
        type: 'iframe',
        language: 'en',
        language_name: 'vidbolt.xyz'
      },
      {
        id: 'vidlink',
        name: 'Server 4 (VidLink Pro)',
        url: type === 'tv'
          ? `https://vidlink.pro/tv/${id}/${seasonNum}/${episodeNum}?primaryColor=22c55e&autoplay=true`
          : `https://vidlink.pro/movie/${id}?primaryColor=22c55e&autoplay=true`,
        type: 'iframe',
        language: 'en',
        language_name: 'vidlink.pro'
      },
      {
        id: 'nightcast-native',
        name: 'Server 5 (NightCast Native)',
        url: type === 'tv'
          ? `https://player.autoembed.cc/embed/tv/${id}/${seasonNum}/${episodeNum}`
          : `https://player.autoembed.cc/embed/movie/${id}`,
        type: 'hls',
        language: 'en',
        language_name: 'NightCast Player'
      }
    ];
  }, [type, id]);

  const [servers, setServers] = useState<any[]>(() => buildServers(initialSeason, initialEpisode));

  const [activeServerId, setActiveServerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nightcast_preferred_server_v2') || localStorage.getItem('nightcast_preferred_server');
      if (saved && saved !== 'vidlink' && ['vidsrc', 'vidsrc-to', 'vidbolt', 'vidlink', 'nightcast-native'].includes(saved)) {
        return saved;
      }
    }
    return 'vidsrc';
  });

  const [resumeTime, setResumeTime] = useState<number>(() => {
    if (typeof window === 'undefined' || !id) return 0;
    const isTv = type === 'tv';
    const queryTime = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('time') || new URLSearchParams(window.location.search).get('t') : null;
    if (queryTime && parseInt(queryTime, 10) > 5) {
      return parseInt(queryTime, 10);
    }
    return getSavedTimestamp(
      id,
      isTv ? initialSeason : undefined,
      isTv ? initialEpisode : undefined,
      type as 'movie' | 'tv'
    );
  });

  const [playerUrl, setPlayerUrl] = useState<string>(() => {
    if (!id) return "";
    const isTv = type === 'tv';
    let defaultUrl = isTv
      ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${initialSeason}&episode=${initialEpisode}`
      : `https://vidsrc.me/embed/movie?tmdb=${id}`;
    let initSec = 0;
    if (typeof window !== 'undefined') {
      const queryTime = new URLSearchParams(window.location.search).get('time') || new URLSearchParams(window.location.search).get('t');
      if (queryTime && parseInt(queryTime, 10) > 5) {
        initSec = parseInt(queryTime, 10);
      } else {
        initSec = getSavedTimestamp(id, isTv ? initialSeason : undefined, isTv ? initialEpisode : undefined, type as 'movie' | 'tv');
      }
    }
    return attachTimestampToUrl(defaultUrl, initSec);
  });

  const [seasonEpisodes, setSeasonEpisodes] = useState<any[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [failedServerIds, setFailedServerIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [streamErrorMsg, setStreamErrorMsg] = useState<string | null>(null);

  // Active Playback Tracking Refs
  const playbackSecondsRef = useRef<number>(0);
  const watchDurationSecondsRef = useRef<number>(0);
  const hasRealPlayerEventsRef = useRef<boolean>(false);
  const lastRealPlayerEventTimeRef = useRef<number>(0);
  const lastBackendSaveTimeRef = useRef<number>(0);

  // Audio track switching state
  const [hlsAudioTracks, setHlsAudioTracks] = useState<Array<{ id: number; name: string; lang?: string }>>([
    { id: 0, name: 'Hindi Dubbed (हिंदी)', lang: 'hi' },
    { id: 1, name: 'English / Original', lang: 'en' },
    { id: 2, name: 'Korean', lang: 'ko' }
  ]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(0);
  const [isAudioDropdownOpen, setIsAudioDropdownOpen] = useState(false);

  // Luxury Cinema Experience States
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isAdShieldActive, setIsAdShieldActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('nightcast_ad_shield');
        const saved = localStorage.getItem('nightcast_ad_shield_v2');
        if (saved !== null) {
          return saved === 'true';
        }
      } catch {}
    }
    return false;
  });
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
    setStreamErrorMsg(null);
    setShowNextOverlay(false);
    showNextOverlayRef.current = false;
    setIsAutoPlayDismissed(false);
    isAutoPlayDismissedRef.current = false;
    setNextCountdown(10);
  }, [id, currentSeason, currentEpisode]);

  const rawActiveServer = useMemo(() => {
    const list = servers && servers.length > 0 ? servers : buildServers(currentSeason, currentEpisode);
    const target = list.find((s: any) => s.id === activeServerId) || list[0];
    if (target && target.type === 'iframe') {
      if (target.id === 'vidlink') {
        return {
          ...target,
          url: type === 'tv'
            ? `https://vidlink.pro/tv/${id}/${currentSeason}/${currentEpisode}?primaryColor=39AEA9&autoplay=true`
            : `https://vidlink.pro/movie/${id}?primaryColor=39AEA9&autoplay=true`
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
      if (target.id === 'vidbolt') {
        return {
          ...target,
          url: type === 'tv'
            ? `https://vidbolt.xyz/tv/${id}/${currentSeason}/${currentEpisode}`
            : type === 'anime'
            ? `https://vidbolt.xyz/anime/${id}/${currentEpisode}`
            : `https://vidbolt.xyz/movie/${id}`
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
      if (rawActiveServer.id === 'vidsrc') {
        fallbackUrl = type === 'tv'
          ? `https://vidsrc.to/embed/tv/${id}/${currentSeason}/${currentEpisode}`
          : `https://vidsrc.to/embed/movie/${id}`;
      } else if (rawActiveServer.id === 'vidsrc-to') {
        fallbackUrl = type === 'tv'
          ? `https://vidbolt.xyz/tv/${id}/${currentSeason}/${currentEpisode}`
          : `https://vidbolt.xyz/movie/${id}`;
      } else if (rawActiveServer.id === 'vidbolt') {
        fallbackUrl = type === 'tv'
          ? `https://vidlink.pro/tv/${id}/${currentSeason}/${currentEpisode}?primaryColor=39AEA9&autoplay=true`
          : `https://vidlink.pro/movie/${id}?primaryColor=39AEA9&autoplay=true`;
      } else if (rawActiveServer.id === 'vidlink') {
        fallbackUrl = type === 'tv'
          ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${currentSeason}&episode=${currentEpisode}`
          : `https://vidsrc.me/embed/movie?tmdb=${id}`;
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
    if (activeServer?.audio_tracks && activeServer.audio_tracks.length > 0) {
      const parsedTracks = activeServer.audio_tracks.map((tr: any, idx: number) => ({
        id: idx,
        name: tr.label || tr.lang?.toUpperCase() || `Audio Track ${idx + 1}`,
        lang: tr.lang
      }));
      setHlsAudioTracks(parsedTracks);
    }
  }, [activeServer]);

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
    if (type !== 'tv' || !id) return;
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
        const data = await apiFetch(
          `/api/tmdb/${type}/${id}/streams?season=${currentSeason}&episode=${currentEpisode}`
        );
        if (data?.servers && data.servers.length > 0) {
          setServers(data.servers);
          const preferred = typeof window !== 'undefined'
            ? (localStorage.getItem('nightcast_preferred_server_v2') || localStorage.getItem('nightcast_preferred_server'))
            : null;
          const preferredExists = preferred && preferred !== 'vidlink' && data.servers.some((s: any) => s.id === preferred);
          const currentExists = data.servers.some((s: any) => s.id === activeServerId);
          if (preferredExists) {
            setActiveServerId(preferred!);
          } else if (!currentExists) {
            setActiveServerId(data.servers[0].id);
          }
        }
      } catch (err) {
        console.error("Streams fetch error", err);
      }
    };
    fetchServers();
  }, [id, type, currentSeason, currentEpisode]);

  useEffect(() => {
    if (!activeServer) return;
    const isTv = type === 'tv';
    const queryTime = searchParams.get('time') || searchParams.get('t');
    const parsedQuery = queryTime ? parseInt(queryTime, 10) : 0;
    const seconds = parsedQuery > 5
      ? parsedQuery
      : getSavedTimestamp(
          id,
          isTv ? currentSeason : undefined,
          isTv ? currentEpisode : undefined,
          type as 'movie' | 'tv'
        );

    const finalUrl = attachTimestampToUrl(activeServer.url, seconds);
    setPlayerUrl(finalUrl);
    setResumeTime(seconds);
    playbackSecondsRef.current = seconds;
    setIsIframeLoaded(false);
  }, [activeServer, id, type, currentSeason, currentEpisode, searchParams]);

  // If iframe onLoad hasn't fired after 2 seconds (due to adblocker or sandbox), mark as loaded so heartbeat and progress can run
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setIsIframeLoaded(true);
    }, 2000);
    return () => clearTimeout(fallbackTimer);
  }, [playerUrl]);

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

  const handleEpisodeChange = useCallback((s: number, ep: number) => {
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
  }, [id, router]);

  const handleRestartFromBeginning = useCallback(() => {
    soundFx.playTap();
    playbackSecondsRef.current = 0;
    watchDurationSecondsRef.current = 0;
    setResumeTime(0);
    if (!id) return;
    const isTv = type === 'tv';
    saveWatchProgress({
      id: id,
      media_type: type as 'movie' | 'tv',
      title: meta?.title || meta?.name || 'Untitled',
      poster_path: meta?.poster_path || null,
      backdrop_path: meta?.backdrop_path || null,
      season: isTv ? currentSeason : undefined,
      episode: isTv ? currentEpisode : undefined,
      timestamp_seconds: 0,
      duration_seconds: meta?.runtime ? meta.runtime * 60 : 7200,
      progress_percent: 0,
    });
    if (activeServer) {
      setPlayerUrl(attachTimestampToUrl(activeServer.url, 0));
      setIsIframeLoaded(false);
    }
  }, [id, type, meta, currentSeason, currentEpisode, activeServer]);

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
      });

      // Auto-trigger next episode overlay in web series when nearing the end
      if (type === 'tv' && duration > 60 && (currentTime >= duration - 25 || progressPercent >= 92)) {
        if (!isAutoPlayDismissedRef.current && !showNextOverlayRef.current) {
          triggerNextEpisodeOverlay();
        }
      }

      const now = Date.now();
      const isFinishing = progressPercent >= 92.0 || currentTime >= duration - 25;
      const shouldSaveBackend = (now - lastBackendSaveTimeRef.current >= 12000) || isFinishing;

      if (activeProfile && meta && shouldSaveBackend) {
        lastBackendSaveTimeRef.current = now;
        apiFetch('/api/progress/update', {
          method: 'POST',
          headers: { 'X-Profile-ID': activeProfile.id },
          body: JSON.stringify({
            mediaType: type,
            id: id,
            currentTime: currentTime,
            duration: duration,
            progress: progressPercent,
            season: type === 'tv' ? currentSeason : undefined,
            episode: type === 'tv' ? currentEpisode : undefined,
            event: 'progress',
            title: meta.title || meta.name || 'Movie',
            posterPath: meta.poster_path,
            backdropPath: meta.backdrop_path,
          })
        }).catch(console.error);
      }
    } catch (e) {
      console.error("Failed to save progress", e);
    }
  }, [id, activeProfile, meta, type, currentSeason, currentEpisode, nextEpisodeInfo, triggerNextEpisodeOverlay]);

  // 1. Reset & load saved timestamp on route / episode change
  useEffect(() => {
    if (!id) return;
    const isTv = type === 'tv';
    const initialSeconds = getSavedTimestamp(
      id,
      isTv ? currentSeason : undefined,
      isTv ? currentEpisode : undefined,
      type as 'movie' | 'tv'
    );
    playbackSecondsRef.current = initialSeconds;
    watchDurationSecondsRef.current = 0;
    hasRealPlayerEventsRef.current = false;
    setResumeTime(initialSeconds);
  }, [id, currentSeason, currentEpisode, type]);

  // 2. When TMDB meta loads, ensure metadata in localStorage is updated with high-quality backdrop & title
  useEffect(() => {
    if (!id || !meta) return;
    try {
      const raw = localStorage.getItem('nightcast_continue_watching');
      if (raw) {
        const map = JSON.parse(raw);
        const specificKey = type === 'tv' ? `${id}_s${currentSeason}e${currentEpisode}` : id;
        const target = map[specificKey] || map[id];
        if (target) {
          target.title = meta.title || meta.name || target.title;
          target.poster_path = meta.poster_path || target.poster_path;
          target.backdrop_path = meta.backdrop_path || target.backdrop_path;
          localStorage.setItem('nightcast_continue_watching', JSON.stringify(map));
        }
      }
    } catch {
      // Ignore
    }
  }, [id, meta, type, currentSeason, currentEpisode]);

  // 3. PostMessage listener for embed players (Vidking PLAYER_EVENT, VidBolt, VidLink, VidSrc)
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

        // Support Vidking PLAYER_EVENT
        if (data.type === 'PLAYER_EVENT' && data.data) {
          hasRealPlayerEventsRef.current = true;
          const pData = data.data;
          const curTime = Number(pData.currentTime ?? pData.timestamp);
          const dur = Number(pData.duration);
          const estDur = (!isNaN(dur) && dur > 0) ? dur : (meta?.runtime ? meta.runtime * 60 : 7200);

          if (!isNaN(curTime) && curTime >= 10) {
            playbackSecondsRef.current = curTime;
            handlePlayerProgress(curTime, estDur);
          }
          if (pData.event === 'ended') {
            if (type === 'tv' && !isAutoPlayDismissedRef.current && !showNextOverlayRef.current) {
              triggerNextEpisodeOverlay();
            }
          }
          return;
        }

        let curTime: number | undefined;
        let dur: number | undefined;

        if (data.type === 'MEDIA_DATA' && data.data) {
          hasRealPlayerEventsRef.current = true;
          curTime = Number(data.data.currentTime);
          dur = Number(data.data.duration);
        } else if (data.event === 'timeupdate' || data.type === 'timeupdate') {
          hasRealPlayerEventsRef.current = true;
          curTime = Number(data.currentTime ?? data.data?.currentTime);
          dur = Number(data.duration ?? data.data?.duration);
        } else if (typeof data.currentTime === 'number') {
          hasRealPlayerEventsRef.current = true;
          curTime = data.currentTime;
          dur = typeof data.duration === 'number' ? data.duration : undefined;
        }

        // Guard: If user is resuming from > 30s, ignore initial 0-30s buffer events until player has sought or user has watched >= 10s
        if (resumeTime > 30 && curTime !== undefined && curTime < 30 && watchDurationSecondsRef.current < 10) {
          return;
        }

        if (curTime !== undefined && !isNaN(curTime) && curTime >= 5) {
          lastRealPlayerEventTimeRef.current = Date.now();
          hasRealPlayerEventsRef.current = true;
          playbackSecondsRef.current = curTime;
          const validDur = (dur && !isNaN(dur) && dur > 0) ? dur : (meta?.runtime ? meta.runtime * 60 : 7200);
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
  }, [handlePlayerProgress, meta, type, triggerNextEpisodeOverlay, resumeTime]);

  // 4. Active Watcher Heartbeat: For iframe servers that do not emit continuous postMessage
  useEffect(() => {
    if (!id || !meta) return;
    const estDuration = meta?.runtime ? meta.runtime * 60 : 7200;

    const timer = setInterval(() => {
      if (document.hidden) return;
      // Only skip heartbeat if we received a real player postMessage in the last 10 seconds
      if (Date.now() - lastRealPlayerEventTimeRef.current < 10000) return;
      if (!isIframeLoaded) return;

      watchDurationSecondsRef.current += 5;
      playbackSecondsRef.current += 5;

      // Save once user has watched for >= 5 seconds
      if (playbackSecondsRef.current >= 5) {
        handlePlayerProgress(playbackSecondsRef.current, estDuration);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [id, meta, isIframeLoaded, handlePlayerProgress]);

  // Initial save to establish Continue Watching entry once metadata is loaded
  useEffect(() => {
    if (!id || !meta) return;
    const estDuration = meta?.runtime ? meta.runtime * 60 : 7200;
    const saved = getSavedTimestamp(
      id,
      type === 'tv' ? currentSeason : undefined,
      type === 'tv' ? currentEpisode : undefined,
      type as 'movie' | 'tv'
    );
    if (saved > 5) {
      const initialTimer = setTimeout(() => {
        handlePlayerProgress(saved, estDuration);
      }, 2000);
      return () => clearTimeout(initialTimer);
    }
  }, [id, meta, type, currentSeason, currentEpisode, handlePlayerProgress]);

  // 5. Save progress on beforeunload / exit
  useEffect(() => {
    const handleBeforeUnload = () => {
      const curTime = playbackSecondsRef.current;
      if (curTime >= 5 && meta && id) {
        const estDuration = meta?.runtime ? meta.runtime * 60 : 7200;
        handlePlayerProgress(curTime, estDuration);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [id, meta, handlePlayerProgress]);

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
        localStorage.setItem('nightcast_preferred_server_v2', nextServer.id);
        localStorage.setItem('nightcast_preferred_server', nextServer.id);
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

      if (e.key === 't' || e.key === 'T') {
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
    toggleNativeFullscreen
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
      } overflow-hidden border border-white/[0.1] bg-[#0A0F11] shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_50px_rgba(57,174,169,0.2)]`}
    >

      {!isIframeLoaded && activeServer?.type !== 'hls' && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          <PlayerSkeleton />
        </div>
      )}

      {playerUrl ? (
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

      {/* Quick Floating Next Episode Button */}
      {type === 'tv' && nextEpisodeInfo && !showNextOverlay && (
        <button
          onClick={() => handleEpisodeChange(nextEpisodeInfo.season, nextEpisodeInfo.episode)}
          className="absolute bottom-12 right-3 sm:bottom-16 sm:right-6 z-30 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0A0F11]/90 hover:bg-[#0A0F11] backdrop-blur-xl border border-white/[0.2] hover:border-[#39AEA9] text-white text-xs font-sans font-semibold shadow-[0_8px_30px_rgba(0,0,0,0.85)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer group"
          title={`Next: Season ${nextEpisodeInfo.season} Episode ${nextEpisodeInfo.episode} - ${nextEpisodeInfo.title}`}
        >
          <SkipForward className="w-3.5 h-3.5 text-[#A2D5AB] group-hover:scale-110 transition-transform" />
          <span>Next Ep (S{nextEpisodeInfo.season} E{nextEpisodeInfo.episode})</span>
        </button>
      )}

      {/* Up Next in 10s Countdown Overlay */}
      {type === 'tv' && nextEpisodeInfo && showNextOverlay && (
        <div className="absolute bottom-12 right-3 sm:bottom-16 sm:right-6 z-40 max-w-sm w-[calc(100%-1.5rem)] sm:w-88 bg-[#0A0F11]/95 backdrop-blur-2xl border border-[#39AEA9]/60 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_35px_rgba(57,174,169,0.35)] animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#A2D5AB] animate-ping" />
              <span className="text-[11px] font-sans font-bold tracking-wider uppercase text-[#A2D5AB]">
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
              <span className="px-1.5 py-0.5 rounded bg-[#39AEA9]/20 text-[#A2D5AB] text-[10px] font-semibold border border-[#39AEA9]/30">
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
              className="h-full bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB] transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(57,174,169,0.8)]"
              style={{ width: `${Math.max(0, Math.min(100, (nextCountdown / 10) * 100))}%` }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEpisodeChange(nextEpisodeInfo.season, nextEpisodeInfo.episode)}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB] hover:opacity-95 text-[#0A0F11] font-sans font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
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
    <div className="min-h-screen max-w-7xl mx-auto pt-20 pb-28 px-4 sm:px-6 md:px-12 relative select-none bg-[#0A0F11] text-[#E2E8F0]">
      <AmbientGlow />

      {/* 1. Fullscreen Theater Mode Overlay via React Portal directly into body */}
      {mounted && isTheaterMode && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] w-screen h-screen bg-[#070B0E]/98 backdrop-blur-3xl flex flex-col justify-between items-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
          {/* Top HUD Bar */}
          <div className="w-full max-w-7xl flex items-center justify-between pb-2 px-2 sm:px-4 text-white z-20">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#39AEA9] animate-pulse shrink-0" />
              <h2 className="text-sm sm:text-base font-bold font-display text-white truncate max-w-xs sm:max-w-md md:max-w-lg">
                {movieTitle}
                {type === 'tv' && (
                  <span className="text-[#A2D5AB] font-sans text-xs ml-2 font-semibold px-2 py-0.5 rounded bg-white/[0.08] border border-white/[0.1]">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#A2D5AB] text-xs font-sans font-medium border border-white/[0.1] transition-all cursor-pointer"
                  title="Episodes [E]"
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-sans font-medium transition-all cursor-pointer ${
                  isAdShieldActive
                    ? 'bg-[#39AEA9]/20 hover:bg-[#39AEA9]/30 text-[#A2D5AB] border-[#39AEA9]/40'
                    : 'bg-white/[0.08] hover:bg-white/[0.15] text-[#8FA8AD] hover:text-white border-white/[0.1]'
                }`}
                title={isAdShieldActive ? "Ad-Shield is active (Turn off if stream blocks sandbox)" : "Ad-Shield is turned off"}
              >
                {isAdShieldActive ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-[#A2D5AB]" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-[#8FA8AD]" />
                )}
                <span className="hidden sm:inline">
                  {isAdShieldActive ? "Ad-Shield ON" : "Ad-Shield OFF"}
                </span>
              </button>
              <button
                onClick={cycleNextServer}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#8FA8AD] hover:text-white text-xs font-sans font-medium border border-white/[0.1] transition-all cursor-pointer"
                title="Cycle Server [S]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Server [S]</span>
              </button>
              <button
                onClick={toggleNativeFullscreen}
                className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#8FA8AD] hover:text-white transition-all cursor-pointer"
                title="Toggle Fullscreen [F]"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  soundFx.playTap();
                  setIsShortcutsOpen(true);
                }}
                className="p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#8FA8AD] hover:text-white transition-all cursor-pointer"
                title="Shortcuts [?]"
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  soundFx.playChime();
                  setIsTheaterMode(false);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB] text-[#0A0F11] font-bold text-xs shadow-lg hover:opacity-95 transition-all cursor-pointer"
                title="Exit Theater Mode [Esc or T]"
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
              <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-r from-[#39AEA9]/25 via-[#5B8FB9]/20 to-[#A2D5AB]/25 rounded-[40px] blur-3xl -z-10 opacity-70 pointer-events-none" />
              {renderPlayerScreen(true)}
            </div>
          </div>

          <div className="text-[11px] text-[#8FA8AD] font-sans pb-1 text-center">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.1] text-[#A2D5AB] font-mono">T</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-white/[0.1] text-[#A2D5AB] font-mono">Esc</kbd> to exit • <kbd className="px-1.5 py-0.5 rounded bg-white/[0.1] text-[#A2D5AB] font-mono">F</kbd> for fullscreen • <kbd className="px-1.5 py-0.5 rounded bg-white/[0.1] text-[#A2D5AB] font-mono">N</kbd> next episode
          </div>
        </div>,
        document.body
      )}

      {/* 2. Normal View Player Container */}
      <div className="space-y-6">
        <div className="relative w-full">
          {/* Ambilight Aurora Halo Behind Player */}
          <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-r from-[#39AEA9]/20 via-[#5B8FB9]/15 to-[#A2D5AB]/20 rounded-[40px] blur-3xl -z-10 opacity-70 pointer-events-none transition-opacity duration-1000 animate-pulse" />

          {/* Screen Box */}
          {isTheaterMode ? (
            <div className="relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.08] bg-[#0A0F11] flex flex-col items-center justify-center gap-3 text-[#8FA8AD]">
              <p className="text-sm font-sans font-medium text-white">Playing in Cinema Theater Mode</p>
              <button
                onClick={() => setIsTheaterMode(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#A2D5AB] text-xs font-semibold transition cursor-pointer"
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
              <AlertTriangle className="w-4 h-4 text-[#A2D5AB] shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-[#A2D5AB] hover:text-white text-xs font-sans font-semibold px-2.5 py-1 rounded-full hover:bg-[#39AEA9]/20 transition-all cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Ad-Shield Sandbox Warning Banner when Active */}
        {isAdShieldActive && (
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
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0A0F11] font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
            >
              Disable Sandbox &amp; Play
            </button>
          </div>
        )}

        {/* Server Selector Bar */}
        <div className="p-5 bg-[#121A1D]/85 backdrop-blur-xl border border-white/[0.08] rounded-2xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shadow-xl">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs font-sans font-medium text-[#8FA8AD] mb-1">
              <span className="w-2 h-2 bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB] animate-pulse rounded-full" />
              <span>Stream Engine</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight font-display text-[#F8FAFC]">
              {movieTitle} <span className="text-[#8FA8AD] font-sans font-normal text-base">({releaseYear})</span>
            </h1>
          </div>

          {/* Server Selection & Action Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Server List */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#0A0F11]/80 border border-white/[0.08] rounded-xl">
              {servers.map((srv) => {
                const isActive = srv.id === activeServerId;
                const isFailed = failedServerIds.includes(srv.id);
                return (
                  <button
                    key={srv.id}
                    onClick={() => {
                      if (!isFailed) {
                        soundFx.playTap();
                        setActiveServerId(srv.id);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('nightcast_preferred_server_v2', srv.id);
                          localStorage.setItem('nightcast_preferred_server', srv.id);
                        }
                      }
                    }}
                    disabled={isFailed}
                    className={
                      isFailed
                        ? "px-3.5 py-1.5 rounded-lg text-xs font-sans text-[#8FA8AD]/30 line-through cursor-not-allowed"
                        : isActive
                        ? "px-3.5 py-1.5 rounded-lg text-xs font-sans font-semibold bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB] text-[#0A0F11] shadow-[0_0_12px_rgba(57,174,169,0.5)] transition-all cursor-pointer"
                        : "px-3.5 py-1.5 rounded-lg text-xs font-sans font-medium text-[#8FA8AD] hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                    }
                  >
                    {srv.name}
                  </button>
                );
              })}
            </div>

            {/* Quick Action Pill Controls (Ad-Shield, Theater Mode, Episode Drawer, Shortcuts) */}
            <div className="flex items-center gap-2">
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
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-sans font-medium transition-all active:scale-95 cursor-pointer ${
                  isAdShieldActive
                    ? 'bg-[#39AEA9]/15 hover:bg-[#39AEA9]/25 text-[#A2D5AB] border-[#39AEA9]/40 shadow-[0_0_12px_rgba(57,174,169,0.25)]'
                    : 'bg-white/[0.08] hover:bg-white/[0.14] text-[#8FA8AD] hover:text-white border-white/[0.1]'
                }`}
                title={isAdShieldActive ? "Ad-Shield is active (Turn off if stream blocks sandbox)" : "Ad-Shield is turned off (Allow all permissions)"}
              >
                {isAdShieldActive ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-[#A2D5AB]" />
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
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-sans font-medium transition-all active:scale-95 cursor-pointer ${
                  isTheaterMode
                    ? 'bg-[#39AEA9] text-[#0A0F11] border-[#39AEA9] font-bold shadow-[0_0_15px_rgba(57,174,169,0.5)]'
                    : 'bg-white/[0.08] hover:bg-white/[0.14] text-[#E2E8F0] hover:text-white border-white/[0.1]'
                }`}
                title="Cinema Theater Mode [T]"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#A2D5AB]" />
                <span className="hidden sm:inline">Theater [T]</span>
              </button>

              {/* Episode Drawer Button for TV */}
              {type === 'tv' && (
                <button
                  onClick={() => {
                    soundFx.playTap();
                    setIsEpisodeDrawerOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-[#E2E8F0] hover:text-white font-sans font-medium text-xs border border-white/[0.1] transition-all active:scale-95 cursor-pointer"
                  title="Quick Episode Drawer [E]"
                >
                  <List className="w-3.5 h-3.5 text-[#A2D5AB]" />
                  <span className="hidden sm:inline">Episodes [E]</span>
                </button>
              )}

              {/* Keyboard Shortcuts Button */}
              <button
                onClick={() => {
                  soundFx.playTap();
                  setIsShortcutsOpen(true);
                }}
                className="p-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-[#8FA8AD] hover:text-white font-sans text-xs border border-white/[0.1] transition-all active:scale-95 cursor-pointer"
                title="Keyboard Shortcuts [?]"
              >
                <Keyboard className="w-3.5 h-3.5 text-[#A2D5AB]" />
              </button>
            </div>

            {/* Next Episode Button for TV Series */}
            {type === 'tv' && nextEpisodeInfo && (
              <button
                onClick={() => {
                  soundFx.playTap();
                  handleEpisodeChange(nextEpisodeInfo.season, nextEpisodeInfo.episode);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB] hover:opacity-95 text-[#0A0F11] font-sans font-bold text-xs shadow-[0_0_16px_rgba(57,174,169,0.45)] transition-all active:scale-95 cursor-pointer"
                title={`Play Next: Season ${nextEpisodeInfo.season} Episode ${nextEpisodeInfo.episode} - ${nextEpisodeInfo.title}`}
              >
                <SkipForward className="w-3.5 h-3.5 fill-current" />
                <span>Next Episode (S{nextEpisodeInfo.season} E{nextEpisodeInfo.episode})</span>
              </button>
            )}

          </div>
        </div>

        {/* Slide-over Episode Drawer for Quick TV Navigation */}
        {mounted && isEpisodeDrawerOpen && type === 'tv' && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[100001] flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="fixed inset-0 cursor-pointer"
              onClick={() => setIsEpisodeDrawerOpen(false)}
            />
            <div className="relative w-full max-w-md h-full bg-[#0A0F11]/95 backdrop-blur-2xl border-l border-white/[0.1] p-6 flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.9)] z-10 animate-in slide-in-from-right duration-300">
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
                  className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Close [Esc]"
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
                    className={`px-3 py-1 rounded-lg text-xs font-sans shrink-0 transition-all cursor-pointer ${
                      currentSeason === s.season_number
                        ? 'bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB] text-[#0A0F11] font-bold shadow-[0_0_10px_rgba(57,174,169,0.4)]'
                        : 'bg-white/[0.06] text-[#8FA8AD] hover:text-white'
                    }`}
                  >
                    {s.name || `Season ${s.season_number}`}
                  </button>
                ))}
              </div>

              {/* Episodes List in Drawer */}
              <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-2">
                {episodesLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-2xl bg-white/[0.04] animate-pulse" />
                  ))
                ) : seasonEpisodes.length > 0 ? (
                  seasonEpisodes.map((ep: any) => {
                    const isActive = ep.episode_number === currentEpisode;
                    return (
                      <button
                        key={ep.episode_number}
                        onClick={() => {
                          soundFx.playTap();
                          handleEpisodeChange(currentSeason, ep.episode_number);
                          setIsEpisodeDrawerOpen(false);
                        }}
                        className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#39AEA9]/20 border-[#39AEA9] text-white shadow-[0_0_15px_rgba(57,174,169,0.3)]'
                            : 'bg-[#121A1D]/80 border-white/[0.06] text-[#8FA8AD] hover:text-white hover:border-[#39AEA9]/50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-gradient-to-tr from-[#39AEA9] to-[#A2D5AB] text-[#0A0F11]' : 'bg-[#0A0F11] text-[#8FA8AD]'
                        }`}>
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[10px] font-sans font-semibold ${isActive ? 'text-[#A2D5AB]' : 'text-[#8FA8AD]'}`}>
                            Episode {ep.episode_number}
                          </p>
                          <h4 className="text-xs font-medium text-white truncate">{ep.name || `Episode ${ep.episode_number}`}</h4>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  Array.from({ length: episodesCount }).map((_, i) => {
                    const epNum = i + 1;
                    const isActive = epNum === currentEpisode;
                    return (
                      <button
                        key={epNum}
                        onClick={() => {
                          soundFx.playTap();
                          handleEpisodeChange(currentSeason, epNum);
                          setIsEpisodeDrawerOpen(false);
                        }}
                        className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#39AEA9]/20 border-[#39AEA9] text-white shadow-[0_0_15px_rgba(57,174,169,0.3)]'
                            : 'bg-[#121A1D]/80 border-white/[0.06] text-[#8FA8AD] hover:text-white hover:border-[#39AEA9]/50'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-gradient-to-tr from-[#39AEA9] to-[#A2D5AB] text-[#0A0F11]' : 'bg-[#0A0F11] text-[#8FA8AD]'
                        }`}>
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[10px] font-sans font-semibold ${isActive ? 'text-[#A2D5AB]' : 'text-[#8FA8AD]'}`}>
                            Episode {epNum}
                          </p>
                          <h4 className="text-xs font-medium text-white truncate">Chapter {epNum}</h4>
                        </div>
                      </button>
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
            <div className="relative bg-[#121A1D]/95 border border-[#39AEA9]/40 rounded-3xl p-6 max-w-md w-full shadow-[0_0_60px_rgba(57,174,169,0.25)] space-y-5 z-10 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#39AEA9]/20 text-[#A2D5AB]">
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
                  className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs font-sans">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                  <span className="text-[#E2E8F0] font-medium">Cinema Theater Mode</span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-[#0A0F11] text-[#A2D5AB] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                    T
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                  <span className="text-[#E2E8F0] font-medium">Toggle Native Fullscreen</span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-[#0A0F11] text-[#A2D5AB] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                    F
                  </kbd>
                </div>
                {type === 'tv' && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                    <span className="text-[#E2E8F0] font-medium">Toggle Episode Drawer</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-[#0A0F11] text-[#A2D5AB] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                      E
                    </kbd>
                  </div>
                )}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                  <span className="text-[#E2E8F0] font-medium">Cycle Stream Engine (Servers)</span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-[#0A0F11] text-[#A2D5AB] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                    S
                  </kbd>
                </div>
                {type === 'tv' && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                    <span className="text-[#E2E8F0] font-medium">Skip to Next Episode</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-[#0A0F11] text-[#A2D5AB] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                      N
                    </kbd>
                  </div>
                )}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                  <span className="text-[#E2E8F0] font-medium">Toggle This Shortcuts Cheat Sheet</span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-[#0A0F11] text-[#A2D5AB] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                    ?
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                  <span className="text-[#E2E8F0] font-medium">Close Overlay / Exit Theater</span>
                  <kbd className="px-2 py-1 rounded-lg bg-[#0A0F11] text-[#8FA8AD] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
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
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB] text-[#0A0F11] font-bold text-xs shadow-md cursor-pointer hover:opacity-95 transition-all"
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
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.08] hover:bg-[#39AEA9]/20 text-[#A2D5AB] hover:text-white border border-[#39AEA9]/30 text-xs font-sans font-semibold transition-all cursor-pointer ml-1"
                    title={`Skip directly to S${nextEpisodeInfo.season} E${nextEpisodeInfo.episode}`}
                  >
                    <SkipForward className="w-3 h-3 fill-current" />
                    <span>Next: S{nextEpisodeInfo.season} E{nextEpisodeInfo.episode}</span>
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#121A1D]/80 border border-white/[0.08] rounded-xl">
                {seasons.map((s: any) => (
                  <button
                    key={s.season_number}
                    onClick={() => handleEpisodeChange(s.season_number, 1)}
                    className={
                      currentSeason === s.season_number
                        ? "px-3.5 py-1.5 rounded-lg text-xs font-sans font-semibold bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB] text-[#0A0F11] shadow-[0_0_12px_rgba(57,174,169,0.4)] cursor-pointer"
                        : "px-3.5 py-1.5 rounded-lg text-xs font-sans font-medium text-[#8FA8AD] hover:text-white hover:bg-white/[0.08] cursor-pointer"
                    }
                  >
                    {s.name || `Season ${s.season_number}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {episodesLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#121A1D] animate-pulse h-16" />
                ))
              ) : seasonEpisodes.length > 0 ? (
                seasonEpisodes.map((ep: any) => {
                  const isActive = ep.episode_number === currentEpisode;
                  return (
                    <button
                      key={ep.episode_number}
                      onClick={() => handleEpisodeChange(currentSeason, ep.episode_number)}
                      className={`group text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                        isActive
                          ? 'bg-[#39AEA9]/20 text-white font-semibold border-[#39AEA9] shadow-[0_0_20px_rgba(57,174,169,0.3)]'
                          : 'border-white/[0.08] bg-[#121A1D]/80 text-[#8FA8AD] hover:text-white hover:border-[#39AEA9]/60 hover:bg-[#1A2529]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'bg-gradient-to-tr from-[#39AEA9] to-[#A2D5AB] text-[#0A0F11]' : 'bg-[#0A0F11] group-hover:bg-[#39AEA9] group-hover:text-[#0A0F11] text-[#8FA8AD]'
                      }`}>
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[10px] font-sans font-semibold ${isActive ? 'text-[#A2D5AB]' : 'text-[#8FA8AD]'}`}>
                          Episode {ep.episode_number}
                        </p>
                        <h4 className="text-xs font-medium truncate text-[#F8FAFC]">{ep.name || `Episode ${ep.episode_number}`}</h4>
                      </div>
                    </button>
                  );
                })
              ) : (
                Array.from({ length: episodesCount }).map((_, i) => {
                  const epNum = i + 1;
                  const isActive = epNum === currentEpisode;
                  return (
                    <button
                      key={epNum}
                      onClick={() => handleEpisodeChange(currentSeason, epNum)}
                      className={`group text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                        isActive
                          ? 'bg-[#39AEA9]/20 text-white font-semibold border-[#39AEA9] shadow-[0_0_20px_rgba(57,174,169,0.4)]'
                          : 'border-white/[0.08] bg-[#121A1D]/80 text-[#8FA8AD] hover:text-white hover:border-[#39AEA9] hover:bg-[#1A2529]'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-gradient-to-tr from-[#39AEA9] to-[#A2D5AB] text-[#0A0F11]' : 'bg-[#0A0F11] group-hover:bg-[#39AEA9] group-hover:text-[#0A0F11] text-[#8FA8AD]'
                      }`}>
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[10px] font-sans font-semibold ${isActive ? 'text-[#A2D5AB]' : 'text-[#8FA8AD]'}`}>
                          Episode {epNum}
                        </p>
                        <h4 className="text-xs font-medium truncate text-[#F8FAFC]">Chapter {epNum}</h4>
                      </div>
                    </button>
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
              <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-[#39AEA9] to-[#A2D5AB]" />
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
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-white/[0.1] bg-[#121A1D]">
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
