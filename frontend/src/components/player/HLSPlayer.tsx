"use client";

import React from "react";
import NightCastPlayer from "./NightCastPlayer";

export interface HLSPlayerProps {
  src: string;
  headers?: Record<string, string>;
  startAt?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  poster?: string;
  onError?: () => void;
  selectedAudioTrack?: number;
  onAudioTracksChange?: (tracks: Array<{ id: number; name: string; lang?: string }>, currentTrackId: number) => void;
  onAudioTrackSelect?: (trackId: number) => void;
}

export default function HLSPlayer({
  src,
  startAt = 0,
  onProgress,
  poster,
  onError,
}: HLSPlayerProps) {
  return (
    <NightCastPlayer
      streamUrl={src}
      isHls={true}
      startAt={startAt}
      onProgress={onProgress}
      poster={poster}
      onError={onError}
    />
  );
}
