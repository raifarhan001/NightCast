from providers.base import PlaybackProvider
from models.playback import PlaybackResponse, AudioTrack, SubtitleTrack


class LocalMediaProvider(PlaybackProvider):

    async def resolve_playback(self, content_id: str, media_type: str) -> PlaybackResponse:
        # Returns structured manifest with explicit English & Hindi tracks
        path_suffix = f"movie/{content_id}" if media_type == "movie" else f"tv/{content_id}"
        return PlaybackResponse(
            content_id=content_id,
            type="hls",
            manifest_url=f"https://player.autoembed.cc/embed/{path_suffix}",
            audio_tracks=[
                AudioTrack(id="en", language="en", label="English / Original", default=True),
                AudioTrack(id="hi", language="hi", label="Hindi Dubbed", default=False)
            ],
            subtitles=[]
        )
