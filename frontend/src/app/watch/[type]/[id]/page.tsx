"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { apiFetch } from '../../../../lib/api';
import { ImageService } from '../../../../lib/ImageService';
import { Play, Star } from 'lucide-react';
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
  const [servers, setServers] = useState<any[]>(() => {
    const defaultServers: any[] = [
      {
        id: 'vidsrc-main',
        name: 'VIDSRC (MAIN)',
        url: type === 'tv'
          ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${currentSeason}&episode=${currentEpisode}`
          : `https://vidsrc.me/embed/movie?tmdb=${id}`,
        type: 'iframe'
      },
      {
        id: 'vidlink-secondary',
        name: 'VIDLINK',
        url: type === 'tv'
          ? `https://vidlink.pro/tv/${id}/${currentSeason}/${currentEpisode}`
          : `https://vidlink.pro/movie/${id}`,
        type: 'iframe'
      },
      {
        id: 'english-dub',
        name: 'ENGLISH DUB',
        url: type === 'tv'
          ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${currentSeason}&episode=${currentEpisode}`
          : `https://vidsrc.me/embed/movie?tmdb=${id}`,
        type: 'iframe'
      },
      {
        id: 'hindi-dub',
        name: 'HINDI DUB',
        url: type === 'tv'
          ? `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${currentSeason}&e=${currentEpisode}&ds_lang=hi`
          : `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&ds_lang=hi`,
        type: 'iframe'
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

  useEffect(() => {
    setHlsFailedServers([]);
  }, [id, currentSeason, currentEpisode]);

  const rawActiveServer = servers.find(s => s.id === activeServerId) || servers[0];
  const isHlsFailed = rawActiveServer && hlsFailedServers.includes(rawActiveServer.id);

  const activeServer = useMemo(() => {
    if (!rawActiveServer) return null;
    if (isHlsFailed) {
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
  }, [rawActiveServer, isHlsFailed, type, id, currentSeason, currentEpisode]);

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
        if (data?.servers) {
          const filteredServers = data.servers.filter((s: any) => s.id !== 'vidsrc-pro');
          if (filteredServers.length > 0) {
            setServers(filteredServers);
          }
        }
      } catch (err) {
        console.error("Streams fetch error", err);
      }
    };
    fetchServers();
  }, [id, type, currentSeason, currentEpisode]);

  useEffect(() => {
    if (!activeServer?.url) return;

    let finalUrl = activeServer.url;

    if (finalUrl.includes('vidlink.pro')) {
      let startAtParam = "";
      try {
        const savedProgress = localStorage.getItem('vidLinkProgress');
        if (savedProgress) {
          const progressObj = JSON.parse(savedProgress);
          const key = type === 'tv' ? `${id}_s${currentSeason}e${currentEpisode}` : id;
          const entry = id ? progressObj[key as string] : null;
          const watched = entry?.watched ?? entry?.progress?.watched ?? 0;
          const seconds = Math.floor(watched);
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
  }, [activeServer, id, type, currentSeason, currentEpisode]);

  useEffect(() => {
    if (!id) return;
    try {
      const savedProgress = localStorage.getItem('vidLinkProgress');
      if (savedProgress) {
        const progressObj = JSON.parse(savedProgress);
        const key = type === 'tv' ? `${id}_s${currentSeason}e${currentEpisode}` : id;
        const entry = progressObj[key as string];
        const watched = entry?.watched ?? entry?.progress?.watched ?? 0;
        const seconds = Math.floor(watched);
        if (seconds > 10) {
          setResumeTime(seconds);
        } else {
          setResumeTime(0);
        }
      } else {
        setResumeTime(0);
      }
    } catch (e) {
      console.error(e);
      setResumeTime(0);
    }
  }, [id, activeServerId, currentSeason, currentEpisode, type]);

  const handlePlayerProgress = useCallback((currentTime: number, duration: number) => {
    if (!id) return;
    try {
      const raw = localStorage.getItem('vidLinkProgress');
      const map = raw ? JSON.parse(raw) : {};
      const key = type === 'tv' ? `${id}_s${currentSeason}e${currentEpisode}` : id;
      const progressData = {
        watched: currentTime,
        duration: duration,
        progress: duration > 0 ? (currentTime / duration) * 100 : 0
      };
      map[key as string] = progressData;
      localStorage.setItem('vidLinkProgress', JSON.stringify(map));

      if (activeProfile && meta) {
        apiFetch('/api/progress/update', {
          method: 'POST',
          headers: { 'X-Profile-ID': activeProfile.id },
          body: JSON.stringify({
            mediaType: type,
            id: id,
            currentTime: currentTime,
            duration: duration,
            progress: duration > 0 ? (currentTime / duration) * 100 : 0,
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
          {!isIframeLoaded && (
            <div className="absolute inset-0 z-20">
              <PlayerSkeleton />
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
                  }
                }}
              />
            ) : (
              <iframe
                src={playerUrl}
                onLoad={() => setIsIframeLoaded(true)}
                className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${
                  isIframeLoaded ? 'opacity-100' : 'opacity-0'
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

        {/* Server Selector Bar */}
        <div className="p-5 bg-[#12141F] border border-white/10 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>NIGHTCAST STREAM ENGINE</span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight font-display text-white">
              {movieTitle} <span className="text-white/50 font-normal text-base">({releaseYear})</span>
            </h1>
          </div>

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
        </div>

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
