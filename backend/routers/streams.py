from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any
from providers.local_provider import LocalMediaProvider
from services.stream_extractor import fetch_dual_audio_manifest

router = APIRouter(prefix="/streams", tags=["Streams"])
provider = LocalMediaProvider()


@router.get("/{media_type}/{content_id}")
async def get_stream_manifest(media_type: str, content_id: str):
    """Retrieve normalized PlaybackResponse with manifest URL and explicit multi-language audio tracks."""
    playback_data = await provider.resolve_playback(content_id, media_type)
    if not playback_data:
        raise HTTPException(status_code=404, detail="Playback source not found")
    return playback_data


@router.get("/resolve/{tmdb_id}")
async def resolve_stream(
    tmdb_id: str,
    season: int = Query(1, ge=1),
    episode: int = Query(1, ge=1),
    media_type: str = Query("tv", description="tv or movie")
):
    """Resolve raw HLS manifest URL or active mirror fallback iframe for multi-language streaming."""
    try:
        stream_data = await fetch_dual_audio_manifest(
            tmdb_id=tmdb_id,
            season=season,
            episode=episode,
            media_type=media_type
        )
        return {"status": "success", "data": stream_data}
    except Exception as e:
        fallback_url = (
            f"https://vidsrc.me/embed/tv?tmdb={tmdb_id}&season={season}&episode={episode}"
            if media_type == "tv"
            else f"https://vidsrc.me/embed/movie?tmdb={tmdb_id}"
        )
        return {
            "status": "fallback",
            "data": {
                "type": "iframe",
                "url": fallback_url,
                "multilingual": False,
                "error": str(e)
            }
        }
