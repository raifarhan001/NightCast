"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { apiFetch, API_BASE_URL } from '../../../../lib/api';
import { saveWatchProgress, getSavedTimestamp, getCleanMediaId } from '../../../../lib/progress';
import { ImageService } from '../../../../lib/ImageService';
import {
  Play,
  Star,
  Download,
  DownloadCloud,
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
  Sparkles
} from 'lucide-react';
import { soundFx } from '../../../../lib/soundEffects';
import AmbientGlow from '../../../../components/shared/AmbientGlow';
import { useAmbientStore } from '../../../../store/ambientStore';
import { useUserStore } from '../../../../store/userStore';
import HLSPlayer from '../../../../components/player/HLSPlayer';
import NightCastPlayer from '../../../../components/player/NightCastPlayer';
import MovieRow from '../../../../components/shared/MovieRow';
import { PlayerSkeleton } from '../../../../components/shared/Skeletons';

export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activeProfile } = useUserStore();
  const type = Array.isArray(params.type) ? params.type[0] : params.type;
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = getCleanMediaId(rawId);

  const [currentSeason, setCurrentSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  const [meta, setMeta] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const [servers, setServers] = useState<any[]>(() => {
    const defaultServers: any[] = [
      {
        id: 'vidsrc',
        name: 'Server 1 (VidSrc)',
        url: type === 'tv'
          ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${currentSeason}&episode=${currentEpisode}`
          : `https://vidsrc.me/embed/movie?tmdb=${id}`,
        type: 'iframe',
        language: 'en',
        language_name: 'vidsrc.me'
      },
      {
        id: 'vidbolt',
        name: 'Server 2 (VidBolt)',
        url: type === 'tv'
          ? `https://vidbolt.xyz/tv/${id}/${currentSeason}/${currentEpisode}`
          : type === 'anime'
          ? `https://vidbolt.xyz/anime/${id}/${currentEpisode}`
          : `https://vidbolt.xyz/movie/${id}`,
        type: 'iframe',
        language: 'en',
        language_name: 'vidbolt.xyz'
      },
      {
        id: 'vidking',
        name: 'Server 3 (Vidking)',
        url: type === 'tv'
          ? `https://www.vidking.net/embed/tv/${id}/${currentSeason}/${currentEpisode}?color=00f2fe&autoPlay=true&nextEpisode=true&episodeSelector=true`
          : `https://www.vidking.net/embed/movie/${id}?color=00f2fe&autoPlay=true`,
        type: 'iframe',
        language: 'en',
        language_name: 'vidking.net'
      }
    ];
    return defaultServers;
  });

  const [activeServerId, setActiveServerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nightcast_preferred_server');
      if (saved && ['vidsrc', 'vidbolt', 'vidking'].includes(saved)) {
        return saved;
      }
    }
    return 'vidsrc';
  });

  const [resumeTime, setResumeTime] = useState<number>(() => {
    if (typeof window === 'undefined' || !id) return 0;
    const isTv = type === 'tv';
    return getSavedTimestamp(
      id,
      isTv ? 1 : undefined,
      isTv ? 1 : undefined,
      type as 'movie' | 'tv'
    );
  });

  const [playerUrl, setPlayerUrl] = useState<string>(() => {
    if (!id) return "";
    const isTv = type === 'tv';
    return isTv
      ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=1&episode=1`
      : `https://vidsrc.me/embed/movie?tmdb=${id}`;
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

  // Audio track switching state
  const [hlsAudioTracks, setHlsAudioTracks] = useState<Array<{ id: number; name: string; lang?: string }>>([
    { id: 0, name: 'Hindi Dubbed (हिंदी)', lang: 'hi' },
    { id: 1, name: 'English / Original', lang: 'en' },
    { id: 2, name: 'Korean', lang: 'ko' }
  ]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(0);
  const [isAudioDropdownOpen, setIsAudioDropdownOpen] = useState(false);

  // Download Modal state
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadOptions, setDownloadOptions] = useState<any[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const [copiedDownloadId, setCopiedDownloadId] = useState<string | null>(null);

  // Luxury Cinema Experience States
  const [isTheaterMode, setIsTheaterMode] = useState(false);
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

  const rawActiveServer = servers.find(s => s.id === activeServerId) || servers[0];
  const isServerFailed = rawActiveServer && failedServerIds.includes(rawActiveServer.id);

  const activeServer = useMemo(() => {
    if (!rawActiveServer) return null;
    if (isServerFailed) {
      let fallbackUrl = rawActiveServer.url;
      if (rawActiveServer.id === 'vidsrc') {
        fallbackUrl = type === 'tv'
          ? `https://vidbolt.xyz/tv/${id}/${currentSeason}/${currentEpisode}`
          : `https://vidbolt.xyz/movie/${id}`;
      } else if (rawActiveServer.id === 'vidbolt') {
        fallbackUrl = type === 'tv'
          ? `https://www.vidking.net/embed/tv/${id}/${currentSeason}/${currentEpisode}?color=00f2fe&autoPlay=true&nextEpisode=true&episodeSelector=true`
          : `https://www.vidking.net/embed/movie/${id}?color=00f2fe&autoPlay=true`;
      } else if (rawActiveServer.id === 'vidking') {
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
          const preferred = typeof window !== 'undefined' ? localStorage.getItem('nightcast_preferred_server') : null;
          const preferredExists = preferred && data.servers.some((s: any) => s.id === preferred);
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
    let finalUrl = activeServer.url;
    const isTv = type === 'tv';
    const seconds = getSavedTimestamp(
      id,
      isTv ? currentSeason : undefined,
      isTv ? currentEpisode : undefined,
      type as 'movie' | 'tv'
    );

    if (finalUrl.includes('vidking.net')) {
      try {
        const urlObj = new URL(finalUrl);
        if (!urlObj.searchParams.has('color')) {
          urlObj.searchParams.set('color', '00f2fe');
        }
        if (!urlObj.searchParams.has('autoPlay')) {
          urlObj.searchParams.set('autoPlay', 'true');
        }
        if (isTv) {
          if (!urlObj.searchParams.has('nextEpisode')) {
            urlObj.searchParams.set('nextEpisode', 'true');
          }
          if (!urlObj.searchParams.has('episodeSelector')) {
            urlObj.searchParams.set('episodeSelector', 'true');
          }
        }
        if (seconds > 5) {
          urlObj.searchParams.set('progress', Math.floor(seconds).toString());
        }
        finalUrl = urlObj.toString();
      } catch (e) {
        console.error("Vidking URL parameter setup error", e);
      }
    } else if (finalUrl.includes('vidbolt.xyz')) {
      try {
        const urlObj = new URL(finalUrl);
        if (!urlObj.searchParams.has('theme')) {
          urlObj.searchParams.set('theme', 'FA0037');
        }
        if (seconds > 5) {
          urlObj.searchParams.set('startAt', Math.floor(seconds).toString());
        }
        finalUrl = urlObj.toString();
      } catch (e) {
        console.error("VidBolt URL parameter setup error", e);
      }
    }

    setPlayerUrl(finalUrl);
    setIsIframeLoaded(false);
  }, [activeServer, id, type, currentSeason, currentEpisode]);

  useEffect(() => {
    if (!id) return;
    const isTv = type === 'tv';
    const seconds = getSavedTimestamp(
      id,
      isTv ? currentSeason : undefined,
      isTv ? currentEpisode : undefined,
      type as 'movie' | 'tv'
    );
    setResumeTime(seconds);
  }, [id, activeServerId, currentSeason, currentEpisode, type]);

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
    window.history.pushState(null, '', `/watch/tv/${id}?season=${s}&episode=${ep}`);
  }, [id]);

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

      if (activeProfile && meta) {
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
            posterPath: meta.poster_path
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

        if (curTime !== undefined && !isNaN(curTime) && curTime >= 10) {
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
  }, [handlePlayerProgress, meta, type, triggerNextEpisodeOverlay]);

  // 4. Active Watcher Heartbeat: For iframe servers that do not emit postMessage (Server 1 VidSrc, Server 2 VidBolt, Server 3)
  useEffect(() => {
    if (!id || !meta) return;
    const estDuration = meta?.runtime ? meta.runtime * 60 : 7200;

    const timer = setInterval(() => {
      if (document.hidden) return;
      // If player is reporting real events via postMessage, don't simulate
      if (hasRealPlayerEventsRef.current) return;
      if (!isIframeLoaded) return;

      watchDurationSecondsRef.current += 5;
      playbackSecondsRef.current += 5;

      // Only save once user has actually watched for >= 15 seconds
      if (playbackSecondsRef.current >= 15) {
        handlePlayerProgress(playbackSecondsRef.current, estDuration);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [id, meta, isIframeLoaded, handlePlayerProgress]);

  // 5. Save progress on beforeunload / exit
  useEffect(() => {
    const handleBeforeUnload = () => {
      const curTime = playbackSecondsRef.current;
      if (curTime >= 15 && meta && id) {
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

  const handleOpenDownloadModal = async () => {
    setIsDownloadModalOpen(true);
    setIsDownloading(false);
    setDownloadProgress(null);
    try {
      const res = await apiFetch(`/api/tmdb/${type}/${id}/download?season=${currentSeason}&episode=${currentEpisode}`);
      if (res?.downloads && res.downloads.length > 0) {
        setDownloadOptions(res.downloads);
      } else {
        const fallbackOptions = [
          {
            id: "vidsrc-direct",
            label: "Server 1 (VidSrc Primary Stream 1080p)",
            url: type === 'tv'
              ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${currentSeason}&episode=${currentEpisode}`
              : `https://vidsrc.me/embed/movie?tmdb=${id}`,
            quality: "1080p Full HD",
            format: "mp4/stream",
            type: "direct_stream"
          },
          {
            id: "vidbolt-direct",
            label: "Server 2 (VidBolt Ultra Fast Source 1080p Full HD)",
            url: type === 'tv' ? `https://vidbolt.xyz/tv/${id}/${currentSeason}/${currentEpisode}` : `https://vidbolt.xyz/movie/${id}`,
            quality: "1080p Full HD",
            format: "mp4/stream",
            type: "direct_stream"
          },
          {
            id: "vidking-direct",
            label: "Server 3 (Vidking High-Speed Stream 1080p)",
            url: type === 'tv'
              ? `https://www.vidking.net/embed/tv/${id}/${currentSeason}/${currentEpisode}?color=00f2fe&autoPlay=true&nextEpisode=true&episodeSelector=true`
              : `https://www.vidking.net/embed/movie/${id}?color=00f2fe&autoPlay=true`,
            quality: "1080p Full HD",
            format: "mp4/stream",
            type: "direct_stream"
          }
        ];
        setDownloadOptions(fallbackOptions);
      }
    } catch (e) {
      console.error("Failed to fetch download links", e);
    }
  };

  const handleDownloadStream = (url: string, optionLabel?: string) => {
    if (!url) return;
    setIsDownloading(true);
    setDownloadProgress(`Preparing ${optionLabel || "download"}...`);

    const titleStr = meta?.title || meta?.name || "nightcast_video";
    const cleanTitle = titleStr.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const filename = `${cleanTitle}_${type === 'tv' ? `S${currentSeason}E${currentEpisode}` : 'movie'}.mp4`;

    const apiBase = API_BASE_URL.startsWith('http') ? API_BASE_URL : '';
    const proxyDownloadUrl = `${apiBase}/api/v1/tmdb/download-proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;

    try {
      const link = document.createElement('a');
      link.href = proxyDownloadUrl;
      link.setAttribute('download', filename);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      window.open(proxyDownloadUrl, '_blank');
    }

    setTimeout(() => {
      setIsDownloading(false);
      setDownloadProgress(null);
    }, 3000);
  };

  const handleOpenDirectStream = (url: string) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = (url: string, optionId: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedDownloadId(optionId);
      setTimeout(() => setCopiedDownloadId(null), 2000);
    }).catch(() => {
      // Fallback copy
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedDownloadId(optionId);
      setTimeout(() => setCopiedDownloadId(null), 2000);
    });
  };

  // Cycle Stream Servers (Server 1 -> Server 2 -> Server 3)
  const cycleNextServer = useCallback(() => {
    if (!servers || servers.length === 0) return;
    const currentIdx = servers.findIndex(s => s.id === activeServerId);
    const nextIdx = (currentIdx + 1) % servers.length;
    const nextServer = servers[nextIdx];
    if (nextServer && !failedServerIds.includes(nextServer.id)) {
      setActiveServerId(nextServer.id);
      if (typeof window !== 'undefined') {
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
        if (isDownloadModalOpen) {
          setIsDownloadModalOpen(false);
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
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        soundFx.playTap();
        handleOpenDownloadModal();
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
    isDownloadModalOpen,
    type,
    nextEpisodeInfo,
    cycleNextServer,
    handleNextEpisodeShortcut
  ]);

  return (
    <div className="min-h-screen max-w-7xl mx-auto pt-20 pb-28 px-4 sm:px-6 md:px-12 relative select-none bg-[#0A0F11] text-[#E2E8F0]">
      <AmbientGlow />
      <div className="space-y-6">
        {/* Full Player Container with Theater Mode and Ambilight halo */}
        <div
          className={
            isTheaterMode
              ? "fixed inset-0 z-[100] w-screen h-screen bg-black/95 backdrop-blur-3xl flex flex-col justify-center items-center p-2 sm:p-6 md:p-8"
              : "relative w-full"
          }
        >
          {/* Ambilight Aurora Halo Behind Player */}
          <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-r from-[#39AEA9]/20 via-[#5B8FB9]/15 to-[#A2D5AB]/20 rounded-[40px] blur-3xl -z-10 opacity-70 pointer-events-none transition-opacity duration-1000 animate-pulse" />

          {/* In Theater Mode, show a sleek Top HUD Bar */}
          {isTheaterMode && (
            <div className="w-full max-w-7xl flex items-center justify-between pb-3 px-2 text-white animate-in fade-in">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#39AEA9] animate-pulse" />
                <h2 className="text-sm sm:text-base font-bold font-display text-white truncate max-w-md">
                  {movieTitle} {type === 'tv' && <span className="text-[#A2D5AB] font-sans text-xs">S{currentSeason} E{currentEpisode}</span>}
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold bg-white/[0.08] text-[#8FA8AD] border border-white/[0.1]">
                  {rawActiveServer?.name || "Server 1"}
                </span>
              </div>

              <div className="flex items-center gap-2">
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
                    <span className="hidden sm:inline">Episodes</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    soundFx.playTap();
                    setIsShortcutsOpen(true);
                  }}
                  className="p-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-[#8FA8AD] hover:text-white transition-all cursor-pointer"
                  title="Shortcuts [?]"
                >
                  <Keyboard className="w-4 h-4" />
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
                  <span className="hidden sm:inline">Exit Theater</span>
                </button>
              </div>
            </div>
          )}

          {/* Screen Box */}
          <div className={`relative w-full ${isTheaterMode ? 'max-w-7xl max-h-[85vh] aspect-video rounded-2xl' : 'aspect-video rounded-3xl'} overflow-hidden border border-white/[0.08] bg-[#0A0F11] shadow-[0_25px_60px_rgba(0,0,0,0.95)]`}>
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
                key={`${activeServerId}-${id}-${type === 'tv' ? `s${currentSeason}e${currentEpisode}` : 'movie'}`}
                src={playerUrl}
                onLoad={() => setIsIframeLoaded(true)}
                className="absolute top-0 left-0 w-full h-full border-0 rounded-3xl"
                allowFullScreen
                scrolling="no"
                title="NightCast Media Player"
                referrerPolicy="origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              />
            )
          ) : (
            <PlayerSkeleton />
          )}

          {/* Quick Floating Next Episode Button (Positioned above player bottom controls) */}
          {type === 'tv' && nextEpisodeInfo && !showNextOverlay && (
            <button
              onClick={() => handleEpisodeChange(nextEpisodeInfo.season, nextEpisodeInfo.episode)}
              className="absolute bottom-14 right-4 sm:bottom-16 sm:right-6 z-30 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0A0F11]/90 hover:bg-[#0A0F11] backdrop-blur-xl border border-white/[0.2] hover:border-[#39AEA9] text-white text-xs font-sans font-semibold shadow-[0_8px_30px_rgba(0,0,0,0.85)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer group"
              title={`Next: Season ${nextEpisodeInfo.season} Episode ${nextEpisodeInfo.episode} - ${nextEpisodeInfo.title}`}
            >
              <SkipForward className="w-3.5 h-3.5 text-[#A2D5AB] group-hover:scale-110 transition-transform" />
              <span>Next Ep (S{nextEpisodeInfo.season} E{nextEpisodeInfo.episode})</span>
            </button>
          )}

          {/* Up Next in 10s Countdown Overlay (Positioned above player bottom controls) */}
          {type === 'tv' && nextEpisodeInfo && showNextOverlay && (
            <div className="absolute bottom-14 right-4 sm:bottom-16 sm:right-6 z-40 max-w-sm w-[calc(100%-2rem)] sm:w-88 bg-[#0A0F11]/95 backdrop-blur-2xl border border-[#39AEA9]/60 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_35px_rgba(57,174,169,0.35)] animate-in fade-in slide-in-from-bottom-3 duration-300">
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

            {/* Quick Action Pill Controls (Theater Mode, Episode Drawer, Shortcuts) */}
            <div className="flex items-center gap-2">
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

            {/* Direct Download Button */}
            <button
              onClick={() => {
                soundFx.playTap();
                handleOpenDownloadModal();
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-[#E2E8F0] hover:text-white font-sans font-medium text-xs border border-white/[0.1] shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#A2D5AB]" />
              <span>Download Offline [D]</span>
            </button>
          </div>
        </div>

        {/* Download Options Modal Popup */}
        {isDownloadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0F11]/85 backdrop-blur-2xl p-4 animate-in fade-in">
            <div className="bg-[#121A1D]/95 border border-white/[0.1] rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-4">
              <button
                onClick={() => setIsDownloadModalOpen(false)}
                className="absolute top-4 right-4 text-[#8FA8AD] hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#39AEA9]/20 border border-[#39AEA9]/40 text-[#A2D5AB] rounded-2xl">
                  <DownloadCloud className="w-6 h-6 text-[#A2D5AB]" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#F8FAFC] font-display">Offline Download Hub</h3>
                  <p className="text-xs text-[#8FA8AD] font-sans">Select a direct high-speed stream to save or download</p>
                </div>
              </div>

              {/* Downloading Progress Banner */}
              {downloadProgress && (
                <div className="p-3 bg-[#39AEA9]/20 border border-[#39AEA9]/50 rounded-xl flex items-center gap-2.5 text-xs text-white font-sans font-medium shadow-lg animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 text-[#A2D5AB]" />
                  <span>{downloadProgress}</span>
                </div>
              )}

              <div className="space-y-2.5 max-h-72 overflow-y-auto no-scrollbar pt-2">
                {downloadOptions.map((opt, idx) => {
                  const isCopied = copiedDownloadId === (opt.id || `opt-${idx}`);
                  return (
                    <div
                      key={opt.id || idx}
                      className="bg-[#0A0F11] p-3.5 rounded-2xl border border-white/[0.08] hover:border-[#39AEA9]/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold bg-[#39AEA9]/20 text-[#A2D5AB] border border-[#39AEA9]/40">
                            {opt.quality || "1080p HD"}
                          </span>
                          <p className="font-semibold text-xs text-[#F8FAFC] truncate font-sans">{opt.label || `Option ${idx + 1}`}</p>
                        </div>
                        <p className="text-[10px] text-[#8FA8AD] font-sans truncate">{movieTitle} • {type === 'tv' ? `S${currentSeason}E${currentEpisode}` : 'Full Movie'}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          onClick={() => handleCopyLink(opt.url, opt.id || `opt-${idx}`)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#8FA8AD] hover:text-white border border-white/[0.08] text-xs font-sans transition-all flex items-center gap-1 cursor-pointer"
                          title="Copy direct stream link"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Globe className="w-3.5 h-3.5" />}
                          <span>{isCopied ? "Copied" : "Copy"}</span>
                        </button>
                        <button
                          onClick={() => handleOpenDirectStream(opt.url)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#E2E8F0] hover:text-white border border-white/[0.08] text-xs font-sans transition-all flex items-center gap-1 cursor-pointer"
                          title="Open stream in new tab"
                        >
                          <Play className="w-3 h-3 text-[#A2D5AB]" />
                          <span>Open</span>
                        </button>
                        <button
                          onClick={() => handleDownloadStream(opt.url, opt.label)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-[#39AEA9] to-[#A2D5AB] hover:opacity-95 text-[#0A0F11] text-xs font-sans font-semibold rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-white/[0.08]">
                <button
                  onClick={() => setIsDownloadModalOpen(false)}
                  className="w-full py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-[#8FA8AD] hover:text-white text-xs font-sans font-medium rounded-xl transition-all border border-white/[0.08] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Slide-over Episode Drawer for Quick TV Navigation */}
        {isEpisodeDrawerOpen && type === 'tv' && (
          <div className="fixed inset-0 z-[120] flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
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
          </div>
        )}

        {/* Keyboard Shortcuts HUD modal */}
        {isShortcutsOpen && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
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
                  <span className="text-[#E2E8F0] font-medium">Direct Offline Download Hub</span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-[#0A0F11] text-[#A2D5AB] border border-white/[0.1] font-mono text-[11px] font-bold shadow">
                    D
                  </kbd>
                </div>
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
          </div>
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
