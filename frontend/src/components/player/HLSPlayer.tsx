"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  RotateCcw, Loader2, AlertTriangle, SkipForward, SkipBack
} from 'lucide-react';

interface HLSPlayerProps {
  src: string;
  headers?: Record<string, string>;
  startAt?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  poster?: string;
  onError?: () => void;
}

export default function HLSPlayer({ src, headers, startAt = 0, onProgress, poster, onError }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Trigger parent onError hook when error state changes
  useEffect(() => {
    if (error) {
      onError?.();
    }
  }, [error, onError]);

  // Initialize HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setIsLoading(true);
    setError(null);

    const initHls = async () => {
      // Dynamically import hls.js to avoid SSR issues
      const Hls = (await import('hls.js')).default;

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          startPosition: startAt || -1,
          xhrSetup: (xhr: XMLHttpRequest) => {
            if (headers) {
              Object.entries(headers).forEach(([key, value]) => {
                try { xhr.setRequestHeader(key, value); } catch (e) { /* skip */ }
              });
            }
          },
        });

        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          if (startAt > 0) {
            video.currentTime = startAt;
          }
        });

        hls.on(Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('HLS network error, attempting recovery...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('HLS media error, attempting recovery...');
                hls.recoverMediaError();
                break;
              default:
                setError('Stream failed to load. The source may be unavailable.');
                hls.destroy();
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS support
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          if (startAt > 0) video.currentTime = startAt;
        });
      } else {
        setError('HLS playback is not supported in this browser.');
      }
    };

    initHls();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onDurationChange = () => setDuration(video.duration || 0);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onError = () => setError('Playback error occurred.');

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('error', onError);
    };
  }, []);

  // Progress reporting
  useEffect(() => {
    progressIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused && onProgress) {
        onProgress(video.currentTime, video.duration || 0);
      }
    }, 5000);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [onProgress]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          resetControlsTimeout();
          break;
        case 'arrowright':
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
          resetControlsTimeout();
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(v => { const nv = Math.min(1, v + 0.1); video.volume = nv; return nv; });
          resetControlsTimeout();
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(v => { const nv = Math.max(0, v - 0.1); video.volume = nv; return nv; });
          resetControlsTimeout();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, resetControlsTimeout]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(console.error);
      setHasStarted(true);
    } else {
      video.pause();
    }
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const bar = seekBarRef.current;
    if (!video || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * duration;
    resetControlsTimeout();
  }, [duration, resetControlsTimeout]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
    video.muted = val === 0;
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    // Re-trigger the src effect by forcing a re-render
    const video = videoRef.current;
    if (video) {
      video.src = '';
      // The useEffect on src will handle re-initialization
      setTimeout(() => {
        const event = new Event('retry');
        window.dispatchEvent(event);
      }, 100);
    }
  }, []);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferProgress = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black group cursor-pointer select-none"
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
      onClick={(e) => {
        // Only toggle play if clicking the video area, not controls
        if ((e.target as HTMLElement).closest('[data-controls]')) return;
        togglePlay();
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        poster={poster}
        preload="auto"
      />

      {/* Loading Spinner */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-[#00D2FF]/20 border-t-[#00D2FF] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[#00D2FF] font-black text-xs tracking-widest">N</span>
              </div>
            </div>
            <p className="text-white/60 text-xs font-medium tracking-wider uppercase">Initializing Stream...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm mb-1">Stream Unavailable</p>
              <p className="text-white/50 text-xs">{error}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleRetry(); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00D2FF]/10 border border-[#00D2FF]/30 text-[#00D2FF] text-xs font-bold tracking-wider uppercase hover:bg-[#00D2FF]/20 transition-all duration-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Play Button Overlay (before first play) */}
      {!hasStarted && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="w-20 h-20 rounded-full bg-[#00D2FF]/15 border border-[#00D2FF]/40 flex items-center justify-center backdrop-blur-xl hover:bg-[#00D2FF]/25 hover:scale-110 transition-all duration-300 shadow-[0_0_40px_rgba(0,210,255,0.3)]"
          >
            <Play className="w-8 h-8 text-[#00D2FF] fill-[#00D2FF] ml-1" />
          </button>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        data-controls
        className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        {/* Gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

        <div className="relative px-4 pb-4 pt-12">
          {/* Seek Bar */}
          <div
            ref={seekBarRef}
            className="group/seek w-full h-1.5 bg-white/10 rounded-full cursor-pointer mb-3 relative hover:h-2.5 transition-all duration-200"
            onClick={handleSeek}
          >
            {/* Buffer progress */}
            <div
              className="absolute top-0 left-0 h-full bg-white/20 rounded-full pointer-events-none"
              style={{ width: `${bufferProgress}%` }}
            />
            {/* Play progress */}
            <div
              className="absolute top-0 left-0 h-full bg-[#00D2FF] rounded-full pointer-events-none shadow-[0_0_10px_rgba(0,210,255,0.5)]"
              style={{ width: `${progress}%` }}
            />
            {/* Seek thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-[#00D2FF] rounded-full shadow-lg opacity-0 group-hover/seek:opacity-100 transition-opacity duration-200 pointer-events-none"
              style={{ left: `calc(${progress}% - 7px)` }}
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between gap-3">
            {/* Left controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-white fill-white" />
                ) : (
                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                }}
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-all duration-200"
              >
                <SkipBack className="w-3.5 h-3.5 text-white/70" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
                }}
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-all duration-200"
              >
                <SkipForward className="w-3.5 h-3.5 text-white/70" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1.5 group/vol">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-all duration-200"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-white/70" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-white/70" />
                  )}
                </button>
                <input
                  type="range"
                  min="0" max="1" step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  onClick={(e) => e.stopPropagation()}
                  className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-300 accent-[#00D2FF] h-1 cursor-pointer"
                />
              </div>

              {/* Time */}
              <span className="text-white/60 text-[11px] font-mono tracking-tight ml-1">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200"
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4 text-white/80" />
                ) : (
                  <Maximize className="w-4 h-4 text-white/80" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
