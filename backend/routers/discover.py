from fastapi import APIRouter, Query
from typing import List, Dict, Any
from ..services.tmdb_service import tmdb_client, MOCK_MOVIES, MOCK_TV

router = APIRouter(prefix="/tmdb", tags=["tmdb"])

@router.get("/discover")
async def discover(
    with_watch_providers: str = Query("", description="Pipe-delimited TMDB provider IDs e.g. 8|9|119"),
    watch_region: str = Query("US", description="ISO 3166-1 code"),
    media_type: str = Query("movie", description="movie or tv"),
    page: int = Query(1, ge=1, le=500)
):
    try:
        params = {
            "watch_region": watch_region,
            "with_watch_providers": with_watch_providers,
            "page": page,
        }
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
