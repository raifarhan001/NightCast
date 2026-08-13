"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { apiFetch, API_BASE_URL } from '../../../../lib/api';
import { saveWatchProgress, getSavedTimestamp } from '../../../../lib/progress';
import { ImageService } from '../../../../lib/ImageService';
import { Play, Star, Download, DownloadCloud, Languages, Globe, X, Check, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';
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
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [currentSeason, setCurrentSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  const [meta, setMeta] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const [servers, setServers] = useState<any[]>(() => {
    const defaultServers: any[] = [
      {
        id: 'vidbolt',
        name: 'Server 1 (VidBolt)',
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
        id: 'vidsrc',
        name: 'Server 2 (VidSrc)',
        url: type === 'tv'
          ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${currentSeason}&episode=${currentEpisode}`
          : `https://vidsrc.me/embed/movie?tmdb=${id}`,
        type: 'iframe',
        language: 'en',
        language_name: 'vidsrc.me'
      },
      {
        id: 'hindi-dubbed',
        name: 'Server 3 (Hindi Dubbed)',
        url: type === 'tv'
          ? `https://vsrc.su/embed/tv/${id}/${currentSeason}-${currentEpisode}?ds_lang=hi`
          : `https://vsrc.su/embed/movie/${id}?ds_lang=hi`,
        type: 'iframe',
        language: 'hi',
        language_name: 'vsrc.su',
        is_dub: true
      }
    ];
    return defaultServers;
  });

  const [activeServerId, setActiveServerId] = useState('vidbolt');
  const [playerUrl, setPlayerUrl] = useState("");
  const [seasonEpisodes, setSeasonEpisodes] = useState<any[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);
  const [failedServerIds, setFailedServerIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [streamErrorMsg, setStreamErrorMsg] = useState<string | null>(null);
  const lastPlaybackTimeRef = useRef<number>(0);

  // Audio track switching state
  const [hlsAudioTracks, setHlsAudioTracks] = useState<Array<{ id: number; name: string; lang?: string }>>([
    { id: 0, name: 'English', lang: 'en' },
    { id: 1, name: 'Hindi', lang: 'hi' },
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

  useEffect(() => {
    setFailedServerIds([]);
    setToastMessage(null);
    setStreamErrorMsg(null);
  }, [id, currentSeason, currentEpisode]);

  const rawActiveServer = servers.find(s => s.id === activeServerId) || servers[0];
  const isServerFailed = rawActiveServer && failedServerIds.includes(rawActiveServer.id);

  const activeServer = useMemo(() => {
    if (!rawActiveServer) return null;
    if (isServerFailed) {
      let fallbackUrl = rawActiveServer.url;
      if (rawActiveServer.id === 'vidbolt') {
        fallbackUrl = type === 'tv'
          ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${currentSeason}&episode=${currentEpisode}`
          : `https://vidsrc.me/embed/movie?tmdb=${id}`;
      } else if (rawActiveServer.id === 'vidsrc') {
        fallbackUrl = type === 'tv'
          ? `https://vidbolt.xyz/tv/${id}/${currentSeason}/${currentEpisode}`
          : `https://vidbolt.xyz/movie/${id}`;
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

        const recs = await apiFetch(`/api/tmdb/${type}/${id}/recommendations`);
        setRecommendations(recs || []);
      } catch (err) {
        console.error("Meta fetch error", err);
      }
    };
    fetchMeta();
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
          const currentExists = data.servers.some((s: any) => s.id === activeServerId);
          if (!currentExists) {
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

    if (finalUrl.includes('vidbolt.xyz')) {
      try {
        const urlObj = new URL(finalUrl);
        if (!urlObj.searchParams.has('theme')) {
          urlObj.searchParams.set('theme', '1F4959');
        }
        if (id) {
          const seconds = getSavedTimestamp(id, currentSeason, currentEpisode);
          if (seconds > 10 && !urlObj.searchParams.has('startAt')) {
            urlObj.searchParams.set('startAt', Math.floor(seconds).toString());
          }
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
    const seconds = getSavedTimestamp(id, currentSeason, currentEpisode);
    setResumeTime(seconds);
  }, [id, activeServerId, currentSeason, currentEpisode, type]);

  const handlePlayerProgress = useCallback((currentTime: number, duration: number) => {
    if (!id) return;
    lastPlaybackTimeRef.current = currentTime;
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
        progress_percent: progressPercent
      });

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
  }, [id, activeProfile, meta, type, currentSeason, currentEpisode]);

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

  const handleEpisodeChange = (s: number, ep: number) => {
    setCurrentSeason(s);
    setCurrentEpisode(ep);
    window.history.pushState(null, '', `/watch/tv/${id}?season=${s}&episode=${ep}`);
  };

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
            id: "vidbolt-direct",
            label: "VidBolt Ultra Fast Source (1080p Full HD)",
            url: type === 'tv' ? `https://vidbolt.xyz/tv/${id}/${currentSeason}/${currentEpisode}` : `https://vidbolt.xyz/movie/${id}`,
            quality: "1080p Full HD",
            format: "mp4/stream",
            type: "direct_stream"
          },
          {
            id: "vidsrc-direct",
            label: "VidSrc Primary Stream (1080p)",
            url: type === 'tv' ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${currentSeason}&episode=${currentEpisode}` : `https://vidsrc.me/embed/movie?tmdb=${id}`,
            quality: "1080p",
            format: "mp4/stream",
            type: "direct_stream"
          },
          {
            id: "hindi-direct",
            label: "Hindi Dubbed Audio Source (720p/1080p)",
            url: type === 'tv' ? `https://vsrc.su/embed/tv/${id}/${currentSeason}-${currentEpisode}?ds_lang=hi` : `https://vsrc.su/embed/movie/${id}?ds_lang=hi`,
            quality: "720p / 1080p",
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

  const handleDownloadStream = (url: string) => {
    if (!url) return;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleCopyLink = (url: string, optionId: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedDownloadId(optionId);
      setTimeout(() => setCopiedDownloadId(null), 2000);
    }).catch(console.error);
  };

  const movieTitle = meta?.title || meta?.name || "Loading Stream...";
  const releaseYear = meta?.release_date || meta?.first_air_date
    ? new Date(meta.release_date || meta.first_air_date).getFullYear().toString() : "2026";

  const seasons = meta?.seasons || [{"season_number": 1, "episode_count": 8, "name": "Season 1"}];
  const selectedSeasonData = seasons.find((s: any) => s.season_number === currentSeason) || seasons[0];
  const episodesCount = selectedSeasonData?.episode_count || 8;

  return (
    <div className="min-h-screen max-w-7xl mx-auto pt-20 pb-28 px-6 md:px-12 relative select-none bg-[#011425] text-white">
      <div className="space-y-6">
        {/* Full Player Container */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-[#5C7C89]/25 bg-[#011425] shadow-2xl shadow-[#011425]">
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
                poster={meta?.backdrop_path ? `https://image.tmdb.org/t/p/original${meta.backdrop_path}` : undefined}
                onError={handleHlsError}
              />
            ) : (
              <iframe
                key={activeServerId}
                src={playerUrl}
                onLoad={() => setIsIframeLoaded(true)}
                className="absolute top-0 left-0 w-full h-full border-0"
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
        </div>

        {/* Source Error / Fallback Notification Toast */}
        {toastMessage && (
          <div className="p-3.5 px-5 bg-[#1F4959]/30 border border-[#5C7C89]/40 rounded-2xl flex items-center justify-between text-xs text-[#5C7C89] shadow-xl animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#5C7C89] shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-[#5C7C89] hover:text-white text-xs font-bold px-2 py-0.5 rounded-lg hover:bg-[#1F4959]/50 transition-all"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Server Selector Bar */}
        <div className="p-5 bg-[#081E30] border border-[#5C7C89]/25 rounded-2xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shadow-xl">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#5C7C89] mb-1">
              <span className="w-2 h-2 rounded-full bg-[#1F4959] animate-pulse" />
              <span>NIGHTCAST STREAM ENGINE</span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight font-display text-white">
              {movieTitle} <span className="text-[#5C7C89] font-normal text-base">({releaseYear})</span>
            </h1>
          </div>

          {/* Server Selection & Action Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Server List Pills */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-full bg-[#011425]/60 border border-[#5C7C89]/25 shadow-inner">
              {servers.map((srv) => {
                const isActive = srv.id === activeServerId;
                const isFailed = failedServerIds.includes(srv.id);
                return (
                  <button
                    key={srv.id}
                    onClick={() => {
                      if (!isFailed) {
                        setActiveServerId(srv.id);
                      }
                    }}
                    disabled={isFailed}
                    className={
                      isFailed
                        ? "px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#5C7C89]/30 line-through cursor-not-allowed"
                        : isActive
                        ? "gtv-tab-pill-active text-xs font-bold"
                        : "gtv-tab-pill text-xs font-medium"
                    }
                  >
                    {srv.name}
                  </button>
                );
              })}
            </div>

            {/* Direct Download Button */}
            <button
              onClick={handleOpenDownloadModal}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#1F4959] to-[#5C7C89] hover:from-[#255b6f] hover:to-[#6c8f9d] text-white font-bold text-xs shadow-lg shadow-[#1F4959]/30 transition-all transform hover:scale-105 active:scale-95 border border-[#5C7C89]/40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Offline</span>
            </button>
          </div>
        </div>

        {/* Download Options Modal Popup */}
        {isDownloadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#011425]/85 backdrop-blur-md p-4 animate-in fade-in">
            <div className="bg-[#081E30] border border-[#5C7C89]/35 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative space-y-4">
              <button
                onClick={() => setIsDownloadModalOpen(false)}
                className="absolute top-4 right-4 text-[#5C7C89] hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#1F4959]/40 border border-[#5C7C89]/30 text-white rounded-xl shadow-inner">
                  <DownloadCloud className="w-6 h-6 text-[#5C7C89]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white font-display">Offline Download Hub</h3>
                  <p className="text-xs text-[#5C7C89]">Select a direct high-speed stream to save or download</p>
                </div>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto no-scrollbar pt-2">
                {downloadOptions.map((opt, idx) => {
                  const isCopied = copiedDownloadId === (opt.id || `opt-${idx}`);
                  return (
                    <div
                      key={opt.id || idx}
                      className="bg-[#011425] p-3.5 rounded-xl border border-[#5C7C89]/25 hover:border-[#5C7C89]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#1F4959]/60 text-white border border-[#5C7C89]/30">
                            {opt.quality || "1080P HD"}
                          </span>
                          <p className="font-bold text-xs text-white truncate">{opt.label || `Option ${idx + 1}`}</p>
                        </div>
                        <p className="text-[10px] text-[#5C7C89] font-mono truncate">{movieTitle} • {type === 'tv' ? `S${currentSeason}E${currentEpisode}` : 'Full Movie'}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleCopyLink(opt.url, opt.id || `opt-${idx}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#081E30] hover:bg-[#1F4959]/40 text-[#5C7C89] hover:text-white border border-[#5C7C89]/30 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                          title="Copy direct stream link"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Globe className="w-3.5 h-3.5" />}
                          <span>{isCopied ? "Copied" : "Copy"}</span>
                        </button>
                        <button
                          onClick={() => handleDownloadStream(opt.url)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-[#1F4959] to-[#5C7C89] hover:from-[#255b6f] hover:to-[#6c8f9d] text-white text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-1.5 border border-[#5C7C89]/40 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-[#5C7C89]/20">
                <button
                  onClick={() => setIsDownloadModalOpen(false)}
                  className="w-full py-2.5 bg-[#011425] hover:bg-[#1F4959]/40 text-[#5C7C89] hover:text-white text-xs font-bold rounded-xl transition-all border border-[#5C7C89]/25 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TV Season & Episode Selector */}
        {type === 'tv' && (
          <section className="space-y-5 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#5C7C89]/20 pb-4">
              <div>
                <h3 className="text-lg font-extrabold font-display text-white">Episodes</h3>
                <p className="text-[10px] text-[#5C7C89] font-medium uppercase">Select Chapter</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {seasons.map((s: any) => (
                  <button key={s.season_number} onClick={() => handleEpisodeChange(s.season_number, 1)}
                    className={currentSeason === s.season_number ? "gtv-tab-pill-active" : "gtv-tab-pill"}
                  >
                    {s.name || `Season ${s.season_number}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {episodesLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3.5 rounded-2xl border border-[#5C7C89]/20 bg-[#081E30]/60 animate-pulse h-16" />
                ))
              ) : seasonEpisodes.length > 0 ? (
                seasonEpisodes.map((ep: any) => {
                  const isActive = ep.episode_number === currentEpisode;
                  return (
                    <button key={ep.episode_number} onClick={() => handleEpisodeChange(currentSeason, ep.episode_number)}
                      className={`group text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3 cursor-pointer ${
                        isActive
                          ? 'bg-[#1F4959] text-white font-extrabold border-[#5C7C89] shadow-[0_0_20px_rgba(31,73,89,0.6)]'
                          : 'border-[#5C7C89]/20 bg-[#081E30] text-[#5C7C89] hover:text-white hover:border-[#5C7C89]/60 hover:bg-[#0D2A42]'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-white text-[#1F4959]' : 'bg-[#011425] group-hover:bg-[#1F4959] group-hover:text-white text-[#5C7C89]'
                      }`}>
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[9px] font-bold uppercase ${isActive ? 'text-white/80' : 'text-[#5C7C89]'}`}>
                          EPISODE {ep.episode_number}
                        </p>
                        <h4 className="text-xs font-bold truncate text-white">{ep.name || `Episode ${ep.episode_number}`}</h4>
                      </div>
                    </button>
                  );
                })
              ) : (
                Array.from({ length: episodesCount }).map((_, i) => {
                  const epNum = i + 1;
                  const isActive = epNum === currentEpisode;
                  return (
                    <button key={epNum} onClick={() => handleEpisodeChange(currentSeason, epNum)}
                      className={`group text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3 cursor-pointer ${
                        isActive
                          ? 'bg-[#1F4959] text-white font-extrabold border-[#5C7C89] shadow-[0_0_20px_rgba(31,73,89,0.6)]'
                          : 'border-[#5C7C89]/20 bg-[#081E30] text-[#5C7C89] hover:text-white hover:border-[#5C7C89]/60 hover:bg-[#0D2A42]'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-white text-[#1F4959]' : 'bg-[#011425] group-hover:bg-[#1F4959] group-hover:text-white text-[#5C7C89]'
                      }`}>
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[9px] font-bold uppercase ${isActive ? 'text-white/80' : 'text-[#5C7C89]'}`}>
                          EPISODE {epNum}
                        </p>
                        <h4 className="text-xs font-bold truncate text-white">Chapter {epNum}</h4>
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
          <section className="space-y-4 pt-6 border-t border-[#5C7C89]/20">
            <h3 className="font-display text-lg font-extrabold text-white">Cast Showcase</h3>
            <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
              {meta.cast.map((c: any, idx: number) => {
                const avatar = ImageService.getProfile(c.profile_path, c.name);
                return (
                  <div key={idx} className="flex flex-col items-center shrink-0 w-24 gap-2 text-center">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden border border-[#5C7C89]/30 bg-[#081E30]">
                      <Image src={avatar} alt={c.name} fill sizes="56px" className="object-cover" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white truncate max-w-[85px]">{c.name}</p>
                      <p className="text-[10px] text-[#5C7C89] truncate max-w-[85px]">{c.character}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Live TMDB Recommendations Row */}
        {recommendations.length > 0 && (
          <div className="pt-6 border-t border-[#5C7C89]/20">
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
