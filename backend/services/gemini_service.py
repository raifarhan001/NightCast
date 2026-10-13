import json
import logging
import asyncio
import urllib.request
from typing import Dict, Any, List, Optional
from config import settings
from services.tmdb_service import tmdb_client
from services.redis_service import redis_cache

logger = logging.getLogger("nightcast_gemini")

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent"

def _sync_call_gemini(prompt: str, system_instruction: str = "") -> Optional[str]:
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        logger.warning("GEMINI_API_KEY is not configured.")
        return None

    url = f"{GEMINI_API_URL}?key={api_key}"
    payload: Dict[str, Any] = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1000
        }
    }
    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }

    try:
        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=req_data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            if resp.status != 200:
                logger.error(f"Gemini API returned status {resp.status}")
                return None
            body = resp.read()
            data = json.loads(body.decode("utf-8"))
            candidates = data.get("candidates", [])
            if not candidates:
                return None
            parts = candidates[0].get("content", {}).get("parts", [])
            for p in parts:
                if "text" in p:
                    return p["text"]
            return None
    except Exception as e:
        logger.error(f"Error calling Gemini API: {e}")
        return None

async def call_gemini_api(prompt: str, system_instruction: str = "") -> Optional[str]:
    return await asyncio.to_thread(_sync_call_gemini, prompt, system_instruction)

async def search_by_mood_and_prompt(user_query: str, limit: int = 8) -> Dict[str, Any]:
    """
    Interprets natural language queries, moods, emotional tones, and genres
    in English, Urdu, Roman Urdu, or Hindi using Gemini Flash,
    and returns rich TMDB media objects with AI commentary.
    """
    clean_query = user_query.strip()
    cache_key = f"gemini:mood_search:{clean_query.lower()}"
    try:
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached
    except Exception:
        pass

    system_instruction = (
        "You are Nightcast AI, an elite cinema curator and film critic. "
        "The user is searching for movies or TV series using a mood, feeling, plot scenario, or conversational phrase "
        "(which could be in English, Urdu, Roman Urdu, or Hindi).\n"
        "1. Understand the core emotional tone, theme, and genre.\n"
        "2. Recommend 6 to 8 celebrated, real movies or TV shows that perfectly fit.\n"
        "3. Output STRICT JSON only without Markdown or backticks with this exact structure:\n"
        "{\n"
        '  "vibe": "Short 3-5 word poetic mood title (e.g. Cosmic Wonder & Existential Longing)",\n'
        '  "reasoning": "1-2 warm sentences explaining why these titles match what they are craving",\n'
        '  "recommendations": [\n'
        "    {\n"
        '      "title": "Exact English title (e.g. Interstellar)",\n'
        '      "year": "Release year",\n'
        '      "type": "movie or tv",\n'
        '      "vibe_tag": "2-3 word tag (e.g. Mind-Bending Sci-Fi)",\n'
        '      "pitch": "1 punchy sentence why this fits their mood"\n'
        "    }\n"
        "  ]\n"
        "}"
    )

    raw_response = await call_gemini_api(f"Find titles for: {clean_query}", system_instruction=system_instruction)
    
    if not raw_response:
        standard_results = await tmdb_client.search(clean_query)
        return {
            "vibe": f"Results for '{clean_query}'",
            "reasoning": "Direct catalog search matches.",
            "results": standard_results[:limit]
        }

    clean_json = raw_response.strip()
    if clean_json.startswith("```json"):
        clean_json = clean_json[7:]
    if clean_json.startswith("```"):
        clean_json = clean_json[3:]
    if clean_json.endswith("```"):
        clean_json = clean_json[:-3]
    clean_json = clean_json.strip()

    try:
        parsed = json.loads(clean_json)
    except Exception as e:
        logger.warning(f"Could not parse Gemini JSON response: {e}. Falling back to standard search.")
        standard_results = await tmdb_client.search(clean_query)
        return {
            "vibe": f"Results for '{clean_query}'",
            "reasoning": "Direct catalog search matches.",
            "results": standard_results[:limit]
        }

    recs = parsed.get("recommendations", [])
    vibe = parsed.get("vibe", f"Vibe: {clean_query}")
    reasoning = parsed.get("reasoning", "Specially curated selections based on your mood.")

    async def match_tmdb(rec: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        title = rec.get("title", "")
        if not title:
            return None
        try:
            search_res = await tmdb_client.search(title)
            if search_res:
                top_match = search_res[0]
                media_type = top_match.get("media_type") or rec.get("type", "movie")
                if media_type not in ["movie", "tv"]:
                    media_type = "movie"
                return {
                    "id": top_match.get("id"),
                    "title": top_match.get("title") or top_match.get("name") or title,
                    "name": top_match.get("name") or top_match.get("title") or title,
                    "media_type": media_type,
                    "poster_path": top_match.get("poster_path"),
                    "backdrop_path": top_match.get("backdrop_path"),
                    "vote_average": top_match.get("vote_average"),
                    "release_date": top_match.get("release_date") or top_match.get("first_air_date") or rec.get("year"),
                    "overview": top_match.get("overview") or rec.get("pitch"),
                    "ai_vibe_tag": rec.get("vibe_tag"),
                    "ai_pitch": rec.get("pitch")
                }
        except Exception as e:
            logger.warning(f"Error matching TMDB title '{title}': {e}")
        return None

    matched_items = await asyncio.gather(*[match_tmdb(r) for r in recs])
    valid_items = [item for item in matched_items if item is not None]

    if not valid_items:
        valid_items = await tmdb_client.search(clean_query)

    response_data = {
        "vibe": vibe,
        "reasoning": reasoning,
        "results": valid_items[:limit]
    }

    try:
        await redis_cache.set(cache_key, response_data, expire_seconds=3600)
    except Exception:
        pass

    return response_data
