from pydantic import BaseModel
from typing import List, Literal, Optional


class AudioTrack(BaseModel):
    id: str
    language: str  # e.g., "en", "hi"
    label: str     # e.g., "English", "Hindi Dubbed"
    default: bool = False


class SubtitleTrack(BaseModel):
    language: str
    url: str


class PlaybackResponse(BaseModel):
    content_id: str
    type: Literal["hls", "dash", "mp4"]
    manifest_url: str
    audio_tracks: List[AudioTrack]
    subtitles: List[SubtitleTrack] = []
