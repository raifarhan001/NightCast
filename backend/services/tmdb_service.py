import asyncio
import logging
from typing import Dict, Any, List, Optional
import httpx
from config import settings
from services.redis_service import redis_cache

logger = logging.getLogger("nightcast_tmdb")

TMDB_BASE_URL = "https://api.themoviedb.org/3"

# Luxury mock assets (Verified TMDB paths for cinematic looks)
MOCK_ASSETS = {
    "interstellar_backdrop": "/8sNiAPPYU14PUepFNeSNGUTiHW.jpg",
    "interstellar_poster": "/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg",
    "dune_backdrop": "/zRKQW58MBEY078AxkHxEJzUskCl.jpg",
    "dune_poster": "/v1tRXZ4JtD2Iv6fjkPvT4GiwslV.jpg",
    "oppenheimer_backdrop": "/fm6KjZLL36MRDv7JYYoaXGsR63d.jpg",
    "oppenheimer_poster": "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    "avengers_backdrop": "/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    "avengers_poster": "/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg",
    "dark_backdrop": "/3jDXL4Xvj3AzDOF6UH1xeyHW8MH.jpg",
    "dark_poster": "/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg",
    "succession_backdrop": "/d87JXX3DLkRJMfm5StCmmnmhHuX.jpg",
    "succession_poster": "/z0XiwdrCQ9yVIr4O0pxzaAYRxdW.jpg",
    "wednesday_backdrop": "/iHSwvRVsRyxpX7FE7GbviaDvgGZ.jpg",
    "wednesday_poster": "/9PFonBhy4cQy7Jz20NpMygczOkv.jpg",
    "severance_backdrop": "/39bifj2FNytJ2m1cqOBcWMTKgmV.jpg",
    "severance_poster": "/6rWIip9MZELAA0SKii5WqsBDCYW.jpg",
    "creator_backdrop": "/8VyTWJrNEyV2MTWvniDVp0MpOAe.jpg",
    "creator_poster": "/cpf7vsRZ0MYRQcnLWteD5jK9ymT.jpg",
    "heart_of_the_beast_backdrop": "/nlqHh1zGH8HYERr4eRICN9ligk.jpg",
    "heart_of_the_beast_poster": "/6sYemVUn79UPKz1ZsSG6kPU4RVy.jpg",
    "resident_evil_backdrop": "/qBzH6VAkjYTGP4MGvMYGasu8ZA0.jpg",
    "resident_evil_poster": "/gAgWJhUSQWCgtKR8170nMkYlBda.jpg",
    "other_mommy_backdrop": "/zNaLP9XKRGdLYdKiLjEap5zqYWt.jpg",
    "other_mommy_poster": "/fGRNCssTRrhYZxNzykGGCoMsAVq.jpg"
}

MOCK_MOVIES = {
    "1263337": {
        "id": 1263337,
        "title": "Heart of the Beast",
        "overview": "A retired soldier and his combat canine search for redemption across a perilous wilderness.",
        "backdrop_path": "/nlqHh1zGH8HYERr4eRICN9ligk.jpg",
        "poster_path": "/6sYemVUn79UPKz1ZsSG6kPU4RVy.jpg",
        "release_date": "2026-01-15",
        "vote_average": 7.6,
        "runtime": 114,
        "genres": [{"id": 28, "name": "Action"}, {"id": 18, "name": "Drama"}],
        "has_en_title_backdrop": True
    },
    "1423191": {
        "id": 1423191,
        "title": "Resident Evil",
        "overview": "Medical courier Bryan unwittingly finds himself fighting for survival as one fateful night collapses into chaos.",
        "backdrop_path": "/qBzH6VAkjYTGP4MGvMYGasu8ZA0.jpg",
        "poster_path": "/gAgWJhUSQWCgtKR8170nMkYlBda.jpg",
        "release_date": "2026-03-01",
        "vote_average": 7.5,
        "runtime": 94,
        "genres": [{"id": 27, "name": "Horror"}, {"id": 878, "name": "Science Fiction"}, {"id": 12, "name": "Adventure"}],
        "has_en_title_backdrop": True
    },
    "1400837": {
        "id": 1400837,
        "title": "Other Mommy",
        "overview": "A sinister presence infiltrates a fractured family with nightmarish intentions.",
        "backdrop_path": "/zNaLP9XKRGdLYdKiLjEap5zqYWt.jpg",
        "poster_path": "/fGRNCssTRrhYZxNzykGGCoMsAVq.jpg",
        "release_date": "2026-02-14",
        "vote_average": 7.4,
        "runtime": 102,
        "genres": [{"id": 27, "name": "Horror"}, {"id": 53, "name": "Thriller"}],
        "has_en_title_backdrop": True
    },
    "157336": {
        "id": 157336,
        "title": "Interstellar",
        "overview": "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
        "backdrop_path": MOCK_ASSETS["interstellar_backdrop"],
        "poster_path": MOCK_ASSETS["interstellar_poster"],
        "release_date": "2014-11-05",
        "vote_average": 8.4,
        "runtime": 169,
        "genres": [{"id": 878, "name": "Science Fiction"}, {"id": 18, "name": "Drama"}, {"id": 12, "name": "Adventure"}],
        "tagline": "Mankind was born on Earth. It was never meant to die here.",
        "cast": [
            {"name": "Matthew McConaughey", "character": "Cooper", "profile_path": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&h=150&fit=crop"},
            {"name": "Anne Hathaway", "character": "Brand", "profile_path": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&h=150&fit=crop"},
            {"name": "Jessica Chastain", "character": "Murph", "profile_path": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&h=150&fit=crop"}
        ],
        "crew": [{"name": "Christopher Nolan", "job": "Director"}, {"name": "Jonathan Nolan", "job": "Writer"}],
        "videos": {"results": [{"key": "zSWdZVtXT7E", "site": "YouTube", "type": "Trailer"}]}
    },
    "1078605": {
        "id": 1078605,
        "title": "The Creator",
        "overview": "Amid a future war between the human race and the forces of artificial intelligence, a hardened former special forces agent grieving the disappearance of his wife is recruited to hunt down and kill the Creator.",
        "backdrop_path": MOCK_ASSETS["creator_backdrop"],
        "poster_path": MOCK_ASSETS["creator_poster"],
        "release_date": "2023-09-27",
        "vote_average": 7.1,
        "runtime": 133,
        "genres": [{"id": 878, "name": "Science Fiction"}, {"id": 28, "name": "Action"}, {"id": 53, "name": "Thriller"}],
        "tagline": "This is a fight for our survival.",
        "cast": [
            {"name": "John David Washington", "character": "Joshua", "profile_path": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&h=150&fit=crop"},
            {"name": "Gemma Chan", "character": "Maya", "profile_path": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&h=150&fit=crop"}
        ],
        "crew": [{"name": "Gareth Edwards", "job": "Director"}],
        "videos": {"results": [{"key": "ex3C1-5DHB8", "site": "YouTube", "type": "Trailer"}]}
    },
    "438631": {
        "id": 438631,
        "title": "Dune",
        "overview": "Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding, must travel to the most dangerous planet in the universe to ensure the future of his family and his people.",
        "backdrop_path": MOCK_ASSETS["dune_backdrop"],
        "poster_path": MOCK_ASSETS["dune_poster"],
        "release_date": "2021-09-15",
        "vote_average": 7.8,
        "runtime": 155,
        "genres": [{"id": 878, "name": "Science Fiction"}, {"id": 12, "name": "Adventure"}],
        "tagline": "Beyond fear, destiny awaits.",
        "cast": [
            {"name": "Timothée Chalamet", "character": "Paul Atreides", "profile_path": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&h=150&fit=crop"},
            {"name": "Zendaya", "character": "Chani", "profile_path": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=150&h=150&fit=crop"}
        ],
        "crew": [{"name": "Denis Villeneuve", "job": "Director"}],
        "videos": {"results": [{"key": "8g18jFHCLWY", "site": "YouTube", "type": "Trailer"}]}
    },
    "299534": {
        "id": 299534,
        "title": "Avengers: Endgame",
        "overview": "After the devastating events of Avengers: Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more in order to reverse Thanos' actions.",
        "backdrop_path": MOCK_ASSETS["avengers_backdrop"],
        "poster_path": MOCK_ASSETS["avengers_poster"],
        "release_date": "2019-04-24",
        "vote_average": 8.3,
        "runtime": 181,
        "genres": [{"id": 12, "name": "Adventure"}, {"id": 878, "name": "Science Fiction"}, {"id": 28, "name": "Action"}],
        "tagline": "Part of the journey is the end.",
        "cast": [
            {"name": "Robert Downey Jr.", "character": "Tony Stark / Iron Man", "profile_path": "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=150&h=150&fit=crop"}
        ],
        "crew": [{"name": "Anthony Russo", "job": "Director"}, {"name": "Joe Russo", "job": "Director"}]
    }
}

MOCK_TV = {
    "119051": {
        "id": 119051,
        "name": "Wednesday",
        "overview": "Wednesday Addams is sent to Nevermore Academy, a bizarre boarding school where she attempts to master her emerging psychic ability, thwart a monstrous killing spree, and solve the supernatural mystery that embroiled her parents 25 years ago.",
        "backdrop_path": MOCK_ASSETS["wednesday_backdrop"],
        "poster_path": MOCK_ASSETS["wednesday_poster"],
        "first_air_date": "2022-11-23",
        "vote_average": 8.5,
        "genres": [{"id": 10765, "name": "Sci-Fi & Fantasy"}, {"id": 9648, "name": "Mystery"}],
        "tagline": "Being an outlier has never been more in.",
        "cast": [
            {"name": "Jenna Ortega", "character": "Wednesday Addams", "profile_path": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&h=150&fit=crop"}
        ],
        "crew": [{"name": "Tim Burton", "job": "Director"}],
        "seasons": [
            {
                "season_number": 1,
                "episode_count": 8,
                "name": "Season 1",
                "episodes": [
                    {"episode_number": 1, "name": "Wednesday's Child Is Full of Woe", "overview": "Wednesday is expelled after releasing piranhas in the pool. She is sent to Nevermore Academy."},
                    {"episode_number": 2, "name": "Woe Is the Loneliest Number", "overview": "The sheriff questions Wednesday about the strange happenings. Wednesday investigates."},
                    {"episode_number": 3, "name": "Friend or Woe", "overview": "Wednesday stumbles upon a secret society. Meeting the local townspeople raises questions."},
                    {"episode_number": 4, "name": "Woe What a Night", "overview": "Wednesday asks Xavier to the Rave'N dance. Tyler holds a secret."},
                    {"episode_number": 5, "name": "You Reap What You Woe", "overview": "Wednesday uncovers details about her parents' history at Nevermore."},
                    {"episode_number": 6, "name": "Woein' Begone", "overview": "Wednesday's friends host a surprise birthday party. Her visions lead to a clue."},
                    {"episode_number": 7, "name": "If You Don't Woe Me by Now", "overview": "Uncle Fester visits. Wednesday strikes a deal with the sheriff."},
                    {"episode_number": 8, "name": "A Murder of Woes", "overview": "Wednesday faces off against the ancient evil threatening Nevermore."}
                ]
            }
        ],
        "videos": {"results": [{"key": "Di310WYmHC0", "site": "YouTube", "type": "Trailer"}]}
    },
    "54483": {
        "id": 54483,
        "name": "Succession",
        "overview": "The Roy family is known for controlling the biggest media and entertainment company in the world. However, their world changes when their father steps down.",
        "backdrop_path": MOCK_ASSETS["succession_backdrop"],
        "poster_path": MOCK_ASSETS["succession_poster"],
        "first_air_date": "2018-06-03",
        "vote_average": 8.7,
        "genres": [{"id": 18, "name": "Drama"}],
        "tagline": "Waystar Royco - Power, Family, Betrayal.",
        "cast": [
            {"name": "Brian Cox", "character": "Logan Roy", "profile_path": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&h=150&fit=crop"},
            {"name": "Jeremy Strong", "character": "Kendall Roy", "profile_path": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&h=150&fit=crop"}
        ],
        "crew": [{"name": "Jesse Armstrong", "job": "Creator"}],
        "seasons": [{"season_number": 1, "episode_count": 10, "name": "Season 1"}]
    },
    "70523": {
        "id": 70523,
        "name": "Dark",
        "overview": "A missing child sets four families on a frantic hunt for answers as they unearth a mind-bending mystery that spans three generations.",
        "backdrop_path": MOCK_ASSETS["dark_backdrop"],
        "poster_path": MOCK_ASSETS["dark_poster"],
        "first_air_date": "2017-12-01",
        "vote_average": 8.7,
        "genres": [{"id": 18, "name": "Drama"}, {"id": 9648, "name": "Mystery"}, {"id": 878, "name": "Science Fiction"}],
        "tagline": "The question is not where. But when.",
        "cast": [
            {"name": "Louis Hofmann", "character": "Jonas Kahnwald", "profile_path": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150&h=150&fit=crop"}
        ],
        "crew": [{"name": "Baran bo Odar", "job": "Director"}],
        "seasons": [{"season_number": 1, "episode_count": 10, "name": "Season 1"}]
    }
}

class TMDBClient:
    def __init__(self):
        self.api_key = settings.TMDB_API_KEY
        self._client: Optional[httpx.AsyncClient] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._details_cache: Dict[str, Dict[str, Any]] = {}

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def get_client(self) -> httpx.AsyncClient:
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = None

        if (
            self._client is None
            or self._client.is_closed
            or self._loop is not current_loop
        ):
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(15.0, connect=4.0, read=10.0),
                limits=httpx.Limits(max_keepalive_connections=50, max_connections=100, keepalive_expiry=60.0),
                follow_redirects=True
            )
            self._loop = current_loop
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None
            self._loop = None

    async def get_request(self, endpoint: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        if not self.is_configured():
            # Trigger fallback immediately
            raise ValueError("TMDB API Key not configured")

        params = dict(params) if params else {}
        params["api_key"] = self.api_key

        url = f"{TMDB_BASE_URL}{endpoint}"
        
        # Redis / Disk persistent caching layer
        cache_key = f"tmdb:{endpoint}:{sorted(params.items())}"
        try:
            cached_result = await redis_cache.get(cache_key)
            if cached_result:
                return cached_result
        except Exception:
            pass

        client = self.get_client()
        backoffs = [0.2, 0.5]
        for attempt, delay in enumerate(backoffs + [0], start=1):
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                try:
                    await redis_cache.set(cache_key, data, expire_seconds=86400)
                except Exception:
                    pass
                return data
            except httpx.HTTPStatusError as e:
                # Do not retry on client errors (4xx) except 429 Too Many Requests
                if e.response.status_code < 500 and e.response.status_code != 429:
                    logger.warning(f"TMDB request client error {e.response.status_code} for {endpoint}: {e}")
                    raise e
                if attempt <= len(backoffs):
                    logger.warning(f"TMDB request retry ({attempt}) for {endpoint}. Error: {repr(e)}")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"TMDB request failed for {endpoint}. Error: {repr(e)}")
                    raise e
            except Exception as e:
                if attempt <= len(backoffs):
                    logger.warning(f"TMDB request retry ({attempt}) for {endpoint}. Error: {repr(e)}")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"TMDB request failed for {endpoint}. Error: {repr(e)}")
                    raise e
        return {}

    async def get_trending(self, media_type: str = "all", time_window: str = "day") -> List[Dict[str, Any]]:
        """Returns trending content. Falls back to mock lists if TMDB not loaded."""
        try:
            res = await self.get_request(f"/trending/{media_type}/{time_window}")
            return res.get("results", [])
        except Exception:
            # Combined mock catalog
            movies = list(MOCK_MOVIES.values())
            tvs = list(MOCK_TV.values())
            # Format to TMDB list format
            formatted = []
            for m in movies:
                formatted.append({**m, "media_type": "movie"})
            for t in tvs:
                formatted.append({**t, "media_type": "tv", "title": t.get("name")})
            return formatted

    async def get_popular(self, media_type: str = "movie") -> List[Dict[str, Any]]:
        try:
            res = await self.get_request(f"/{media_type}/popular")
            return res.get("results", [])
        except Exception:
            catalog = MOCK_MOVIES if media_type == "movie" else MOCK_TV
            return [{**item, "media_type": media_type, "title": item.get("title") or item.get("name")} for item in catalog.values()]

    async def get_top_rated(self, media_type: str = "movie") -> List[Dict[str, Any]]:
        try:
            res = await self.get_request(f"/{media_type}/top_rated")
            return res.get("results", [])
        except Exception:
            # Sorted by mock vote_average
            catalog = MOCK_MOVIES if media_type == "movie" else MOCK_TV
            sorted_items = sorted(catalog.values(), key=lambda x: x.get("vote_average", 0.0), reverse=True)
            return [{**item, "media_type": media_type, "title": item.get("title") or item.get("name")} for item in sorted_items]

    async def get_details(self, media_type: str, tmdb_id: str) -> Dict[str, Any]:
        cache_key = f"{media_type}:{tmdb_id}"

        # 1. Level 1: In-memory detail cache (< 0.1ms latency, 0ms repeat clicks)
        if cache_key in self._details_cache:
            return self._details_cache[cache_key]

        # 2. Level 2: Persistent redis / disk cache (< 2ms latency)
        redis_detail_key = f"tmdb:detail:{cache_key}"
        try:
            cached_detail = await redis_cache.get(redis_detail_key)
            if cached_detail and isinstance(cached_detail, dict) and (cached_detail.get("id") or cached_detail.get("title") or cached_detail.get("name")):
                self._details_cache[cache_key] = cached_detail
                return cached_detail
        except Exception:
            pass

        try:
            endpoint = f"/{media_type}/{tmdb_id}"
            # Fetch details, credits, and videos in ONE single HTTP request using append_to_response!
            details = await self.get_request(endpoint, {"append_to_response": "credits,videos"})
            
            credits = details.get("credits", {})
            details["cast"] = credits.get("cast", [])[:10]
            details["crew"] = credits.get("crew", [])[:5]
            if "videos" not in details or not details["videos"]:
                details["videos"] = {"results": []}

            # Cache formatted details in fast memory and persistent store (7 days TTL)
            if len(self._details_cache) >= 1000:
                for k in list(self._details_cache.keys())[:200]:
                    self._details_cache.pop(k, None)
            self._details_cache[cache_key] = details

            try:
                await redis_cache.set(redis_detail_key, details, expire_seconds=604800)
            except Exception:
                pass
                
            return details
        except Exception:
            catalog = MOCK_MOVIES if media_type == "movie" else MOCK_TV
            item = catalog.get(str(tmdb_id))
            if not item:
                # Generate generic mock item if ID not in standard mock list
                is_movie = media_type == "movie"
                item = {
                    "id": int(tmdb_id) if str(tmdb_id).isdigit() else 0,
                    "title" if is_movie else "name": f"Mock {media_type.capitalize()} {tmdb_id}",
                    "overview": f"This is an elegant showcase movie representing TMDB identifier {tmdb_id}. Curated for cinematic preview details.",
                    "backdrop_path": MOCK_ASSETS["interstellar_backdrop"] if is_movie else MOCK_ASSETS["wednesday_backdrop"],
                    "poster_path": MOCK_ASSETS["interstellar_poster"] if is_movie else MOCK_ASSETS["wednesday_poster"],
                    "release_date" if is_movie else "first_air_date": "2024-01-01",
                    "vote_average": 8.0,
                    "runtime": 120,
                    "genres": [{"id": 878, "name": "Science Fiction"}],
                    "cast": [{"name": "A24 Actor", "character": "Protagonist", "profile_path": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150&h=150&fit=crop"}],
                    "crew": [{"name": "Director A24", "job": "Director"}],
                    "seasons": [{"season_number": 1, "episode_count": 8, "name": "Season 1"}] if not is_movie else None
                }
            self._details_cache[cache_key] = item
            return item

    async def search(self, query: str, media_type: str = "multi") -> List[Dict[str, Any]]:
        try:
            res = await self.get_request(f"/search/{media_type}", {"query": query})
            return res.get("results", [])
        except Exception:
            # Fallback local regex search
            query = query.lower()
            results = []
            for m_id, movie in MOCK_MOVIES.items():
                if query in movie["title"].lower() or query in movie["overview"].lower():
                    results.append({**movie, "media_type": "movie"})
            for t_id, tv in MOCK_TV.items():
                if query in tv["name"].lower() or query in tv["overview"].lower():
                    results.append({**tv, "media_type": "tv", "title": tv["name"]})
            return results

    async def get_recommendations(self, media_type: str, tmdb_id: str) -> List[Dict[str, Any]]:
        try:
            res = await self.get_request(f"/{media_type}/{tmdb_id}/recommendations")
            return res.get("results", [])
        except Exception:
            # Return remaining items in mock database
            catalog = MOCK_MOVIES if media_type == "movie" else MOCK_TV
            rec_list = []
            for m_id, val in catalog.items():
                if m_id != str(tmdb_id):
                    rec_list.append({**val, "media_type": media_type, "title": val.get("title") or val.get("name")})
            return rec_list

    async def get_english_backdrop(self, media_id: int, media_type: str = "movie") -> Optional[str]:
        """Fetches and caches the official English title-branded backdrop for a movie or TV show."""
        cache_key = f"tmdb:en_bd:{media_type}:{media_id}"
        try:
            cached = await redis_cache.get(cache_key)
            if cached:
                return cached
        except Exception:
            pass

        try:
            data = await self.get_request(
                f"/{media_type}/{media_id}/images",
                params={"include_image_language": "en,null"}
            )
            backdrops = data.get("backdrops", [])
            en_backdrops = [
                b["file_path"] for b in backdrops
                if b.get("iso_639_1") == "en" and b.get("file_path")
            ]
            if en_backdrops:
                en_path = en_backdrops[0]
                try:
                    await redis_cache.set(cache_key, en_path, expire_seconds=86400 * 14)
                except Exception:
                    pass
                return en_path
        except Exception as e:
            logger.debug(f"Could not fetch EN backdrop for {media_type} {media_id}: {e}")

        return None

    async def get_media_branding(self, media_id: int, media_type: str = "movie") -> Dict[str, Any]:
        """
        Fetches official English title-branded backdrop if available,
        or transparent studio logo as fallback.
        """
        cache_key = f"tmdb:branding:{media_type}:{media_id}"
        try:
            cached = await redis_cache.get(cache_key)
            if cached and isinstance(cached, dict):
                return cached
        except Exception:
            pass

        branding = {"en_backdrop_path": None, "logo_path": None, "has_en_title_backdrop": False}
        try:
            data = await self.get_request(
                f"/{media_type}/{media_id}/images",
                params={"include_image_language": "en,null"}
            )
            backdrops = data.get("backdrops", [])
            en_backdrops = [
                b["file_path"] for b in backdrops
                if b.get("iso_639_1") == "en" and b.get("file_path")
            ]
            if en_backdrops:
                branding["en_backdrop_path"] = en_backdrops[0]
                branding["has_en_title_backdrop"] = True

            logos = data.get("logos", [])
            en_logos = [l["file_path"] for l in logos if l.get("iso_639_1") == "en" and l.get("file_path")]
            any_logos = [l["file_path"] for l in logos if l.get("file_path")]
            if en_logos:
                branding["logo_path"] = en_logos[0]
            elif any_logos:
                branding["logo_path"] = any_logos[0]

            try:
                await redis_cache.set(cache_key, branding, expire_seconds=86400 * 14)
            except Exception:
                pass
        except Exception as e:
            logger.debug(f"Could not fetch branding for {media_type} {media_id}: {e}")

        return branding

    async def get_hero_assets(self, media_id: int, media_type: str = "movie") -> Dict[str, Optional[str]]:
        """Fetches clean textless backdrop and transparent studio logo for hero presentation."""
        cache_key = f"tmdb:hero_assets:{media_type}:{media_id}"
        try:
            cached = await redis_cache.get(cache_key)
            if cached and isinstance(cached, dict):
                return cached
        except Exception:
            pass

        result = {"clean_backdrop_path": None, "logo_path": None}
        try:
            data = await self.get_request(
                f"/{media_type}/{media_id}/images",
                params={"include_image_language": "en,null"}
            )
            backdrops = data.get("backdrops", [])
            # Priority: Textless clean backdrop (iso_639_1 is None or empty)
            clean_bds = [b["file_path"] for b in backdrops if not b.get("iso_639_1") and b.get("file_path")]
            if clean_bds:
                result["clean_backdrop_path"] = clean_bds[0]

            # Studio transparent PNG logos: en first, then any
            logos = data.get("logos", [])
            en_logos = [l["file_path"] for l in logos if l.get("iso_639_1") == "en" and l.get("file_path")]
            any_logos = [l["file_path"] for l in logos if l.get("file_path")]
            if en_logos:
                result["logo_path"] = en_logos[0]
            elif any_logos:
                result["logo_path"] = any_logos[0]

            try:
                await redis_cache.set(cache_key, result, expire_seconds=86400 * 14)
            except Exception:
                pass
        except Exception as e:
            logger.debug(f"Could not fetch hero assets for {media_type} {media_id}: {e}")

        return result

tmdb_client = TMDBClient()
