import httpx
import re
import logging
from typing import Dict, Any, List, Optional
from services.redis_service import redis_cache

logger = logging.getLogger("stream_extractor")

# Common headers to mimic browser requests
BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Regex patterns to find m3u8 URLs in HTML/JS source
M3U8_PATTERNS = [
    re.compile(r'["\']([^"\'\n]*?\.m3u8[^"\'\n]*?)["\']'),
    re.compile(r'(?:file|source|src|url|stream)\s*[:=]\s*["\']([^"\'\n]*?\.m3u8[^"\'\n]*?)["\']'),
    re.compile(r'https?://[^\s"\'\n<>]*?\.m3u8[^\s"\'\n<>]*'),
]

# Pattern to find embedded API/source URLs that might lead to streams
SOURCE_API_PATTERNS = [
    re.compile(r'["\']([^"\'\n]*?/(?:source|sources|playlist|hls|stream)[^"\'\n]*?)["\']'),
    re.compile(r'data-src=["\']([^"\']+)["\']'),
    re.compile(r'src=["\']([^"\']*?(?:embed|player|stream)[^"\']*?)["\']'),
]


class StreamExtractor:
    """Extracts raw .m3u8 HLS stream URLs from multiple free providers."""

    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=12.0,
            follow_redirects=True,
            headers=BROWSER_HEADERS,
        )

    async def extract_streams(
        self,
        media_type: str,
        tmdb_id: str,
        season: int = 1,
        episode: int = 1,
    ) -> Dict[str, Any]:
        """Main entry point. Tries providers in order, caches results."""
        cache_key = f"streams:{media_type}:{tmdb_id}:{season}:{episode}"
        cached = redis_cache.get(cache_key)
        if cached:
            logger.info(f"Cache hit for {cache_key}")
            return cached

        # 1. VIDSRC (MAIN)
        if media_type == "movie":
            vv_url = f"https://vidsrc.me/embed/movie?tmdb={tmdb_id}"
        else:
            vv_url = f"https://vidsrc.me/embed/tv?tmdb={tmdb_id}&season={season}&episode={episode}"
            
        server1 = {
            "id": "vidsrc-main",
            "name": "VIDSRC (MAIN)",
            "url": vv_url,
            "type": "iframe"
        }

        # 2. VIDLINK
        if media_type == "movie":
            vl_url = f"https://vidlink.pro/movie/{tmdb_id}"
        else:
            vl_url = f"https://vidlink.pro/tv/{tmdb_id}/{season}/{episode}"
            
        server2 = {
            "id": "vidlink-secondary",
            "name": "VIDLINK",
            "url": vl_url,
            "type": "iframe"
        }

        # 3. ENGLISH DUB
        if media_type == "movie":
            vp_url = f"https://vidsrc.me/embed/movie?tmdb={tmdb_id}"
        else:
            vp_url = f"https://vidsrc.me/embed/tv?tmdb={tmdb_id}&season={season}&episode={episode}"

        server3 = {
            "id": "english-dub",
            "name": "ENGLISH DUB",
            "url": vp_url,
            "type": "iframe"
        }

        # 4. HINDI DUB
        if media_type == "movie":
            me_url = f"https://multiembed.mov/directstream.php?video_id={tmdb_id}&tmdb=1&ds_lang=hi"
        else:
            me_url = f"https://multiembed.mov/directstream.php?video_id={tmdb_id}&tmdb=1&s={season}&e={episode}&ds_lang=hi"

        server4 = {
            "id": "hindi-dub",
            "name": "HINDI DUB",
            "url": me_url,
            "type": "iframe"
        }

        result = {"servers": [server1, server2, server3, server4]}

        # Cache iframe fallbacks for 1 hour
        redis_cache.set(cache_key, result, expire_seconds=3600)
        logger.info(f"Cached servers list for {cache_key}")

        return result

    async def _try_autoembed(
        self, media_type: str, tmdb_id: str, season: int, episode: int
    ) -> List[Dict[str, Any]]:
        """Attempt to extract m3u8 from autoembed.cc."""
        try:
            if media_type == "movie":
                url = f"https://player.autoembed.cc/embed/movie/{tmdb_id}"
            else:
                url = f"https://player.autoembed.cc/embed/tv/{tmdb_id}/{season}/{episode}"

            response = await self.client.get(url)
            if response.status_code != 200:
                logger.warning(f"autoembed.cc returned {response.status_code}")
                return []

            html = response.text
            m3u8_urls = self._extract_m3u8_from_html(html)

            if not m3u8_urls:
                source_urls = self._extract_source_urls(html)
                for src_url in source_urls[:3]:
                    try:
                        sub_response = await self.client.get(
                            src_url,
                            headers={**BROWSER_HEADERS, "Referer": url}
                        )
                        if sub_response.status_code == 200:
                            sub_m3u8 = self._extract_m3u8_from_html(sub_response.text)
                            m3u8_urls.extend(sub_m3u8)
                            try:
                                json_data = sub_response.json()
                                json_urls = self._extract_m3u8_from_json(json_data)
                                m3u8_urls.extend(json_urls)
                            except Exception:
                                pass
                    except Exception:
                        pass

            seen = set()
            unique_urls = []
            for u in m3u8_urls:
                if u not in seen:
                    seen.add(u)
                    unique_urls.append(u)

            servers = []
            for i, stream_url in enumerate(unique_urls[:4]):
                servers.append({
                    "id": f"autoembed-{i + 1}",
                    "name": f"Server {i + 1} (HLS)",
                    "url": stream_url,
                    "type": "hls",
                    "headers": {"Referer": "https://player.autoembed.cc/", "Origin": "https://player.autoembed.cc"}
                })

            if servers:
                logger.info(f"autoembed.cc: Found {len(servers)} HLS stream(s)")
            return servers

        except Exception as e:
            logger.error(f"autoembed.cc extraction failed: {e}")
            return []

    def _get_iframe_fallbacks(
        self, media_type: str, tmdb_id: str, season: int, episode: int
    ) -> List[Dict[str, Any]]:
        """Return standard iframe embed URLs as fallback."""
        if media_type == "movie":
            return [
                {
                    "id": "fallback-vidsrc",
                    "name": "VIDSRC (MAIN)",
                    "url": f"https://vidsrc.me/embed/movie?tmdb={tmdb_id}",
                    "type": "iframe",
                },
                {
                    "id": "fallback-vidlink",
                    "name": "VIDLINK",
                    "url": f"https://vidlink.pro/movie/{tmdb_id}",
                    "type": "iframe",
                },
            ]
        else:
            return [
                {
                    "id": "fallback-vidsrc",
                    "name": "VIDSRC (MAIN)",
                    "url": f"https://vidsrc.me/embed/tv?tmdb={tmdb_id}&season={season}&episode={episode}",
                    "type": "iframe",
                },
                {
                    "id": "fallback-vidlink",
                    "name": "VIDLINK",
                    "url": f"https://vidlink.pro/tv/{tmdb_id}/{season}/{episode}",
                    "type": "iframe",
                },
            ]

    def _extract_m3u8_from_html(self, html: str) -> List[str]:
        """Extract .m3u8 URLs from HTML/JS source text."""
        urls = []
        for pattern in M3U8_PATTERNS:
            matches = pattern.findall(html)
            for match in matches:
                cleaned = match.strip().replace('\\/', '/')
                if cleaned.startswith('http') and '.m3u8' in cleaned:
                    urls.append(cleaned)
        return urls

    def _extract_source_urls(self, html: str) -> List[str]:
        """Extract intermediate API/source URLs that might lead to m3u8 streams."""
        urls = []
        for pattern in SOURCE_API_PATTERNS:
            matches = pattern.findall(html)
            for match in matches:
                cleaned = match.strip().replace('\\/', '/')
                if cleaned.startswith('http'):
                    urls.append(cleaned)
        return urls

    def _extract_m3u8_from_json(self, data: Any, depth: int = 0) -> List[str]:
        """Recursively extract m3u8 URLs from JSON response data."""
        if depth > 5:
            return []
        urls = []
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, str) and '.m3u8' in value and value.startswith('http'):
                    urls.append(value)
                elif isinstance(value, (dict, list)):
                    urls.extend(self._extract_m3u8_from_json(value, depth + 1))
        elif isinstance(data, list):
            for item in data:
                urls.extend(self._extract_m3u8_from_json(item, depth + 1))
        return urls


# Singleton
stream_extractor = StreamExtractor()
