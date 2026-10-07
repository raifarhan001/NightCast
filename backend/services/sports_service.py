import logging
import httpx
from typing import Dict, Any, List

logger = logging.getLogger("nightcast_sports_service")

# Fallback Data
CRICKET_FALLBACK = {
    "live": [
        {
            "id": "c_1",
            "title": "India vs Australia - 1st Test",
            "status": "LIVE",
            "score": "IND: 245/4 | AUS: 350",
            "overs": "IND 65.2 ov",
            "format": "Test",
            "venue": "Perth Stadium"
        }
    ],
    "upcoming": [
        {
            "id": "c_2",
            "title": "England vs South Africa - 1st T20I",
            "status": "UPCOMING",
            "date": "2026-10-10",
            "format": "T20I",
            "venue": "Lord's"
        }
    ]
}

FOOTBALL_FALLBACK = {
    "live": [
        {
            "id": "f_1",
            "homeTeam": "Real Madrid",
            "awayTeam": "Barcelona",
            "score": "2 - 1",
            "status": "75'",
            "league": "La Liga"
        }
    ],
    "upcoming": [
        {
            "id": "f_2",
            "homeTeam": "Arsenal",
            "awayTeam": "Chelsea",
            "date": "2026-10-10 15:00 UTC",
            "league": "Premier League"
        }
    ],
    "standings": {
        "4328": [
            {"rank": 1, "team": "Manchester City", "played": 10, "points": 25, "gd": 15},
            {"rank": 2, "team": "Arsenal", "played": 10, "points": 23, "gd": 12},
            {"rank": 3, "team": "Liverpool", "played": 10, "points": 20, "gd": 8}
        ]
    }
}

async def fetch_cricket_data() -> Dict[str, Any]:
    url = "https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4720&s=2026"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                events = data.get("events", [])
                
                # Mock transformation
                live = []
                upcoming = []
                for event in events:
                    match = {
                        "id": event.get("idEvent"),
                        "title": event.get("strEvent"),
                        "date": event.get("dateEvent"),
                        "venue": event.get("strVenue"),
                        "status": "UPCOMING"
                    }
                    upcoming.append(match)
                
                if upcoming:
                    return {"live": CRICKET_FALLBACK["live"], "upcoming": upcoming[:10]}
    except Exception as e:
        logger.warning(f"Error fetching cricket data: {e}")
        
    return CRICKET_FALLBACK


async def fetch_football_live() -> List[Dict[str, Any]]:
    url = "https://www.thesportsdb.com/api/v2/json/3/livescore.php?s=Soccer"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                events = data.get("events", [])
                if events:
                    return events
    except Exception as e:
        logger.warning(f"Error fetching football live: {e}")
    return FOOTBALL_FALLBACK["live"]

async def fetch_football_upcoming() -> List[Dict[str, Any]]:
    url = "https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4328"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                events = data.get("events", [])
                if events:
                    return events
    except Exception as e:
        logger.warning(f"Error fetching football upcoming: {e}")
    return FOOTBALL_FALLBACK["upcoming"]

async def fetch_football_standings(league_code: str) -> List[Dict[str, Any]]:
    # default to PL (4328) if mapping fails, or use param directly
    url = f"https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l={league_code}&s=2025-2026"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                table = data.get("table", [])
                if table:
                    return table
    except Exception as e:
        logger.warning(f"Error fetching football standings: {e}")
    
    return FOOTBALL_FALLBACK["standings"].get(league_code, FOOTBALL_FALLBACK["standings"]["4328"])
