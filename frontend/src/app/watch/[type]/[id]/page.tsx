"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { apiFetch } from '../../../../lib/api';
import { Play, Activity, Cpu, Database, Network, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import { useUserStore } from '../../../../store/userStore';

export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activeProfile } = useUserStore();

  const type = Array.isArray(params.type) ? params.type[0] : params.type;
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [currentSeason, setCurrentSeason] = useState(() => parseInt(searchParams.get('season') || '1', 10));
  const [currentEpisode, setCurrentEpisode] = useState(() => parseInt(searchParams.get('episode') || '1', 10));

  const [meta, setMeta] = useState<any>(null);
  const [playerUrl, setPlayerUrl] = useState("");
  const [showHud, setShowHud] = useState(false);
  const [telemetry, setTelemetry] = useState({ ping: 0, lastEvent: 'None', eventsCount: 0 });
  const [seasonEpisodes, setSeasonEpisodes] = useState<any[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [selectedServer, setSelectedServer] = useState('server1');

  const eventTimeRef = useRef<number>(Date.now());

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
    if (!id) return;
    let startAtParam = "";
    try {
      const savedProgress = localStorage.getItem('vidLinkProgress');
      if (savedProgress) {
        const progressObj = JSON.parse(savedProgress);
        const entry = progressObj[id];
        const watched = entry?.watched ?? entry?.progress?.watched ?? 0;
        const seconds = Math.floor(watched);
        if (seconds > 10) startAtParam = `&startAt=${seconds}`;
      }
    } catch (e) { console.error(e); }

    let base: string;
    if (selectedServer === 'server2') {
      base = type === 'movie'
        ? `https://vidsrc.pro/embed/movie/${id}`
        : `https://vidsrc.pro/embed/tv/${id}/${currentSeason}/${currentEpisode}`;
    } else if (selectedServer === 'server3') {
      base = type === 'movie'
        ? `https://vidsrc.me/embed/movie/${id}`
        : `https://vidsrc.me/embed/tv/${id}/${currentSeason}/${currentEpisode}`;
    } else {
      base = type === 'movie'
        ? `https://vidlink.pro/movie/${id}`
        : `https://vidlink.pro/tv/${id}/${currentSeason}/${currentEpisode}`;
    }

    const customParams = selectedServer === 'server1'
      ? `?primaryColor=00D2FF&secondaryColor=020202&iconColor=00D2FF&icons=default&nextbutton=true${startAtParam}`
      : '';
    setPlayerUrl(`${base}${customParams}`);
  }, [id, type, currentSeason, currentEpisode, selectedServer]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://vidlink.pro') return;
      const now = Date.now();
      setTelemetry(prev => ({
        ping: now - eventTimeRef.current,
        lastEvent: event.data?.type || 'UNKNOWN',
        eventsCount: prev.eventsCount + 1
      }));
      eventTimeRef.current = now;

      if (event.data?.type === 'MEDIA_DATA') {
        try {
          const raw = localStorage.getItem('vidLinkProgress');
          const map = raw ? JSON.parse(raw) : {};
          map[id as string] = event.data.data;
          localStorage.setItem('vidLinkProgress', JSON.stringify(map));

          if (activeProfile && meta) {
            apiFetch('/api/progress/update', {
              method: 'POST',
              headers: { 'X-Profile-ID': activeProfile.id },
              body: JSON.stringify({
                mediaType: type, id: id,
                currentTime: event.data.data.watched || 0,
                duration: event.data.data.duration || 0,
                progress: event.data.data.progress || 0,
                season: type === 'tv' ? currentSeason : undefined,
                episode: type === 'tv' ? currentEpisode : undefined,
                event: 'progress',
                title: meta.title || meta.name || 'Movie',
                posterPath: meta.poster_path
              })
            }).catch(console.error);
          }
        } catch (e) { console.error(e); }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [id, activeProfile, meta, currentSeason, currentEpisode, type]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setShowHud(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);



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
    <div className="min-h-screen bg-black pt-20 pb-20 px-6 md:px-10 relative">
      {showHud && (
        <div className="fixed top-20 right-6 z-50 w-80 bg-black/95 backdrop-blur-2xl border border-cyan/20 rounded-2xl p-5 shadow-glow-cyan animate-fade-in text-xs font-mono space-y-4">
          <div className="flex items-center justify-between border-b border-glass-stroke pb-2">
            <span className="text-cyan font-black tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 animate-pulse-soft" />
              <span>DIAGNOSTICS</span>
            </span>
            <button onClick={() => setShowHud(false)} className="text-nexus-dim hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-nexus-dim">TMDB ID:</span><span className="text-white font-bold">{id}</span></div>
            <div className="flex justify-between"><span className="text-nexus-dim">MEDIA TYPE:</span><span className="text-white font-bold uppercase">{type}</span></div>
            {type === 'tv' && <div className="flex justify-between"><span className="text-nexus-dim">COORDINATES:</span><span className="text-cyan font-bold">S{currentSeason} E{currentEpisode}</span></div>}
            <div className="flex justify-between"><span className="text-nexus-dim">SOURCE:</span><span className={`font-bold ${selectedServer === 'server3' ? 'text-orange-400' : 'text-cyan'}`}>{selectedServer === 'server3' ? 'VidSrc (Hindi)' : selectedServer === 'server2' ? 'VidSrc Pro (Backup)' : 'VidLink (Primary)'}</span></div>
            <div className="flex justify-between"><span className="text-nexus-dim">RTT:</span><span className="text-emerald-400 font-bold">{telemetry.ping}ms</span></div>
            <div className="flex justify-between"><span className="text-nexus-dim">LAST EVENT:</span><span className="text-amber-400 font-bold">{telemetry.lastEvent}</span></div>
            <div className="flex justify-between"><span className="text-nexus-dim">LIFECYCLE:</span><span className="text-white font-bold">{telemetry.eventsCount} events</span></div>
          </div>
          <div className="border-t border-glass-stroke pt-3 space-y-1.5 text-[10px]">
            <p className="text-nexus-dim uppercase tracking-wider font-black text-[8px] mb-1">Endpoint URL</p>
            <textarea readOnly value={playerUrl} className="w-full h-12 bg-white/[0.03] border border-glass-stroke rounded-lg p-1.5 text-zinc-300 resize-none focus:outline-none text-[9px]" />
          </div>
          <div className="border-t border-glass-stroke pt-3 grid grid-cols-3 gap-2 text-[9px] text-center">
            <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg"><Database className="w-3 h-3 mx-auto mb-0.5" />DB</div>
            <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg"><Cpu className="w-3 h-3 mx-auto mb-0.5" />CACHE</div>
            <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg"><Network className="w-3 h-3 mx-auto mb-0.5" />TMDB</div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="relative aspect-video w-full rounded-none sm:rounded-xl overflow-hidden border border-glass-stroke bg-black shadow-2xl shadow-cyan/5">
          {playerUrl ? (
            <iframe src={playerUrl} className="absolute top-0 left-0 w-full h-full" allowFullScreen frameBorder="0" referrerPolicy="no-referrer" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-nexus-dim text-sm">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-cyan border-t-transparent animate-spin" />
                <span>Preparing Secure Stream...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-white/[0.02] backdrop-blur-md rounded-3xl border border-glass-stroke flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.15em] text-cyan font-black mb-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-cyan animate-ping opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan" />
              </span>
              <span>Secure Stream</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
              {movieTitle} <span className="text-nexus-dim font-medium ml-1">({releaseYear})</span>
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button onClick={() => setShowHud(prev => !prev)}
                className="p-3.5 rounded-xl bg-white/[0.03] border border-glass-stroke hover:bg-white/[0.06] hover:text-cyan transition-all duration-300 animate-pulse-soft shrink-0"
                title="Toggle Diagnostics">
                <Activity className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
                <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 hidden md:inline select-none shrink-0">
                  Select Source:
                </label>
                <select
                  value={selectedServer}
                  onChange={(e) => setSelectedServer(e.target.value)}
                  className="bg-[#08080a]/80 backdrop-blur-md border border-white/10 text-zinc-200 hover:text-white rounded-xl px-4 py-2.5 text-xs font-bold tracking-wider uppercase cursor-pointer outline-none transition-all duration-300 focus:border-[#00D2FF] focus:shadow-[0_0_15px_rgba(0,210,255,0.2)] w-full sm:w-auto"
                >
                  <option value="server1" className="bg-[#020202] text-zinc-300">🌐 Server 1 (Main)</option>
                  <option value="server2" className="bg-[#020202] text-zinc-300">🌐 Server 2 (Backup)</option>
                  <option value="server3" className="bg-[#020202] text-white font-semibold border-t border-white/10">🎙️ Server 3 (Hindi Dubbed)</option>
                </select>
              </div>
            </div>

            <button onClick={() => window.open(playerUrl, '_blank')}
              className="py-2.5 px-4 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black tracking-widest text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-300 uppercase w-full sm:w-auto text-center shrink-0">
              Open External
            </button>
          </div>
        </div>

        {type === 'tv' && (
          <section className="space-y-6 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-glass-stroke pb-4">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white">Episodes</h3>
                <p className="text-[10px] text-nexus-muted font-bold tracking-widest uppercase">Chapter Guide</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {seasons.map((s: any) => (
                  <button key={s.season_number} onClick={() => handleEpisodeChange(s.season_number, 1)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 border ${
                      currentSeason === s.season_number
                        ? 'bg-cyan-muted border-cyan/30 text-cyan shadow-glow-cyan-sm'
                        : 'border-glass-stroke text-nexus-muted hover:text-white hover:bg-white/[0.03]'
                    }`}
                  >
                    {s.name || `Season ${s.season_number}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {episodesLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-glass-stroke bg-white/[0.02] animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3 w-20 bg-white/5 rounded" />
                        <div className="h-3 w-32 bg-white/[0.03] rounded" />
                      </div>
                    </div>
                  </div>
                ))
              ) : seasonEpisodes.length > 0 ? (
                seasonEpisodes.map((ep: any) => {
                  const isActive = ep.episode_number === currentEpisode;
                  return (
                    <button key={ep.episode_number} onClick={() => handleEpisodeChange(currentSeason, ep.episode_number)}
                      className={`group text-left p-4 rounded-2xl border transition-all duration-300 flex items-start gap-3 ${
                        isActive
                          ? 'bg-cyan-muted border-cyan/30 text-white shadow-glow-cyan-sm'
                          : 'border-glass-stroke text-nexus-muted hover:text-white hover:bg-white/[0.02] hover:border-white/10'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
                        isActive ? 'bg-cyan text-black' : 'bg-white/5 group-hover:bg-white/10 text-white'
                      }`}>
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isActive ? 'text-cyan' : 'text-nexus-dim'}`}>
                          Episode {ep.episode_number}
                        </p>
                        <h4 className="text-xs font-bold truncate">{ep.name || `Episode ${ep.episode_number}`}</h4>
                        {ep.overview && <p className="text-[10px] text-nexus-dim mt-1 line-clamp-2">{ep.overview}</p>}
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
                      className={`group text-left p-4 rounded-2xl border transition-all duration-300 flex items-start gap-3 ${
                        isActive
                          ? 'bg-cyan-muted border-cyan/30 text-white shadow-glow-cyan-sm'
                          : 'border-glass-stroke text-nexus-muted hover:text-white hover:bg-white/[0.02] hover:border-white/10'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
                        isActive ? 'bg-cyan text-black' : 'bg-white/5 group-hover:bg-white/10 text-white'
                      }`}>
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isActive ? 'text-cyan' : 'text-nexus-dim'}`}>
                          Episode {epNum}
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
      </div>
    </div>
  );
}
