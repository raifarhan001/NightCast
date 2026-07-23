from fastapi import APIRouter, Query
from typing import List, Dict, Any
from services.tmdb_service import tmdb_client, MOCK_MOVIES, MOCK_TV

router = APIRouter(prefix="/tmdb", tags=["tmdb"])

@router.get("/discover")
@router.get("/discover/{media_type}")
async def discover(
    media_type: str = "movie",
    with_watch_providers: str = Query("", description="Pipe-delimited TMDB provider IDs e.g. 8|9|119"),
    watch_region: str = Query("US", description="ISO 3166-1 code"),
    with_genres: str = Query("", description="Comma or pipe delimited genre IDs"),
    with_original_language: str = Query("", description="Language codes e.g. hi"),
    page: int = Query(1, ge=1, le=500)
):
    try:
        params: Dict[str, Any] = {"page": page}
        if watch_region:
            params["watch_region"] = watch_region
        if with_watch_providers:
            params["with_watch_providers"] = with_watch_providers
        if with_genres:
            params["with_genres"] = with_genres
        if with_original_language:
            params["with_original_language"] = with_original_language

        res = await tmdb_client.get_request(f"/discover/{media_type}", params)
        results = res.get("results", [])
        for item in results:
            item["media_type"] = media_type
        return results
    except Exception:
        catalog = MOCK_MOVIES if media_type == "movie" else MOCK_TV
        results = []
        for item in catalog.values():
            results.append({
                **item,
                "media_type": media_type,
                "title": item.get("title") or item.get("name")
            })
        return results[:20]
