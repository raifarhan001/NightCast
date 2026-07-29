from providers.base import PlaybackProvider
from models.playback import PlaybackResponse, AudioTrack


class LocalMediaProvider(PlaybackProvider):

    async def resolve_playback(self, content_id: str, media_type: str) -> PlaybackResponse:
        # Using an active and reliable streaming provider base instead of dead domains
        path_suffix = f"movie/{content_id}" if media_type == "movie" else f"tv/{content_id}"
        manifest_url = f"https://vidsrc.me/embed/{path_suffix}"

        return PlaybackResponse(
            content_id=content_id,
            type="hls",
            manifest_url=manifest_url,
            audio_tracks=[
                AudioTrack(id="en", language="en", label="English / Original", default=True),
                AudioTrack(id="hi", language="hi", label="Hindi Dubbed", default=False)
            ],
            subtitles=[]
        )
