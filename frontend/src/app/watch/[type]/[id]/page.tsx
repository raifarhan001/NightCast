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
  const [languagePref, setLanguagePref] = useState<'all' | 'hi' | 'regional' | 'en'>('all');

  const [servers, setServers] = useState<any[]>(() => {
    const defaultServers: any[] = [
      {
        id: 'vidsrc-main',
        name: 'VidSrc Main',
        url: type === 'tv'
          ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${currentSeason}&episode=${currentEpisode}`
          : `https://vidsrc.me/embed/movie?tmdb=${id}`,
        type: 'iframe',
        language: 'en'
      },
      {
        id: 'hindi-dubbed',
        name: 'Hindi Dubbed',
        url: type === 'tv'
          ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${currentSeason}&episode=${currentEpisode}&ds_lang=hi`
          : `https://vidsrc.me/embed/movie?tmdb=${id}&ds_lang=hi`,
        type: 'iframe',
        language: 'hi',
        is_dub: true
      },
      {
        id: '2embed-alt',
        name: '2Embed Alt',
        url: type === 'tv'
          ? `https://www.2embed.cc/embedtv/${id}&s=${currentSeason}&e=${currentEpisode}`
          : `https://www.2embed.cc/embed/${id}`,
        type: 'iframe',
        language: 'en'
      }
    ];
    return defaultServers;
  });
  const [activeServerId, setActiveServerId] = useState('vidsrc-main');
  const [playerUrl, setPlayerUrl] = useState("");
  const [seasonEpisodes, setSeasonEpisodes] = useState<any[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);
  const [hlsFailedServers, setHlsFailedServers] = useState<string[]>([]);
  const [iframeFailedServers, setIframeFailedServers] = useState<string[]>([]);
  const [streamErrorMsg, setStreamErrorMsg] = useState<string | null>(null);

  // Download Modal state
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadOptions, setDownloadOptions] = useState<any[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);

  useEffect(() => {
    setHlsFailedServers([]);
    setIframeFailedServers([]);
    setStreamErrorMsg(null);
  }, [id, currentSeason, currentEpisode]);

  const rawActiveServer = servers.find(s => s.id === activeServerId) || servers[0];
  const isHlsFailed = rawActiveServer && hlsFailedServers.includes(rawActiveServer.id);
  const isIframeFailed = rawActiveServer && iframeFailedServers.includes(rawActiveServer.id);

  const activeServer = useMemo(() => {
    if (!rawActiveServer) return null;
    if (isHlsFailed || isIframeFailed) {
      let fallbackUrl = rawActiveServer.url;
      if (rawActiveServer.id === 'vidsrc-main') {
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
  }, [rawActiveServer, isHlsFailed, isIframeFailed, type, id, currentSeason, currentEpisode]);

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
          `/api/tmdb/${type}/${id}/streams?season=${currentSeason}&episode=${currentEpisode}&language=${languagePref}`
        );
        if (data?.servers) {
          const filteredServers = data.servers.filter((s: any) => s.id !== 'vidsrc-pro');
          if (filteredServers.length > 0) {
            setServers(filteredServers);
            if (languagePref === 'hi') {
              const hiSrv = filteredServers.find((s: any) => s.language === 'hi' || s.id.includes('hindi-dub'));
              if (hiSrv) setActiveServerId(hiSrv.id);
            } else if (languagePref === 'regional') {
              const regSrv = filteredServers.find((s: any) => s.is_dub && s.language !== 'en');
              if (regSrv) setActiveServerId(regSrv.id);
            }
          }
        }
      } catch (err) {
        console.error("Streams fetch error", err);
      }
    };
    fetchServers();
  }, [id, type, currentSeason, currentEpisode, languagePref]);

  useEffect(() => {
    if (!activeServer?.url) return;

    let finalUrl = activeServer.url;

    if (finalUrl.includes('vidlink.pro')) {
      let startAtParam = "";
      try {
        if (id) {
          const seconds = getSavedTimestamp(id, currentSeason, currentEpisode);
          if (seconds > 10) {
            startAtParam = `&startAt=${seconds}`;
          }
        }
      } catch (e) {
        console.error(e);
      }
      finalUrl = `${finalUrl}?primaryColor=FFFFFF&secondaryColor=090A0F&iconColor=FFFFFF&icons=default&nextbutton=true${startAtParam}`;
    }

    setPlayerUrl(finalUrl);
    setIsIframeLoaded(false);
    setStreamErrorMsg(null);

    // Strict 4-second timeout check for iframe sources
    if (activeServer.type !== 'hls') {
      const timer = setTimeout(() => {
        if (!isIframeLoaded) {
          if (activeServer.language === 'hi' || activeServer.id === 'hindi-dubbed') {
            setStreamErrorMsg("Hindi stream unavailable on this server, please try another server or switch to VidSrc Main.");
          } else {
            setStreamErrorMsg("Server unavailable, please retry");
          }
        }
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [activeServer, id, type, currentSeason, currentEpisode]);

  useEffect(() => {
    if (!id) return;
    const seconds = getSavedTimestamp(id, currentSeason, currentEpisode);
    setResumeTime(seconds);
  }, [id, activeServerId, currentSeason, currentEpisode, type]);

  const handlePlayerProgress = useCallback((currentTime: number, duration: number) => {
    if (!id) return;
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
        const fallbackUrl = type === 'tv'
          ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${currentSeason}&episode=${currentEpisode}`
          : `https://vidsrc.me/embed/movie?tmdb=${id}`;
        setDownloadOptions([{
          label: "Primary Streaming Source",
          url: fallbackUrl,
          quality: "1080p",
          format: "stream",
          type: "stream_fallback"
        }]);
        setDownloadProgress("Direct download unavailable for this source, please use streaming or try another server.");
      }
    } catch (e) {
      console.error("Failed to fetch download links", e);
      const fallbackUrl = type === 'tv'
        ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${currentSeason}&episode=${currentEpisode}`
        : `https://vidsrc.me/embed/movie?tmdb=${id}`;
      setDownloadOptions([{
        label: "Primary Streaming Source",
        url: fallbackUrl,
        quality: "1080p",
        format: "stream",
        type: "stream_fallback"
      }]);
      setDownloadProgress("Direct download unavailable for this source, please use streaming or try another server.");
    }
  };

  const handleStartDownload = async (opt: any) => {
    setIsDownloading(true);
    try {
      if (opt.type === "stream_fallback") {
        setDownloadProgress("Opening stream link in browser download manager...");
        window.open(opt.url, "_blank");
      } else {
        setDownloadProgress("Initiating direct download stream...");
        const titleClean = (meta?.title || meta?.name || "NightCast_Movie").replace(/[^a-zA-Z0-9]/g, "_");
        const filename = type === 'tv'
          ? `${titleClean}_S${currentSeason}E${currentEpisode}.mp4`
          : `${titleClean}.mp4`;

        const downloadProxyUrl = `${API_BASE_URL}/api/v1/tmdb/download-proxy?url=${encodeURIComponent(opt.url)}&filename=${encodeURIComponent(filename)}`;

        const a = document.createElement("a");
        a.href = downloadProxyUrl;
        a.download = filename;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setDownloadProgress("Download started! Check your browser downloads.");
      }
    } catch (err: any) {
      setDownloadProgress("Failed to trigger download: " + err.message);
    } finally {
      setTimeout(() => setIsDownloading(false), 3000);
    }
  };

  const movieTitle = meta?.title || meta?.name || "Loading Stream...";
  const releaseYear = meta?.release_date || meta?.first_air_date
    ? new Date(meta.release_date || meta.first_air_date).getFullYear().toString() : "2026";

  const seasons = meta?.seasons || [{"season_number": 1, "episode_count": 8, "name": "Season 1"}];
  const selectedSeasonData = seasons.find((s: any) => s.season_number === currentSeason) || seasons[0];
  const episodesCount = selectedSeasonData?.episode_count || 8;

  return (
    <div className="min-h-screen max-w-7xl mx-auto pt-20 pb-28 px-6 md:px-12 relative select-none bg-[#090A0F] text-white">
      <div className="space-y-6">
        {/* Full Player Container */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-[#000000] shadow-2xl">
          {!isIframeLoaded && !streamErrorMsg && (
            <div className="absolute inset-0 z-20">
              <PlayerSkeleton />
            </div>
          )}

          {streamErrorMsg && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#090A0F]/90 backdrop-blur-md p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-amber-400" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-extrabold text-white font-display">
                  {activeServer?.language === 'hi' ? 'Hindi Stream Unavailable' : 'Stream Unavailable'}
                </h3>
                <p className="text-xs text-white/60">
                  {streamErrorMsg}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {activeServer?.language === 'hi' && (
                  <button
                    onClick={() => {
                      const altHi = servers.find(s => (s.id.includes('hindi-dub') || s.language === 'hi') && s.id !== activeServerId);
                      if (altHi) {
                        setActiveServerId(altHi.id);
                      } else {
                        const main = servers.find(s => s.id === 'vidsrc-main') || servers[0];
                        if (main) setActiveServerId(main.id);
                      }
                      setStreamErrorMsg(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Try Hindi Fallback Server</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    const mainSrv = servers.find(s => s.id === 'vidsrc-main') || servers[0];
                    if (mainSrv) setActiveServerId(mainSrv.id);
                    setStreamErrorMsg(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Switch to Main Server</span>
                </button>
              </div>
            </div>
          )}

          {playerUrl ? (
            activeServer?.type === 'hls' ? (
              <HLSPlayer
                src={playerUrl}
                headers={activeServer.headers}
                startAt={resumeTime}
                onProgress={handlePlayerProgress}
                poster={meta?.backdrop_path ? `https://image.tmdb.org/t/p/original${meta.backdrop_path}` : undefined}
                onError={() => {
                  if (activeServer?.id) {
                    setHlsFailedServers(prev => [...prev, activeServer.id]);
                    if (activeServer.language === 'hi') {
                      setStreamErrorMsg("Hindi stream unavailable on this server, please try another server.");
                    } else {
                      setStreamErrorMsg("Stream failed to load. Please try another server.");
                    }
                  }
                }}
              />
            ) : (
              <iframe
                src={playerUrl}
                onLoad={() => setIsIframeLoaded(true)}
                onError={() => {
                  if (activeServer?.language === 'hi') {
                    setStreamErrorMsg("Hindi stream unavailable, please try another server.");
                  } else {
                    setStreamErrorMsg("Failed to load iframe stream.");
                  }
                }}
                className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${
                  isIframeLoaded && !streamErrorMsg ? 'opacity-100' : 'opacity-0'
                }`}
                allowFullScreen
                frameBorder="0"
                referrerPolicy="origin"
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            )
          ) : (
            <PlayerSkeleton />
          )}
        </div>

        {/* Server & Audio Selector Bar */}
        <div className="p-5 bg-[#12141F] border border-white/10 rounded-2xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>NIGHTCAST STREAM ENGINE</span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight font-display text-white">
              {movieTitle} <span className="text-white/50 font-normal text-base">({releaseYear})</span>
            </h1>
          </div>

          {/* Audio Dub Language Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10">
              <button
                onClick={() => setLanguagePref('all')}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${
                  languagePref === 'all' ? 'bg-[#00D2FF] text-black shadow-md' : 'text-white/70 hover:text-white'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>All</span>
              </button>
              <button
                onClick={() => setLanguagePref('hi')}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${
                  languagePref === 'hi' ? 'bg-orange-500 text-white shadow-md' : 'text-white/70 hover:text-white'
                }`}
              >
                <span>🇮🇳 Hindi Dubbed</span>
              </button>
              <button
                onClick={() => setLanguagePref('regional')}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${
                  languagePref === 'regional' ? 'bg-purple-500 text-white shadow-md' : 'text-white/70 hover:text-white'
                }`}
              >
                <span>🎭 Regional Dubbed</span>
              </button>
              <button
                onClick={() => setLanguagePref('en')}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${
                  languagePref === 'en' ? 'bg-blue-600 text-white shadow-md' : 'text-white/70 hover:text-white'
                }`}
              >
                <span>🇬🇧 English</span>
              </button>
            </div>

            {/* Server List Pills */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-full bg-white/5 border border-white/10">
              {servers.map((srv) => {
                const isActive = srv.id === activeServerId;
                return (
                  <button
                    key={srv.id}
                    onClick={() => setActiveServerId(srv.id)}
                    className={isActive ? "gtv-tab-pill-active text-[10px]" : "gtv-tab-pill text-[10px]"}
                  >
                    {srv.name}
                  </button>
                );
              })}
            </div>

            {/* Direct Download Button */}
            <button
              onClick={handleOpenDownloadModal}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition-all transform hover:scale-105 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Offline</span>
            </button>
          </div>
        </div>

        {/* Download Options Modal */}
        {isDownloadModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#12141F] border border-white/15 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95">
              <button
                onClick={() => setIsDownloadModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <DownloadCloud className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white font-display">Download Movie / Episode</h3>
                  <p className="text-xs text-white/50">Save for offline viewing directly on your device</p>
                </div>
              </div>

              {downloadProgress && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-300 flex items-center gap-2">
                  {isDownloading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  <span>{downloadProgress}</span>
                </div>
              )}

              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pt-1">
                {downloadOptions.length > 0 ? (
                  downloadOptions.map((opt, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate">{opt.label}</h4>
                        <p className="text-[10px] text-white/50 uppercase font-mono">{opt.quality} • {opt.format.toUpperCase()}</p>
                      </div>
                      <button
                        disabled={isDownloading}
                        onClick={() => handleStartDownload(opt)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-transform active:scale-95 shrink-0 flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-white/50 text-xs font-medium space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
                    <p>Fetching direct download streams...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TV Season & Episode Selector */}
        {type === 'tv' && (
          <section className="space-y-5 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-extrabold font-display">Episodes</h3>
                <p className="text-[10px] text-white/50 font-medium uppercase">Select Chapter</p>
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
                  <div key={i} className="p-3.5 rounded-2xl border border-white/10 bg-white/5 animate-pulse h-16" />
                ))
              ) : seasonEpisodes.length > 0 ? (
                seasonEpisodes.map((ep: any) => {
                  const isActive = ep.episode_number === currentEpisode;
                  return (
                    <button key={ep.episode_number} onClick={() => handleEpisodeChange(currentSeason, ep.episode_number)}
                      className={`group text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3 ${
                        isActive
                          ? 'bg-white text-black font-extrabold border-white shadow-lg'
                          : 'border-white/10 bg-[#12141F] text-white/80 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-black text-white' : 'bg-white/10 group-hover:bg-white group-hover:text-black text-white'
                      }`}>
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[9px] font-bold uppercase ${isActive ? 'text-black' : 'text-white/50'}`}>
                          EPISODE {ep.episode_number}
                        </p>
                        <h4 className="text-xs font-bold truncate">{ep.name || `Episode ${ep.episode_number}`}</h4>
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
                      className={`group text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3 ${
                        isActive
                          ? 'bg-white text-black font-extrabold border-white shadow-lg'
                          : 'border-white/10 bg-[#12141F] text-white/80 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-black text-white' : 'bg-white/10 group-hover:bg-white group-hover:text-black text-white'
                      }`}>
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[9px] font-bold uppercase ${isActive ? 'text-black' : 'text-white/50'}`}>
                          EPISODE {epNum}
                        </p>
                        <h4 className="text-xs font-bold truncate">Chapter {epNum}</h4>
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
          <section className="space-y-4 pt-6 border-t border-white/10">
            <h3 className="font-display text-lg font-extrabold text-white">Cast Showcase</h3>
            <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
              {meta.cast.map((c: any, idx: number) => {
                const avatar = ImageService.getProfile(c.profile_path, c.name);
                return (
                  <div key={idx} className="flex flex-col items-center shrink-0 w-24 gap-2 text-center">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden border border-white/15">
                      <Image src={avatar} alt={c.name} fill sizes="56px" className="object-cover" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white truncate max-w-[85px]">{c.name}</p>
                      <p className="text-[10px] text-white/50 truncate max-w-[85px]">{c.character}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Live TMDB Recommendations Row */}
        {recommendations.length > 0 && (
          <div className="pt-6 border-t border-white/10">
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
