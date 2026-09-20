"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Settings,
  RotateCcw,
  Check,
  Languages,
  Gauge,
  Sliders,
  AlertTriangle
} from "lucide-react";

export interface AudioTrackData {
  id: string | number;
  language?: string;
  label: string;
  default?: boolean;
}

export interface SubtitleTrackData {
  language: string;
  url: string;
}

export interface PlaybackData {
  content_id?: string;
  type?: string;
  manifest_url?: string;
  audio_tracks?: AudioTrackData[];
  subtitles?: SubtitleTrackData[];
}

interface PlayerProps {
  streamUrl?: string;
  isHls?: boolean;
  playbackData?: PlaybackData;
  poster?: string;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  startAt?: number;
  onError?: () => void;
}

/* Custom 10s Rewind Icon with centered "10" */
function Rewind10Icon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3.5 10 A 8.5 8.5 0 1 1 12 20.5 A 8.5 8.5 0 0 1 4.5 15" />
      <polyline points="1.5 8.5 3.8 11.5 6.8 8.5" />
      <text
        x="12"
        y="14.5"
        fontSize="7.5"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="currentColor"
        stroke="none"
        textAnchor="middle"
      >
        10
      </text>
    </svg>
  );
}

/* Custom 10s Forward Icon with centered "10" */
function Forward10Icon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20.5 10 A 8.5 8.5 0 1 0 12 20.5 A 8.5 8.5 0 0 0 19.5 15" />
      <polyline points="22.5 8.5 20.2 11.5 17.2 8.5" />
      <text
        x="12"
        y="14.5"
        fontSize="7.5"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="currentColor"
        stroke="none"
        textAnchor="middle"
      >
        10
      </text>
    </svg>
  );
}

/* Custom Picture-in-Picture Icon */
function PipIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <rect x="12" y="11" width="7.5" height="6" rx="1.5" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
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

export default function NightCastPlayer({
  streamUrl,
  isHls = true,
  playbackData,
  poster,
  onProgress,
  onEnded,
  startAt = 0,
  onError
}: PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const rawUrl = playbackData?.manifest_url || streamUrl || "";
  const isEmbedUrl =
    rawUrl.includes("embed") ||
    rawUrl.includes("iframe") ||
    rawUrl.includes("vidsrc") ||
    rawUrl.includes("autoembed") ||
    rawUrl.includes("vidbolt") ||
    rawUrl.includes("vidking");

  const isEffectiveHls = (playbackData?.type === "hls" || isHls) && !isEmbedUrl && (rawUrl.includes(".m3u8") || rawUrl.includes(".mp4"));

  // Core Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);

  // Scrubber & Seeking States
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [seekHoverTime, setSeekHoverTime] = useState<number | null>(null);
  const [seekHoverPos, setSeekHoverPos] = useState<number>(0);

  // Settings & Menu States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"main" | "quality" | "speed" | "audio">("main");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [qualityLevels, setQualityLevels] = useState<Array<{ id: number; label: string; height?: number }>>([]);
  const [currentQualityId, setCurrentQualityId] = useState<number>(-1); // -1 is Auto
  const [currentQualityLabel, setCurrentQualityLabel] = useState<string>("720p");

  // Audio Tracks
  const [audioTracks, setAudioTracks] = useState<AudioTrackData[]>(() => {
    return playbackData?.audio_tracks || [
      { id: "hi", language: "hi", label: "Hindi Dubbed (हिंदी)", default: true },
      { id: "en", language: "en", label: "English / Original", default: false }
    ];
  });
  const [currentAudio, setCurrentAudio] = useState<number | string>("en");

  // Reset & show controls on activity
  const handleUserActivity = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying && !isSettingsOpen) {
        setShowControls(false);
      }
    }, 3500);
  }, [isPlaying, isSettingsOpen]);

  // HLS / Video Stream Initializer
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !rawUrl) return;

    let hls: Hls | null = null;
    setIsLoading(true);
    setErrorMsg(null);

    if (isEffectiveHls && Hls.isSupported() && rawUrl.includes(".m3u8")) {
      hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60
      });

      hls.loadSource(rawUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsLoading(false);
        if (startAt > 0) {
          video.currentTime = startAt;
        }

        // Parse HLS Quality levels
        if (data.levels && data.levels.length > 0) {
          const parsed = data.levels.map((lvl, idx) => ({
            id: idx,
            label: lvl.height ? `${lvl.height}p` : `Level ${idx + 1}`,
            height: lvl.height
          }));
          setQualityLevels(parsed);
          const autoHeight = data.levels[0]?.height || 720;
          setCurrentQualityLabel(`${autoHeight}p`);
        }

        // Parse HLS Audio Tracks
        if (hls && hls.audioTracks && hls.audioTracks.length > 0) {
          const parsedTracks: AudioTrackData[] = hls.audioTracks.map((t: any, idx: number) => ({
            id: idx,
            language: t.lang || "en",
            label: t.name || (t.lang ? t.lang.toUpperCase() : `Audio ${idx + 1}`)
          }));
          setAudioTracks(parsedTracks);
          setCurrentAudio(hls.audioTrack);
        }

        video.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setIsPlaying(false);
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        if (hls && hls.levels && hls.levels[data.level]) {
          const lvl = hls.levels[data.level];
          setCurrentQualityLabel(lvl.height ? `${lvl.height}p` : "Auto");
        }
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
        setCurrentAudio(data.id);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              setErrorMsg("Playback error. Server source is currently unavailable.");
              onError?.();
              hls?.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else {
      // Direct MP4 or Apple Safari native HLS
      video.src = rawUrl;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        if (startAt > 0) video.currentTime = startAt;
        setCurrentQualityLabel("720p");
      });
      video.addEventListener("error", () => {
        setErrorMsg("Failed to load video stream.");
        onError?.();
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [rawUrl, isEffectiveHls, startAt, onError]);

  // Video Native Event Handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onTimeUpdate = () => {
      if (!isDraggingSeek) {
        setCurrentTime(video.currentTime);
      }
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onDurationChange = () => setDuration(video.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("ended", handleEnded);
    };
  }, [isDraggingSeek, onEnded]);

  // Periodic Progress Reporting for Continue Watching
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onProgress) return;

    const interval = setInterval(() => {
      if (!video.paused && video.duration > 0) {
        onProgress(video.currentTime, video.duration);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [onProgress]);

  // Fullscreen Detection
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Controls Actions
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
    handleUserActivity();
  }, [handleUserActivity]);

  const handleSkip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    video.currentTime = target;
    setCurrentTime(target);
    handleUserActivity();
  }, [handleUserActivity]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
      video.volume = volume > 0 ? volume : 1;
    } else {
      video.muted = true;
      setIsMuted(true);
    }
    handleUserActivity();
  }, [isMuted, volume, handleUserActivity]);

  const handleVolumeChange = useCallback((newVol: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(1, newVol));
    video.volume = clamped;
    setVolume(clamped);
    const mutedState = clamped === 0;
    video.muted = mutedState;
    setIsMuted(mutedState);
    handleUserActivity();
  }, [handleUserActivity]);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      container.requestFullscreen().catch(() => {});
    }
    handleUserActivity();
  }, [handleUserActivity]);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.warn("PiP not supported or rejected", e);
    }
    handleUserActivity();
  }, [handleUserActivity]);

  const handleSeekFromEvent = useCallback((clientX: number) => {
    const bar = seekBarRef.current;
    const video = videoRef.current;
    if (!bar || !video || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = pos * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const handleSeekMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDraggingSeek(true);
    handleSeekFromEvent(e.clientX);

    const onMouseMove = (moveEvt: MouseEvent) => {
      handleSeekFromEvent(moveEvt.clientX);
    };

    const onMouseUp = () => {
      setIsDraggingSeek(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [handleSeekFromEvent]);

  const handleSeekMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = seekBarRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setSeekHoverTime(pos * duration);
    setSeekHoverPos(e.clientX - rect.left);
  }, [duration]);

  const handleSeekMouseLeave = useCallback(() => {
    setSeekHoverTime(null);
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setIsSettingsOpen(false);
  }, []);

  const handleQualityChange = useCallback((levelId: number, label: string) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
    }
    setCurrentQualityId(levelId);
    setCurrentQualityLabel(label);
    setIsSettingsOpen(false);
  }, []);

  const handleAudioTrackChange = useCallback((trackId: number | string) => {
    if (hlsRef.current && typeof trackId === "number") {
      hlsRef.current.audioTrack = trackId;
    }
    setCurrentAudio(trackId);
    setIsSettingsOpen(false);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          handleSkip(-10);
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          handleSkip(10);
          break;
        case "arrowup":
          e.preventDefault();
          handleVolumeChange(volume + 0.1);
          break;
        case "arrowdown":
          e.preventDefault();
          handleVolumeChange(volume - 0.1);
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "p":
          e.preventDefault();
          togglePip();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, handleSkip, handleVolumeChange, volume, toggleMute, toggleFullscreen, togglePip]);

  // Calculate percentages
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  // Fallback for third-party iframe embeds
  if (!isEffectiveHls && rawUrl) {
    return (
      <div className="relative w-full h-full aspect-video bg-[#0A0F11] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <iframe
          src={rawUrl}
          className="w-full h-full border-0"
          allowFullScreen
          scrolling="no"
          title="NightCast Media Player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        />
        {audioTracks.length > 0 && (
          <div className="absolute top-4 right-4 z-20 flex gap-1.5 bg-black/80 backdrop-blur-md p-1 rounded-full border border-white/10">
            {audioTracks.map((track, idx) => {
              const isSelected =
                currentAudio === track.id ||
                currentAudio === idx ||
                (track.id === "hi" && currentAudio === "hi") ||
                (track.id === "en" && currentAudio === "en");
              return (
                <button
                  key={track.id || idx}
                  onClick={() => setCurrentAudio(track.id)}
                  className={`px-3 py-1 text-xs rounded-full font-sans font-bold uppercase transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#22C55E] text-black shadow-md font-extrabold"
                      : "text-white/70 hover:text-white bg-transparent"
                  }`}
                >
                  {track.label || `Audio ${idx + 1}`}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onMouseLeave={() => {
        if (isPlaying && !isSettingsOpen) setShowControls(false);
      }}
      className="relative w-full h-full aspect-video bg-black rounded-2xl overflow-hidden select-none group cursor-pointer shadow-[0_25px_60px_rgba(0,0,0,0.9)]"
      onClick={(e) => {
        // Prevent click if clicking controls or menus
        if ((e.target as HTMLElement).closest("[data-player-ui]")) return;
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
          toggleFullscreen();
        } else {
          clickTimerRef.current = setTimeout(() => {
            togglePlay();
            clickTimerRef.current = null;
          }, 240);
        }
      }}
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        playsInline
        poster={poster}
        preload="auto"
      />

      {/* Buffering Spinner */}
      {isLoading && !errorMsg && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px] z-20 pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full border-3 border-[#22C55E]/20 border-t-[#22C55E] animate-spin shadow-[0_0_20px_rgba(34,197,94,0.4)]" />
            <span className="text-white/80 font-mono text-xs tracking-wider uppercase">Loading Stream...</span>
          </div>
        </div>
      )}

      {/* Fatal Error State */}
      {errorMsg && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-30 p-6">
          <div className="flex flex-col items-center gap-3 max-w-md text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-white font-bold text-sm">Stream Error</p>
            <p className="text-white/60 text-xs">{errorMsg}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setErrorMsg(null);
                setIsLoading(true);
                if (videoRef.current) {
                  videoRef.current.load();
                  videoRef.current.play().catch(() => {});
                }
              }}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Playback</span>
            </button>
          </div>
        </div>
      )}

      {/* Initial Center Play Button (Before first play or while paused) */}
      {!isPlaying && !isLoading && !errorMsg && (
        <div
          data-player-ui
          className="absolute inset-0 flex items-center justify-center z-15 pointer-events-none"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-[0_0_35px_rgba(0,0,0,0.8)] pointer-events-auto hover:scale-108 active:scale-95 transition-all cursor-pointer group/center"
            title="Play"
          >
            <Play className="w-8 h-8 fill-white text-white ml-1 group-hover/center:scale-110 transition-transform" />
          </button>
        </div>
      )}

      {/* Top Title Overlay (Subtle) */}
      <div
        data-player-ui
        className={`absolute top-0 left-0 right-0 p-5 bg-gradient-to-b from-black/80 via-black/20 to-transparent z-25 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-white/90 text-xs font-semibold tracking-wide font-sans">
              NightCast Player
            </span>
          </div>
        </div>
      </div>

      {/* Modern Player Controls Overlay matching Reference Screenshot */}
      <div
        data-player-ui
        className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
        }`}
      >
        {/* Soft Vignette Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none h-36 -top-12" />

        <div className="relative px-4 sm:px-6 pb-4 pt-4 flex flex-col gap-3">
          {/* Top Row: Neon Green Scrubber Bar + Right-aligned Time */}
          <div className="w-full flex flex-col gap-1.5">
            {/* Scrubber Bar Line */}
            <div
              ref={seekBarRef}
              onMouseDown={handleSeekMouseDown}
              onMouseMove={handleSeekMouseMove}
              onMouseLeave={handleSeekMouseLeave}
              className="relative w-full h-3 flex items-center cursor-pointer group/scrub"
            >
              {/* Background Track */}
              <div className="w-full h-[3.5px] group-hover/scrub:h-[5px] bg-white/25 rounded-full overflow-hidden transition-all duration-150">
                {/* Buffer Track */}
                <div
                  className="h-full bg-white/40 transition-all duration-200 pointer-events-none"
                  style={{ width: `${bufferPercent}%` }}
                />
              </div>

              {/* Played Neon Green Bar */}
              <div
                className="absolute top-1/2 -translate-y-1/2 left-0 h-[3.5px] group-hover/scrub:h-[5px] bg-[#22C55E] rounded-full shadow-[0_0_12px_rgba(34,197,94,0.8)] pointer-events-none transition-all duration-75"
                style={{ width: `${progressPercent}%` }}
              />

              {/* Scrubber White Circular Thumb Knob (matching screenshot) */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none transition-transform group-hover/scrub:scale-125"
                style={{ left: `calc(${progressPercent}% - 7px)` }}
              />

              {/* Hover Timestamp Tooltip */}
              {seekHoverTime !== null && (
                <div
                  className="absolute bottom-5 -translate-x-1/2 px-2 py-1 bg-black/90 backdrop-blur-md border border-white/20 text-white text-[10px] font-mono rounded shadow-lg pointer-events-none"
                  style={{ left: `${seekHoverPos}px` }}
                >
                  {formatPlayerTime(seekHoverTime)}
                </div>
              )}
            </div>

            {/* Right Aligned Time Counter (00:01 / 38:35) */}
            <div className="w-full flex justify-end">
              <span className="text-white/90 text-xs sm:text-[13px] font-mono tracking-tight select-none">
                {formatPlayerTime(currentTime)} / {formatPlayerTime(duration)}
              </span>
            </div>
          </div>

          {/* Bottom Row: Floating Dark Pill Capsule Container */}
          <div className="relative w-full flex items-center justify-between bg-[#0B1015]/90 backdrop-blur-xl border border-white/10 rounded-full px-3 sm:px-4 py-2 shadow-[0_15px_40px_rgba(0,0,0,0.85)]">
            {/* Left Controls: Play/Pause, Rewind 10s, Forward 10s, Volume + Inline Slider */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* White Solid Circle Play/Pause Button (matching screenshot) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer flex-shrink-0"
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-black text-black" />
                ) : (
                  <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                )}
              </button>

              {/* 10s Rewind Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkip(-10);
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 hover:bg-white/15 active:scale-90 flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer flex-shrink-0"
                title="Rewind 10s (←)"
              >
                <Rewind10Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              {/* 10s Forward Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkip(10);
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 hover:bg-white/15 active:scale-90 flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer flex-shrink-0"
                title="Forward 10s (→)"
              >
                <Forward10Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>

              {/* Volume Speaker Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 hover:bg-white/15 active:scale-90 flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer flex-shrink-0 ml-0.5"
                title={isMuted ? "Unmute (M)" : "Mute (M)"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-white/80" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4 text-white/80" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white/80" />
                )}
              </button>

              {/* Inline Volume Slider: Green Bar + White Round Thumb (matching screenshot) */}
              <div
                ref={volumeBarRef}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = (e.clientX - rect.left) / rect.width;
                  handleVolumeChange(pos);
                }}
                className="relative w-14 sm:w-20 h-4 flex items-center cursor-pointer group/vol"
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              >
                {/* Volume Track */}
                <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#22C55E] rounded-full transition-all duration-75"
                    style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                  />
                </div>
                {/* Volume Thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow pointer-events-none group-hover/vol:scale-125 transition-transform"
                  style={{ left: `calc(${(isMuted ? 0 : volume) * 100}% - 5px)` }}
                />
              </div>
            </div>

            {/* Right Controls: Settings with Quality Badge, PiP, Fullscreen */}
            <div className="flex items-center gap-2 sm:gap-2.5 relative">
              {/* Settings Gear Button with Green Quality Badge (720p / 1080p) */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSettingsOpen((prev) => !prev);
                    setSettingsTab("main");
                  }}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
                    isSettingsOpen ? "bg-white/20 text-white" : "bg-white/5 hover:bg-white/15 text-white/90"
                  }`}
                  title="Playback Settings & Quality"
                >
                  <Settings className="w-4 h-4" />

                  {/* Neon Green Badge (e.g. 720p or 1080p) matching screenshot */}
                  <span className="absolute -top-1.5 -right-1.5 bg-[#84cc16] text-black text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-md leading-tight select-none">
                    {currentQualityLabel}
                  </span>
                </button>

                {/* Settings Popup Menu */}
                {isSettingsOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-12 right-0 w-60 bg-[#0B1015]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] z-50 text-white animate-in fade-in slide-in-from-bottom-2 duration-200"
                  >
                    {settingsTab === "main" && (
                      <div className="flex flex-col gap-1">
                        <div className="px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-white/50 border-b border-white/10 mb-1">
                          Settings
                        </div>

                        {/* Quality Option */}
                        <button
                          onClick={() => setSettingsTab("quality")}
                          className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between hover:bg-white/10 text-xs font-sans font-medium transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Sliders className="w-3.5 h-3.5 text-[#22C55E]" />
                            <span>Quality</span>
                          </span>
                          <span className="text-white/60 font-mono text-[11px] bg-white/10 px-2 py-0.5 rounded-full">
                            {currentQualityLabel}
                          </span>
                        </button>

                        {/* Speed Option */}
                        <button
                          onClick={() => setSettingsTab("speed")}
                          className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between hover:bg-white/10 text-xs font-sans font-medium transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Gauge className="w-3.5 h-3.5 text-[#22C55E]" />
                            <span>Speed</span>
                          </span>
                          <span className="text-white/60 font-mono text-[11px] bg-white/10 px-2 py-0.5 rounded-full">
                            {playbackSpeed === 1 ? "Normal" : `${playbackSpeed}x`}
                          </span>
                        </button>

                        {/* Audio Track Option */}
                        {audioTracks.length > 0 && (
                          <button
                            onClick={() => setSettingsTab("audio")}
                            className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between hover:bg-white/10 text-xs font-sans font-medium transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Languages className="w-3.5 h-3.5 text-[#22C55E]" />
                              <span>Audio</span>
                            </span>
                            <span className="text-white/60 font-mono text-[11px] bg-white/10 px-2 py-0.5 rounded-full truncate max-w-24">
                              {typeof currentAudio === "number"
                                ? audioTracks[currentAudio]?.label || "Default"
                                : currentAudio === "hi"
                                ? "Hindi"
                                : "English"}
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Quality Selection Sub-menu */}
                    {settingsTab === "quality" && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between px-2.5 py-1 border-b border-white/10 mb-1">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-white/50">Quality</span>
                          <button
                            onClick={() => setSettingsTab("main")}
                            className="text-[10px] text-[#22C55E] hover:underline cursor-pointer"
                          >
                            Back
                          </button>
                        </div>
                        <div className="space-y-0.5 max-h-48 overflow-y-auto no-scrollbar">
                          {/* Auto Quality */}
                          <button
                            onClick={() => handleQualityChange(-1, "Auto")}
                            className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                              currentQualityId === -1
                                ? "bg-[#22C55E]/20 text-[#22C55E] font-bold"
                                : "hover:bg-white/10 text-white/80"
                            }`}
                          >
                            <span>Auto</span>
                            {currentQualityId === -1 && <Check className="w-3.5 h-3.5" />}
                          </button>

                          {(qualityLevels.length > 0
                            ? qualityLevels
                            : [
                                { id: 0, label: "1080p" },
                                { id: 1, label: "720p" },
                                { id: 2, label: "480p" },
                                { id: 3, label: "360p" }
                              ]
                          ).map((lvl) => (
                            <button
                              key={lvl.id}
                              onClick={() => handleQualityChange(lvl.id, lvl.label)}
                              className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                currentQualityLabel === lvl.label
                                  ? "bg-[#22C55E]/20 text-[#22C55E] font-bold"
                                  : "hover:bg-white/10 text-white/80"
                              }`}
                            >
                              <span>{lvl.label}</span>
                              {currentQualityLabel === lvl.label && <Check className="w-3.5 h-3.5" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Playback Speed Sub-menu */}
                    {settingsTab === "speed" && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between px-2.5 py-1 border-b border-white/10 mb-1">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-white/50">Speed</span>
                          <button
                            onClick={() => setSettingsTab("main")}
                            className="text-[10px] text-[#22C55E] hover:underline cursor-pointer"
                          >
                            Back
                          </button>
                        </div>
                        <div className="space-y-0.5">
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                            <button
                              key={spd}
                              onClick={() => handleSpeedChange(spd)}
                              className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                playbackSpeed === spd
                                  ? "bg-[#22C55E]/20 text-[#22C55E] font-bold"
                                  : "hover:bg-white/10 text-white/80"
                              }`}
                            >
                              <span>{spd === 1 ? "1.0x (Normal)" : `${spd}x`}</span>
                              {playbackSpeed === spd && <Check className="w-3.5 h-3.5" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audio Track Sub-menu */}
                    {settingsTab === "audio" && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between px-2.5 py-1 border-b border-white/10 mb-1">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-white/50">Audio Track</span>
                          <button
                            onClick={() => setSettingsTab("main")}
                            className="text-[10px] text-[#22C55E] hover:underline cursor-pointer"
                          >
                            Back
                          </button>
                        </div>
                        <div className="space-y-0.5 max-h-48 overflow-y-auto no-scrollbar">
                          {audioTracks.map((trk) => {
                            const isSelected = currentAudio === trk.id;
                            return (
                              <button
                                key={trk.id}
                                onClick={() => handleAudioTrackChange(trk.id)}
                                className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-[#22C55E]/20 text-[#22C55E] font-bold"
                                    : "hover:bg-white/10 text-white/80"
                                }`}
                              >
                                <span className="truncate">{trk.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Picture-in-Picture Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePip();
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 hover:bg-white/15 active:scale-90 flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer flex-shrink-0"
                title="Picture in Picture (P)"
              >
                <PipIcon className="w-4 h-4" />
              </button>

              {/* Fullscreen Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 hover:bg-white/15 active:scale-90 flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer flex-shrink-0"
                title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
