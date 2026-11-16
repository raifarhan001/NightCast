import asyncio
import json
import logging
import random
import time
from datetime import datetime, timezone
from typing import List, Dict, Any
import httpx
from fastapi import APIRouter, Query, Response, HTTPException

from services.tmdb_service import tmdb_client, MOCK_TV, MOCK_MOVIES
from services.stream_extractor import stream_extractor
from services.redis_service import redis_cache

logger = logging.getLogger("nightcast_tmdb_router")

router = APIRouter(prefix="/tmdb", tags=["tmdb"])

# Module-level high-speed in-memory cache for home feed (sub-10ms response time)
_MEMORY_FEED_CACHE: Dict[str, Any] = {
    "data": None,
    "raw_json": None,
    "timestamp": 0.0,
    "date_str": ""
}
_feed_lock = asyncio.Lock()
_feed_in_progress = False

def get_fallback_home_feed(today_str: str) -> dict:
    """Returns instant local curated catalog when TMDB is cold or unreachable."""
    mock_movie_list = [{**m, "media_type": "movie"} for m in MOCK_MOVIES.values()]
    mock_tv_list = [{**t, "media_type": "tv"} for t in MOCK_TV.values()]
    rng_m = random.Random(f"{today_str}-ai-movies")
    curated_ai_movies = list(mock_movie_list)
    rng_m.shuffle(curated_ai_movies)
    rng_t = random.Random(f"{today_str}-ai-tv")
    curated_ai_tv = list(mock_tv_list)
    rng_t.shuffle(curated_ai_tv)

    return {
        "top_picks": mock_movie_list[:6],
        "ai_movie_suggestions": curated_ai_movies,
        "ai_series_suggestions": curated_ai_tv,
        "new_movies": mock_movie_list,
        "popular_tv": mock_tv_list,
        "action_movies": [m for m in mock_movie_list if any(g.get("name") == "Action" for g in m.get("genres", []))] or mock_movie_list,
        "comedy_movies": mock_movie_list,
        "drama_movies": mock_movie_list,
        "horror_movies": mock_movie_list,
        "scifi_movies": [m for m in mock_movie_list if any(g.get("name") == "Sci-Fi" for g in m.get("genres", []))] or mock_movie_list,
        "thriller_movies": mock_movie_list,
        "romance_movies": mock_movie_list,
        "animation_movies": mock_movie_list,
        "crime_movies": mock_movie_list,
        "documentary_movies": mock_movie_list,
    }

async def build_and_cache_home_feed(cache_key: str, today_str: str, day_of_year: int) -> dict:
    """Fetches full composite TMDB feed and updates the persistent cache."""
    ai_movie_page = (day_of_year % 8) + 1
    ai_tv_page = (day_of_year % 8) + 1
    sem = asyncio.Semaphore(15)

    async def fetch_category(coro):
        async with sem:
            try:
                return await coro
            except Exception as e:
                logger.warning(f"fetch_category error: {repr(e)}")
                return []

    results = await asyncio.gather(
        fetch_category(tmdb_client.get_trending("all", "week")),
        fetch_category(tmdb_client.get_request("/movie/now_playing")),
        fetch_category(tmdb_client.get_popular("tv")),
        fetch_category(tmdb_client.get_request("/discover/movie", {"with_genres": "28"})),
        fetch_category(tmdb_client.get_request("/discover/movie", {"with_genres": "35"})),
        fetch_category(tmdb_client.get_request("/discover/movie", {"with_genres": "18"})),
        fetch_category(tmdb_client.get_request("/discover/movie", {"with_genres": "27"})),
        fetch_category(tmdb_client.get_request("/discover/movie", {"with_genres": "878"})),
        fetch_category(tmdb_client.get_request("/discover/movie", {"with_genres": "53"})),
        fetch_category(tmdb_client.get_request("/discover/movie", {"with_genres": "10749"})),
        fetch_category(tmdb_client.get_request("/discover/movie", {"with_genres": "16"})),
        fetch_category(tmdb_client.get_request("/discover/movie", {"with_genres": "80"})),
        fetch_category(tmdb_client.get_request("/discover/movie", {"with_genres": "99"})),
        fetch_category(tmdb_client.get_request("/discover/movie", {
            "sort_by": "vote_average.desc",
            "vote_count.gte": "2500",
            "page": str(ai_movie_page)
        })),
        fetch_category(tmdb_client.get_request("/discover/tv", {
            "sort_by": "vote_average.desc",
            "vote_count.gte": "1000",
            "page": str(ai_tv_page)
        })),
    )

    mock_movie_list = [{**m, "media_type": "movie"} for m in MOCK_MOVIES.values()]
    mock_tv_list = [{**t, "media_type": "tv"} for t in MOCK_TV.values()]
    is_fallback = False

    def extract_items(data, default_type="movie"):
        nonlocal is_fallback
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict):
            items = data.get("results", [])
        else:
            items = []
        if not items:
            is_fallback = True
            items = mock_tv_list if default_type == "tv" else mock_movie_list
        for item in items:
            if not isinstance(item, dict):
                continue
            if "media_type" not in item:
                item["media_type"] = default_type
        return items

    raw_ai_movies = extract_items(results[13], "movie")
    rng_m = random.Random(f"{today_str}-ai-movies")
    curated_ai_movies = list(raw_ai_movies)
    rng_m.shuffle(curated_ai_movies)

    raw_ai_tv = extract_items(results[14], "tv")
    rng_t = random.Random(f"{today_str}-ai-tv")
    curated_ai_tv = list(raw_ai_tv)
    rng_t.shuffle(curated_ai_tv)

    feed = {
        "top_picks": [dict(it) for it in extract_items(results[0], "all")],
        "ai_movie_suggestions": curated_ai_movies,
        "ai_series_suggestions": curated_ai_tv,
        "new_movies": extract_items(results[1], "movie"),
        "popular_tv": extract_items(results[2], "tv"),
        "action_movies": extract_items(results[3], "movie"),
        "comedy_movies": extract_items(results[4], "movie"),
        "drama_movies": extract_items(results[5], "movie"),
        "horror_movies": extract_items(results[6], "movie"),
        "scifi_movies": extract_items(results[7], "movie"),
        "thriller_movies": extract_items(results[8], "movie"),
        "romance_movies": extract_items(results[9], "movie"),
        "animation_movies": extract_items(results[10], "movie"),
        "crime_movies": extract_items(results[11], "movie"),
        "documentary_movies": extract_items(results[12], "movie"),
    }

    # Enrich Hero carousel (top_picks) with clean textless backdrops & transparent studio logos
    async def enrich_hero_item(item):
        if not isinstance(item, dict) or not item.get("id"):
            return
        mid = item["id"]
        mtype = item.get("media_type") or ("tv" if item.get("first_air_date") else "movie")
        try:
            hero_assets = await tmdb_client.get_hero_assets(mid, mtype)
            if hero_assets.get("clean_backdrop_path"):
                item["clean_backdrop_path"] = hero_assets["clean_backdrop_path"]
                item["backdrop_path"] = hero_assets["clean_backdrop_path"]
            if hero_assets.get("logo_path"):
                item["logo_path"] = hero_assets["logo_path"]
        except Exception as e:
            logger.debug(f"enrich_hero_item error for {mid}: {e}")

    if feed.get("top_picks"):
        try:
            await asyncio.gather(*(enrich_hero_item(it) for it in feed["top_picks"]))
        except Exception as e:
            logger.warning(f"Error enriching top_picks hero assets: {e}")

    # Collect unique items across rows (excluding top_picks) and enrich with English title-branded backdrops from TMDB
    unique_items_map = {}
    for cat_name, cat_list in feed.items():
        if cat_name == "top_picks":
            continue
        if isinstance(cat_list, list):
            for it in cat_list:
                if isinstance(it, dict) and it.get("id"):
                    m_type = it.get("media_type") or ("tv" if it.get("first_air_date") or it.get("season") else "movie")
                    key = (it["id"], m_type)
                    unique_items_map.setdefault(key, []).append(it)

    en_sem = asyncio.Semaphore(15)
    async def enrich_item(item_key, item_list):
        mid, mtype = item_key
        async with en_sem:
            try:
                branding = await tmdb_client.get_media_branding(mid, mtype)
                if branding.get("has_en_title_backdrop") and branding.get("en_backdrop_path"):
                    for item_dict in item_list:
                        item_dict["backdrop_path"] = branding["en_backdrop_path"]
                        item_dict["has_en_title_backdrop"] = True
                else:
                    for item_dict in item_list:
                        item_dict["has_en_title_backdrop"] = False
                        if branding.get("logo_path"):
                            item_dict["logo_path"] = branding["logo_path"]
            except Exception as e:
                logger.debug(f"enrich_item error for {mid}: {e}")

    if unique_items_map:
        try:
            await asyncio.gather(*(enrich_item(k, v) for k, v in unique_items_map.items()))
        except Exception as e:
            logger.warning(f"Error during English backdrop enrichment: {e}")

    # Pre-serialize to JSON string for 0ms serialization on requests
    raw_json = json.dumps(feed)

    # Update in-memory cache immediately
    _MEMORY_FEED_CACHE["data"] = feed
    _MEMORY_FEED_CACHE["raw_json"] = raw_json
    _MEMORY_FEED_CACHE["timestamp"] = time.time()
    _MEMORY_FEED_CACHE["date_str"] = today_str

    expire_time = 86400 if not is_fallback else 600
    await redis_cache.set(cache_key, feed, expire_seconds=expire_time)
    return feed

async def _safe_build_home_feed(cache_key: str, today_str: str, day_of_year: int):
    global _feed_in_progress
    if _feed_in_progress:
        return
    async with _feed_lock:
        if _feed_in_progress:
            return
        _feed_in_progress = True
        try:
            await build_and_cache_home_feed(cache_key, today_str, day_of_year)
        except Exception as e:
            logger.warning(f"Background build_and_cache_home_feed error: {repr(e)}")
        finally:
            _feed_in_progress = False

def trigger_background_feed_refresh(cache_key: str, today_str: str, day_of_year: int):
    if not _feed_in_progress:
        asyncio.create_task(_safe_build_home_feed(cache_key, today_str, day_of_year))

async def warm_up_home_feed_cache():
    """Asynchronously pre-warms the home feed in memory on server boot."""
    now = datetime.now(timezone.utc)
    day_of_year = now.timetuple().tm_yday
    today_str = now.strftime("%Y-%m-%d")
    cache_key = f"tmdb:home_feed:v9:{today_str}"

    try:
        await redis_cache._ensure_connected()
    except Exception:
        pass

    logger.info("Starting background cache pre-warm for TMDB home feed...")
    try:
        cached, is_stale = await redis_cache.get_with_stale(cache_key)
        if cached and isinstance(cached, dict) and cached.get("new_movies") and cached.get("ai_movie_suggestions"):
            raw_cached = json.dumps(cached)
            _MEMORY_FEED_CACHE["data"] = cached
            _MEMORY_FEED_CACHE["raw_json"] = raw_cached
            _MEMORY_FEED_CACHE["timestamp"] = time.time()
            _MEMORY_FEED_CACHE["date_str"] = today_str
            logger.info("Pre-warmed home feed cache directly from persistent store.")
            if is_stale:
                await _safe_build_home_feed(cache_key, today_str, day_of_year)
            return

        # If no valid cache in store, set fallback immediately so early requests get instant sub-10ms response
        fallback = get_fallback_home_feed(today_str)
        _MEMORY_FEED_CACHE["data"] = fallback
        _MEMORY_FEED_CACHE["raw_json"] = json.dumps(fallback)
        _MEMORY_FEED_CACHE["timestamp"] = time.time()
        _MEMORY_FEED_CACHE["date_str"] = today_str

        # Build fresh feed from TMDB in background
        await _safe_build_home_feed(cache_key, today_str, day_of_year)
        logger.info("Home feed cache successfully initialized from TMDB.")
    except Exception as e:
        logger.warning(f"Error during warm_up_home_feed_cache: {repr(e)}")

@router.get("/home_feed")
async def get_home_feed():
    """Returns an aggregated and cached composite feed of all core categories with instant in-memory SWR (sub-10ms response)."""
    now = datetime.now(timezone.utc)
    day_of_year = now.timetuple().tm_yday
    today_str = now.strftime("%Y-%m-%d")
    cache_key = f"tmdb:home_feed:v9:{today_str}"
    current_time = time.time()

    # 1. Level 1: Ultra-fast path - Direct pre-serialized in-memory JSON bytes (< 3ms latency!)
    mem_raw = _MEMORY_FEED_CACHE.get("raw_json")
    mem_time = _MEMORY_FEED_CACHE.get("timestamp", 0.0)
    mem_date = _MEMORY_FEED_CACHE.get("date_str", "")

    if mem_raw and (mem_date == today_str):
        if current_time - mem_time > 1200:
            trigger_background_feed_refresh(cache_key, today_str, day_of_year)
        return Response(content=mem_raw, media_type="application/json")

    mem_data = _MEMORY_FEED_CACHE.get("data")
    if mem_data and isinstance(mem_data, dict) and mem_data.get("new_movies") and mem_data.get("ai_movie_suggestions"):
        if not mem_raw:
            mem_raw = json.dumps(mem_data)
            _MEMORY_FEED_CACHE["raw_json"] = mem_raw
        if current_time - mem_time > 1200 or mem_date != today_str:
            trigger_background_feed_refresh(cache_key, today_str, day_of_year)
        return Response(content=mem_raw, media_type="application/json")

    # 2. Level 2: Secondary fast path - Persistent redis / disk LRU cache (~1-2ms latency)
    cached, is_stale = await redis_cache.get_with_stale(cache_key)
    if cached and isinstance(cached, dict) and cached.get("new_movies") and cached.get("ai_movie_suggestions"):
        raw_cached = json.dumps(cached)
        _MEMORY_FEED_CACHE["data"] = cached
        _MEMORY_FEED_CACHE["raw_json"] = raw_cached
        _MEMORY_FEED_CACHE["timestamp"] = current_time
        _MEMORY_FEED_CACHE["date_str"] = today_str
        if is_stale:
            trigger_background_feed_refresh(cache_key, today_str, day_of_year)
        return Response(content=raw_cached, media_type="application/json")

    # 3. Level 3: Cold start path - Return curated catalog immediately (< 5ms) and populate TMDB in background!
    fallback = get_fallback_home_feed(today_str)
    raw_fallback = json.dumps(fallback)
    _MEMORY_FEED_CACHE["data"] = fallback
    _MEMORY_FEED_CACHE["raw_json"] = raw_fallback
    _MEMORY_FEED_CACHE["timestamp"] = current_time
    _MEMORY_FEED_CACHE["date_str"] = today_str

    trigger_background_feed_refresh(cache_key, today_str, day_of_year)
    return Response(content=raw_fallback, media_type="application/json")

@router.get("/ai/movies")
async def get_ai_movie_suggestions():
    """Returns all-time hit movie suggestions refreshed daily."""
    now = datetime.now(timezone.utc)
    day_of_year = now.timetuple().tm_yday
    today_str = now.strftime("%Y-%m-%d")
    cache_key = f"tmdb:ai_movies:{today_str}"
    cached = await redis_cache.get(cache_key)
    if cached:
        return cached
    page = (day_of_year % 8) + 1
    try:
        data = await tmdb_client.get_request("/discover/movie", {
            "sort_by": "vote_average.desc",
            "vote_count.gte": "2500",
            "page": str(page)
        })
        items = data.get("results", []) if isinstance(data, dict) else []
        for item in items:
            item["media_type"] = "movie"
        rng = random.Random(f"{today_str}-ai-movies")
        rng.shuffle(items)
        await redis_cache.set(cache_key, items, expire_seconds=86400)
        return items
    except Exception:
        movies = [{**m, "media_type": "movie"} for m in MOCK_MOVIES.values()]
        return movies

@router.get("/ai/series")
async def get_ai_series_suggestions():
    """Returns all-time hit web series suggestions refreshed daily."""
    now = datetime.now(timezone.utc)
    day_of_year = now.timetuple().tm_yday
    today_str = now.strftime("%Y-%m-%d")
    cache_key = f"tmdb:ai_series:{today_str}"
    cached = await redis_cache.get(cache_key)
    if cached:
        return cached
    page = (day_of_year % 8) + 1
    try:
        data = await tmdb_client.get_request("/discover/tv", {
            "sort_by": "vote_average.desc",
            "vote_count.gte": "1000",
            "page": str(page)
        })
        items = data.get("results", []) if isinstance(data, dict) else []
        for item in items:
            item["media_type"] = "tv"
        rng = random.Random(f"{today_str}-ai-tv")
        rng.shuffle(items)
        await redis_cache.set(cache_key, items, expire_seconds=86400)
        return items
    except Exception:
        series = [{**t, "media_type": "tv"} for t in MOCK_TV.values()]
        return series

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

@router.get("/now_playing")
async def get_now_playing(media_type: str = Query("movie", description="movie")):
    try:
        res = await tmdb_client.get_request("/movie/now_playing")
        results = res.get("results", [])
        for item in results:
            item["media_type"] = "movie"
        return results
    except Exception:
        movies = list(MOCK_MOVIES.values())
        return [{**m, "media_type": "movie"} for m in movies]

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
    with_networks: str = Query("", description="Network IDs e.g. 213 for Netflix"),
    with_companies: str = Query("", description="Company IDs e.g. 17846 for Netflix Studios"),
    page: int = Query(1, ge=1, le=500)
):
    try:
        params: Dict[str, Any] = {"page": page}
        if watch_region:
            params["watch_region"] = watch_region
        if with_watch_providers:
            params["with_watch_providers"] = with_watch_providers
        if with_networks:
            params["with_networks"] = with_networks
        if with_companies:
            params["with_companies"] = with_companies
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
        data = await tmdb_client.get_details(media_type, tmdb_id)
        return Response(content=json.dumps(data), media_type="application/json")
    except Exception:
        catalog = MOCK_MOVIES if media_type == "movie" else MOCK_TV
        fallback_item = catalog.get(str(tmdb_id), {"id": int(tmdb_id) if str(tmdb_id).isdigit() else 0, "title": f"Item {tmdb_id}", "overview": "Overview unavailable"})
        return Response(content=json.dumps(fallback_item), media_type="application/json")

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
    episode: int = 1,
    language: str = Query("all", description="Language preference e.g. hi, ta, te, en")
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
            language_pref=language
        )
    except Exception as e:
        return {"servers": [], "streams": [], "error": str(e)}


