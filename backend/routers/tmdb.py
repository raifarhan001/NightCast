from fastapi import APIRouter, Depends, Query
from typing import List, Dict, Any
from ..services.tmdb_service import tmdb_client, MOCK_TV

router = APIRouter(prefix="/tmdb", tags=["tmdb"])

@router.get("/trending")
async def get_trending(
    media_type: str = Query("all", description="all, movie, tv"),
    time_window: str = Query("day", description="day, week")
):
    results = await tmdb_client.get_trending(media_type, time_window)
    return results

@router.get("/popular")
async def get_popular(media_type: str = Query("movie", description="movie, tv")):
    results = await tmdb_client.get_popular(media_type)
    return results

@router.get("/top_rated")
async def get_top_rated(media_type: str = Query("movie", description="movie, tv")):
    results = await tmdb_client.get_top_rated(media_type)
    return results

@router.get("/search")
async def search(
    query: str,
    media_type: str = Query("multi", description="multi, movie, tv, person")
):
    results = await tmdb_client.search(query, media_type)
    return results

@router.get("/{media_type}/{tmdb_id}")
async def get_details(media_type: str, tmdb_id: str):
    details = await tmdb_client.get_details(media_type, tmdb_id)
    return details

@router.get("/{media_type}/{tmdb_id}/recommendations")
async def get_recommendations(media_type: str, tmdb_id: str):
    recs = await tmdb_client.get_recommendations(media_type, tmdb_id)
    return recs

@router.get("/tv/{tv_id}/season/{season_number}")
async def get_tv_season(tv_id: str, season_number: int):
    if not tmdb_client.is_configured():
        mock_tv = MOCK_TV.get(str(tv_id))
        if mock_tv:
            seasons = mock_tv.get("seasons", [])
            for s in seasons:
                if s.get("season_number") == season_number:
                    return s
        return {
            "season_number": season_number,
            "name": f"Season {season_number}",
            "episodes": [
                {
                    "episode_number": i,
                    "name": f"Episode {i}",
                    "overview": f"This is an elegant sync synopsis for mock episode {i}."
                } for i in range(1, 9)
            ]
        }
    try:
        results = await tmdb_client.get_request(f"/tv/{tv_id}/season/{season_number}")
        return results
    except Exception:
        return {
            "season_number": season_number,
            "name": f"Season {season_number}",
            "episodes": []
        }
