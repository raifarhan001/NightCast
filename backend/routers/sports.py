import logging
from fastapi import APIRouter, HTTPException, Path
from typing import Any, Dict

from services.redis_service import redis_cache
from services.sports_service import (
    fetch_cricket_data,
    fetch_football_live,
    fetch_football_upcoming,
    fetch_football_standings
)

logger = logging.getLogger("nightcast_sports_router")

router = APIRouter(prefix="/sports", tags=["Sports"])

LEAGUE_CODES = {
    "PL": "4328",
    "PD": "4335",
    "BL1": "4331",
    "SA": "4332",
    "FL1": "4334",
    "CL": "4480" # example for champions league
}

@router.get("/cricket")
async def get_cricket() -> Dict[str, Any]:
    cache_key = "sports:cricket:data"
    cached = await redis_cache.get(cache_key)
    if cached:
        return cached
        
    data = await fetch_cricket_data()
    # Cache for 5 minutes
    await redis_cache.set(cache_key, data, expire_seconds=300)
    return data

@router.get("/football")
async def get_football() -> Dict[str, Any]:
    cache_key = "sports:football:overview"
    cached = await redis_cache.get(cache_key)
    if cached:
        return cached
        
    live = await fetch_football_live()
    upcoming = await fetch_football_upcoming()
    standings = await fetch_football_standings("4328") # Default to PL
    
    data = {
        "live": live,
        "upcoming": upcoming,
        "standings": standings
    }
    
    # Cache for 5 minutes
    await redis_cache.set(cache_key, data, expire_seconds=300)
    return data

@router.get("/football/league/{league_code}")
async def get_football_league(league_code: str = Path(..., description="League code e.g. PL, PD, BL1")) -> Dict[str, Any]:
    league_code = league_code.upper()
    league_id = LEAGUE_CODES.get(league_code, league_code) # fallback to code if not in map
    
    cache_key = f"sports:football:league:{league_id}"
    cached = await redis_cache.get(cache_key)
    if cached:
        return cached
        
    standings = await fetch_football_standings(league_id)
    
    # Cache for 30 minutes
    await redis_cache.set(cache_key, standings, expire_seconds=1800)
    return {"league": league_code, "id": league_id, "standings": standings}
