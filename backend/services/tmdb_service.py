import httpx
from typing import Dict, Any, List, Optional
from ..config import settings
from .redis_service import redis_cache

TMDB_BASE_URL = "https://api.themoviedb.org/3"

# Luxury mock assets (Unsplash curation for cinematic looks)
MOCK_ASSETS = {
    "interstellar_backdrop": "/rAiw1Z447C1NId1q68c92V2rPum.jpg",
    "interstellar_poster": "/gEU2Qv6IL7nOSYn2Pbr82V2R7Jd.jpg",
    "dune_backdrop": "/lzv7UjNn22ZgE0vm9qppQ7gFTPb.jpg",
    "dune_poster": "/d5NXSklXkiZt14AL4C4LwunCcNA.jpg",
    "oppenheimer_backdrop": "/fm6KjZLL36MRDv7JYYoaXGsR63d.jpg",
    "oppenheimer_poster": "/8Gxv2wY4uvUGFA67Xh5fQzIY1d5.jpg",
    "dark_backdrop": "/5EzKw67119CHn452zwPLv05tQ16.jpg",
    "dark_poster": "/apbrVmFBzv232cCOI79oL8gupwk.jpg",
    "succession_backdrop": "/x5g630801a61dfb6ff3f17316ef.jpg",
    "succession_poster": "/7594wZ14d5V5xZ2Qd5tEHGJLYHN.jpg",
    "wednesday_backdrop": "/iH7v9j8sXjypG4J32VbrvyAX5PX.jpg",
    "wednesday_poster": "/9PF05o444X5af3mQQYqEZLYHGJb.jpg",
    "severance_backdrop": "/9d8v9a1efbfbe3e1f0e21a221f1d.jpg",
    "severance_poster": "/lZ2mJqjKBgyUg43562g14d5V5xZ.jpg",
    "creator_backdrop": "/t5z43mNs4Tepe7tTL7o4P4j5iHs.jpg",
    "creator_poster": "/vB6tYMR42liZPhl88NEfg7x9mQQ.jpg"
}

MOCK_MOVIES = {
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
        "backdrop_path": MOCK_ASSETS["oppenheimer_backdrop"],
        "poster_path": MOCK_ASSETS["oppenheimer_poster"],
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
        self.client = httpx.AsyncClient(timeout=10.0)

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    async def get_request(self, endpoint: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        if not self.is_configured():
            # Trigger fallback immediately
            raise ValueError("TMDB API Key not configured")

        if not params:
            params = {}
        params["api_key"] = self.api_key

        url = f"{TMDB_BASE_URL}{endpoint}"
        
        # Redis caching layer
        cache_key = f"tmdb:{endpoint}:{sorted(params.items())}"
        cached_result = redis_cache.get(cache_key)
        if cached_result:
            return cached_result

        import asyncio
        import logging
        logger = logging.getLogger("tmdb")
        
        backoffs = [1.0, 2.0, 5.0]
        for attempt, delay in enumerate(backoffs + [0], start=1):
            try:
                response = await self.client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                redis_cache.set(cache_key, data, expire_seconds=21600)
                return data
            except httpx.HTTPError as e:
                if attempt <= len(backoffs):
                    logger.warning(f"TMDB request failed (attempt {attempt}/4). Retrying in {delay}s... Error: {str(e)}")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"TMDB request failed after max retries. Error: {str(e)}")
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
        try:
            endpoint = f"/{media_type}/{tmdb_id}"
            details = await self.get_request(endpoint)
            # Fetch credits
            try:
                credits = await self.get_request(f"{endpoint}/credits")
                details["cast"] = credits.get("cast", [])[:10]
                details["crew"] = credits.get("crew", [])[:5]
            except Exception:
                details["cast"] = []
                details["crew"] = []
            
            # Fetch trailers
            try:
                videos = await self.get_request(f"{endpoint}/videos")
                details["videos"] = videos
            except Exception:
                details["videos"] = {"results": []}
                
            return details
        except Exception:
            catalog = MOCK_MOVIES if media_type == "movie" else MOCK_TV
            item = catalog.get(str(tmdb_id))
            if not item:
                # Generate generic mock item if ID not in standard mock list
                is_movie = media_type == "movie"
                return {
                    "id": int(tmdb_id),
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

tmdb_client = TMDBClient()
