"use client";
import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface PlayerProps {
  streamUrl: string;
  isHls: boolean;
  poster?: string;
  onProgress?: (currentTime: number, duration: number) => void;
  startAt?: number;
  onError?: () => void;
}

export default function NightCastPlayer({
  streamUrl,
  isHls,
  poster,
  onProgress,
  startAt = 0,
  onError
}: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [currentAudio, setCurrentAudio] = useState<number>(0);
  const [statusText, setStatusText] = useState("INITIALIZING STREAM...");

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    let hls: Hls | null = null;

    if (isHls && Hls.isSupported()) {
      setStatusText("INITIALIZING STREAM...");
      hls = new Hls({ debug: false, enableWorker: true });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setStatusText("");
        if (startAt > 0) {
          video.currentTime = startAt;
        }
        if (hls && hls.audioTracks && hls.audioTracks.length > 0) {
          setAudioTracks(hls.audioTracks);
          setCurrentAudio(hls.audioTrack);
        }
        video.play().catch(() => {
          console.log("Autoplay blocked, waiting for user interaction");
        });
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (event, data: any) => {
        if (data.audioTracks && data.audioTracks.length > 0) {
          setAudioTracks(data.audioTracks);
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
      video.src = streamUrl;
      setStatusText("");
    } else if (!isHls) {
      setStatusText("");
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, isHls, startAt, onError]);

  // Handle periodic progress save
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

  const handleAudioChange = (trackIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackIndex;
      setCurrentAudio(trackIndex);
    }
  };

  if (!isHls && streamUrl) {
    return (
      <iframe
        src={streamUrl}
        className="w-full h-full border-0"
        allowFullScreen
        scrolling="no"
        title="NightCast Media Player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      />
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
      {statusText && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 text-white font-mono tracking-widest text-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>{statusText}</span>
          </div>
        </div>
      )}

      <video ref={videoRef} controls poster={poster} className="w-full h-full object-contain" />

      {audioTracks.length > 0 && (
        <div className="absolute top-4 right-4 z-20 flex gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-white/10">
          {audioTracks.map((track, idx) => (
            <button
              key={idx}
              onClick={() => handleAudioChange(idx)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                currentAudio === idx
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-zinc-400 hover:text-white bg-white/5"
              }`}
            >
              {track.name || `Audio ${idx + 1} (${track.lang || "Original"})`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
