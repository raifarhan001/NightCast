from fastapi import APIRouter, Depends, Query, Response, HTTPException
from typing import List, Dict, Any
from services.tmdb_service import tmdb_client, MOCK_TV, MOCK_MOVIES
from services.stream_extractor import stream_extractor
from fastapi.responses import HTMLResponse
import httpx
from urllib.parse import urlparse

router = APIRouter(prefix="/tmdb", tags=["tmdb"])

@router.get("/trending")
async def get_trending(
    media_type: str = Query("all", description="all, movie, tv"),
    time_window: str = Query("day", description="day, week")
):
    try:
        return await tmdb_client.get_trending(media_type, time_window)
    except Exception:
        movies = list(MOCK_MOVIES.values())
        return [{**m, "media_type": "movie"} for m in movies]

@router.get("/popular")
async def get_popular(media_type: str = Query("movie", description="movie, tv")):
    try:
        return await tmdb_client.get_popular(media_type)
    except Exception:
        catalog = MOCK_MOVIES if media_type == "movie" else MOCK_TV
        return [{**item, "media_type": media_type} for item in catalog.values()]

@router.get("/top_rated")
async def get_top_rated(media_type: str = Query("movie", description="movie, tv")):
    try:
        return await tmdb_client.get_top_rated(media_type)
    except Exception:
        catalog = MOCK_MOVIES if media_type == "movie" else MOCK_TV
        return [{**item, "media_type": media_type} for item in catalog.values()]

@router.get("/search")
async def search(
    query: str,
    media_type: str = Query("multi", description="multi, movie, tv, person")
):
    try:
        if media_type == "all":
            media_type = "multi"
        return await tmdb_client.search(query, media_type)
    except Exception:
        return []

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

@router.get("/{media_type}/{tmdb_id}")
async def get_details(media_type: str, tmdb_id: str):
    try:
        return await tmdb_client.get_details(media_type, tmdb_id)
    except Exception:
        catalog = MOCK_MOVIES if media_type == "movie" else MOCK_TV
        return catalog.get(str(tmdb_id), {"id": int(tmdb_id) if tmdb_id.isdigit() else 0, "title": f"Item {tmdb_id}", "overview": "Overview unavailable"})

@router.get("/{media_type}/{tmdb_id}/recommendations")
async def get_recommendations(media_type: str, tmdb_id: str):
    try:
        return await tmdb_client.get_recommendations(media_type, tmdb_id)
    except Exception:
        return []

@router.get("/tv/{tv_id}/season/{season_number}")
async def get_tv_season(tv_id: str, season_number: int):
    try:
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
        return await tmdb_client.get_request(f"/tv/{tv_id}/season/{season_number}")
    except Exception:
        return {
            "season_number": season_number,
            "name": f"Season {season_number}",
            "episodes": []
        }

@router.get("/{media_type}/{tmdb_id}/streams")
async def get_streams(
    media_type: str,
    tmdb_id: str,
    response: Response,
    season: int = 1,
    episode: int = 1
):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    try:
        return await stream_extractor.extract_streams(
            media_type=media_type,
            tmdb_id=tmdb_id,
            season=season,
            episode=episode,
        )
    except Exception as e:
        return {"streams": [], "error": str(e)}

@router.get("/proxy-stream")
async def proxy_stream(url: str):
    try:
        async with httpx.AsyncClient(follow_redirects=True, verify=False) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            }
            response = await client.get(url, headers=headers, timeout=12.0)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=f"Failed to fetch target URL: Status {response.status_code}")
            
            html = response.text
            parsed = urlparse(url)
            base_url = f"{parsed.scheme}://{parsed.netloc}/"
            
            base_tag = f'<base href="{base_url}">'
            if "<head>" in html:
                html = html.replace("<head>", f"<head>{base_tag}", 1)
            else:
                html = f"<html><head>{base_tag}</head>{html}"
                
            return HTMLResponse(content=html, status_code=200)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/proxy-embed")
async def proxy_embed(url: str):
    try:
        async with httpx.AsyncClient(follow_redirects=True, verify=False) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }
            res = await client.get(url, headers=headers, timeout=12.0)
            
            html = res.text
            parsed = urlparse(url)
            base_url = f"{parsed.scheme}://{parsed.netloc}/"
            
            base_tag = f'<base href="{base_url}">'
            if "<head>" in html:
                html = html.replace("<head>", f"<head>{base_tag}", 1)
            else:
                html = f"<html><head>{base_tag}</head>{html}"
                
            return Response(content=html, media_type="text/html")
    except Exception as e:
        return Response(content=f"<h1>Proxy Error: {str(e)}</h1>", media_type="text/html", status_code=500)
