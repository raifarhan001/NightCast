"use client";
import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const rawUrl = playbackData?.manifest_url || streamUrl || "";
  const [currentAudio, setCurrentAudio] = useState<number | string>("en");
  
  const isEmbedUrl = rawUrl.includes("embed") || rawUrl.includes("iframe") || rawUrl.includes("vidsrc") || rawUrl.includes("autoembed") || rawUrl.includes("vidbolt");
  const isEffectiveHls = (playbackData?.type === "hls" || isHls) && !isEmbedUrl && rawUrl.includes(".m3u8");

  const [audioTracks, setAudioTracks] = useState<AudioTrackData[]>(() => {
    return playbackData?.audio_tracks || [
      { id: "en", language: "en", label: "English / Original", default: true },
      { id: "hi", language: "hi", label: "Hindi Dubbed", default: false }
    ];
  });
  const [statusText, setStatusText] = useState("INITIALIZING STREAM...");

  const effectiveUrl = React.useMemo(() => {
    if (!rawUrl) return "";
    if (isEmbedUrl && currentAudio === "hi") {
      return rawUrl.includes("?") ? `${rawUrl}&ds_lang=hi` : `${rawUrl}?ds_lang=hi`;
    }
    return rawUrl;
  }, [rawUrl, isEmbedUrl, currentAudio]);

  useEffect(() => {
    if (playbackData?.audio_tracks && playbackData.audio_tracks.length > 0) {
      setAudioTracks(playbackData.audio_tracks);
    }
  }, [playbackData]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !effectiveUrl) return;

    let hls: Hls | null = null;

    if (isEffectiveHls && Hls.isSupported()) {
      setStatusText("INITIALIZING STREAM...");
      hls = new Hls({ debug: false, enableWorker: true });
      hls.loadSource(effectiveUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setStatusText("");
        if (startAt > 0) {
          video.currentTime = startAt;
        }

        if (hls && hls.audioTracks && hls.audioTracks.length > 0) {
          const parsedTracks: AudioTrackData[] = hls.audioTracks.map((t: any, idx: number) => ({
            id: idx,
            language: t.lang || "en",
            label: t.name || t.lang?.toUpperCase() || `Audio ${idx + 1}`
          }));
          setAudioTracks(parsedTracks);
          setCurrentAudio(hls.audioTrack);
        }

        video.play().catch(() => {
          console.log("Autoplay blocked, waiting for user interaction");
        });
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (event, data: any) => {
        if (data.audioTracks && data.audioTracks.length > 0) {
          const parsedTracks: AudioTrackData[] = data.audioTracks.map((t: any, idx: number) => ({
            id: idx,
            language: t.lang || "en",
            label: t.name || t.lang?.toUpperCase() || `Audio ${idx + 1}`
          }));
          setAudioTracks(parsedTracks);
          setCurrentAudio(hls?.audioTrack ?? 0);
        }
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (event, data: any) => {
        setCurrentAudio(data.id);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal && hls) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setStatusText("NETWORK ERROR - RETRYING...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setStatusText("STREAM UNAVAILABLE FREE SOURCE");
              onError?.();
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = effectiveUrl;
      setStatusText("");
    } else if (!isEffectiveHls) {
      setStatusText("");
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [effectiveUrl, isEffectiveHls, startAt, onError]);

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

  const handleAudioChange = (trackId: string | number, idx: number) => {
    if (hlsRef.current && typeof trackId === "number") {
      hlsRef.current.audioTrack = trackId;
      setCurrentAudio(trackId);
    } else if (hlsRef.current && hlsRef.current.audioTracks.length > idx) {
      hlsRef.current.audioTrack = idx;
      setCurrentAudio(trackId);
    } else {
      setCurrentAudio(trackId);
    }
  };

  if (!isEffectiveHls && effectiveUrl) {
    return (
      <div className="relative w-full h-full aspect-video bg-[#0D0E11] rounded-none overflow-hidden shadow-2xl border border-[#28292E]">
        <iframe
          src={effectiveUrl}
          className="w-full h-full border-0"
          allowFullScreen
          scrolling="no"
          title="NightCast Media Player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        />
        {audioTracks.length > 0 && (
          <div className="absolute top-4 right-4 z-20 flex gap-1.5 bg-[#18191D]/90 backdrop-blur-md p-1 rounded-none border border-[#28292E]">
            {audioTracks.map((track, idx) => {
              const isSelected = currentAudio === track.id || currentAudio === idx || (track.id === "hi" && currentAudio === "hi") || (track.id === "en" && currentAudio === "en");
              return (
                <button
                  key={track.id || idx}
                  onClick={() => handleAudioChange(track.id, idx)}
                  className={`px-3 py-1 text-xs rounded-none font-mono font-bold uppercase transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#FA0037] text-[#FFF3F3] shadow-md border border-[#FA0037]"
                      : "text-[#87878A] hover:text-white bg-[#121315] border border-transparent"
                  }`}
                >
                  {track.label || `Audio ${idx + 1} (${track.language || "Original"})`}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-[#0D0E11] rounded-none overflow-hidden shadow-2xl border border-[#28292E]">
      {statusText && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0D0E11]/90 z-10 text-[#FFF3F3] font-mono tracking-widest text-xs">
          <div className="flex flex-col items-center gap-2.5">
            <div className="w-8 h-8 border-2 border-[#FA0037] border-t-transparent rounded-full animate-spin"></div>
            <span>{statusText}</span>
          </div>
        </div>
      )}

      <video ref={videoRef} controls poster={poster} onEnded={onEnded} className="w-full h-full object-contain" />

      {audioTracks.length > 0 && (
        <div className="absolute top-4 right-4 z-20 flex gap-1.5 bg-[#18191D]/90 backdrop-blur-md p-1 rounded-none border border-[#28292E]">
          {audioTracks.map((track, idx) => {
            const isSelected = currentAudio === track.id || currentAudio === idx;
            return (
              <button
                key={track.id || idx}
                onClick={() => handleAudioChange(track.id, idx)}
                className={`px-3 py-1 text-xs rounded-none font-mono font-bold uppercase transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#FA0037] text-[#FFF3F3] shadow-md border border-[#FA0037]"
                    : "text-[#87878A] hover:text-white bg-[#121315] border border-transparent"
                }`}
              >
                {track.label || `Audio ${idx + 1} (${track.language || "Original"})`}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
