from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any
from services.stream_extractor import stream_extractor, fetch_dual_audio_manifest

router = APIRouter(prefix="/streams", tags=["streams"])


@router.get("/resolve/{tmdb_id}")
async def resolve_stream(
    tmdb_id: str,
    season: int = Query(1, ge=1),
    episode: int = Query(1, ge=1),
    media_type: str = Query("tv", description="tv or movie")
):
    """Resolve raw HLS manifest URL or fallback iframe for multi-language streaming."""
    try:
        stream_data = await fetch_dual_audio_manifest(
            tmdb_id=tmdb_id,
            season=season,
            episode=episode,
            media_type=media_type
        )
        return {"status": "success", "data": stream_data}
    except Exception as e:
        return {
            "status": "fallback",
            "data": {
                "type": "iframe",
                "url": f"https://vidsrc.xyz/embed/{media_type}?tmdb={tmdb_id}" + (f"&season={season}&episode={episode}" if media_type == "tv" else ""),
                "multilingual": False,
                "error": str(e)
            }
        }
