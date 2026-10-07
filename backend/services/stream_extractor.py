import httpx
import re
import logging
import asyncio
from typing import Dict, Any, List, Optional
from services.redis_service import redis_cache

logger = logging.getLogger("nightcast_stream_extractor")

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


async def fetch_dual_audio_manifest(
    tmdb_id: str, season: int = 1, episode: int = 1, media_type: str = "tv"
) -> Dict[str, Any]:
    """Free endpoints for primary (English/Original) and secondary (Hindi dubbed via ScreenScape) sources."""
    if media_type == "tv":
        primary_url = f"https://player.autoembed.cc/embed/tv/{tmdb_id}/{season}/{episode}"
        hindi_fallback = f"https://nxsha.screenscape.me/embed?tmdb={tmdb_id}&type=tv&s={season}&e={episode}&lan=hindi"
    else:
        primary_url = f"https://player.autoembed.cc/embed/movie/{tmdb_id}"
        hindi_fallback = f"https://nxsha.screenscape.me/embed?tmdb={tmdb_id}&type=movie&lan=hindi"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://autoembed.cc/"
    }

    streams = []

    async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
        # 1. Fetch Primary / English Stream
        try:
            response = await client.get(primary_url, headers=headers)
            if response.status_code == 200:
                m3u8_matches = re.findall(r'(https?://[^\s<>"]+?\.m3u8[^\s<>"]*)', response.text)
                if m3u8_matches:
                    streams.append({"quality": "Auto", "url": m3u8_matches[0], "language": "English"})
        except Exception as e:
            logger.warning(f"Primary extraction error: {e}")

    return {
        "type": "multi-track",
        "multilingual": True,
        "tracks": [
            {
                "label": "English / Original",
                "url": streams[0]["url"] if streams else primary_url,
                "is_iframe": not bool(streams)
            },
            {
                "label": "Hindi Dubbed (ScreenScape)",
                "url": hindi_fallback,
                "is_iframe": True
            }
        ]
    }


class StreamExtractor:
    """Extracts raw .m3u8 HLS stream URLs and multi-audio language tracks from multiple free providers."""

    def __init__(self):
        pass

    async def fetch_dual_audio_manifest(self, tmdb_id: str, season: int = 1, episode: int = 1, media_type: str = "tv") -> Dict[str, Any]:
        return await fetch_dual_audio_manifest(tmdb_id, season, episode, media_type)

    async def extract_streams(
        self,
        media_type: str,
        tmdb_id: str,
        season: int = 1,
        episode: int = 1,
        language_pref: Optional[str] = None
    ) -> Dict[str, Any]:
        """Main entry point. Resolves direct HLS streams, parses audio track metadata, and provides iframe fallbacks."""
        cache_key = f"streams:v14:{media_type}:{tmdb_id}:{season}:{episode}:{language_pref or 'all'}"
        cached = await redis_cache.get(cache_key)
        if cached:
            logger.info(f"Cache hit for {cache_key}")
            return cached

        if media_type == "movie":
            s_screenscape = f"https://nxsha.screenscape.me/embed?tmdb={tmdb_id}&type=movie&lan=hindi"
            s1_vidsrc = f"https://vidsrc.me/embed/movie?tmdb={tmdb_id}"
            s2_vidsrc_to = f"https://vidsrc.to/embed/movie/{tmdb_id}"
            s3_vidlink = f"https://vidlink.pro/movie/{tmdb_id}?primaryColor=39AEA9&autoplay=true"
            s4_vidbolt = f"https://vidbolt.xyz/movie/{tmdb_id}?theme=39AEA9"
        elif media_type == "anime":
            s_screenscape = f"https://nxsha.screenscape.me/embed?tmdb={tmdb_id}&type=tv&s={season}&e={episode}&lan=hindi"
            s1_vidsrc = f"https://vidsrc.me/embed/tv?tmdb={tmdb_id}&season={season}&episode={episode}"
            s2_vidsrc_to = f"https://vidsrc.to/embed/tv/{tmdb_id}/{season}/{episode}"
            s3_vidlink = f"https://vidlink.pro/tv/{tmdb_id}/{season}/{episode}?primaryColor=39AEA9&autoplay=true"
            s4_vidbolt = f"https://vidbolt.xyz/anime/{tmdb_id}/{episode}?theme=39AEA9"
        else:
            s_screenscape = f"https://nxsha.screenscape.me/embed?tmdb={tmdb_id}&type=tv&s={season}&e={episode}&lan=hindi"
            s1_vidsrc = f"https://vidsrc.me/embed/tv?tmdb={tmdb_id}&season={season}&episode={episode}"
            s2_vidsrc_to = f"https://vidsrc.to/embed/tv/{tmdb_id}/{season}/{episode}"
            s3_vidlink = f"https://vidlink.pro/tv/{tmdb_id}/{season}/{episode}?primaryColor=39AEA9&autoplay=true"
            s4_vidbolt = f"https://vidbolt.xyz/tv/{tmdb_id}/{season}/{episode}?theme=39AEA9"

        all_servers = [
            {
                "id": "vidbolt",
                "name": "Server 1 (VidBolt - Fast HD Stream)",
                "url": s4_vidbolt,
                "type": "iframe",
                "language": "en",
                "language_name": "vidbolt.xyz"
            },
            {
                "id": "screenscape",
                "name": "ScreenScape (Hindi Dubbed)",
                "url": s_screenscape,
                "type": "iframe",
                "language": "hi",
                "language_name": "ScreenScape (Hindi)"
            },
            {
                "id": "vidlink",
                "name": "Server 2 (VidLink Pro)",
                "url": s3_vidlink,
                "type": "iframe",
                "language": "en",
                "language_name": "vidlink.pro"
            },
            {
                "id": "vidsrc-to",
                "name": "Server 3 (VidSrc VIP)",
                "url": s2_vidsrc_to,
                "type": "iframe",
                "language": "en",
                "language_name": "vidsrc.to"
            },
            {
                "id": "vidsrc",
                "name": "Server 4 (VidSrc Mirror)",
                "url": s1_vidsrc,
                "type": "iframe",
                "language": "en",
                "language_name": "vidsrc.me"
            }
        ]

        # Integrate direct HLS extraction with 2-second timeout
        direct_servers: List[Dict[str, Any]] = []
        try:
            direct_servers = await asyncio.wait_for(
                self._try_autoembed(media_type, tmdb_id, season, episode),
                timeout=2.0
            )
        except (asyncio.TimeoutError, Exception) as e:
            logger.debug(f"Direct stream extraction skipped or timed out: {e}")

        combined_servers = (direct_servers or []) + all_servers

        if language_pref == "hi":
            combined_servers.sort(key=lambda s: 0 if s.get("language") == "hi" else 1)

        result = {"servers": combined_servers}

        await redis_cache.set(cache_key, result, expire_seconds=3600)
        logger.info(f"Cached servers list for {cache_key}")

        return result

    async def _try_autoembed(
        self, media_type: str, tmdb_id: str, season: int, episode: int
    ) -> List[Dict[str, Any]]:
        """Attempt to extract direct m3u8 HLS streams from autoembed."""
        try:
            if media_type == "movie":
                url = f"https://player.autoembed.cc/embed/movie/{tmdb_id}"
            else:
                url = f"https://player.autoembed.cc/embed/tv/{tmdb_id}/{season}/{episode}"

            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, headers=BROWSER_HEADERS) as client:
                response = await client.get(url)
                if response.status_code != 200:
                    logger.warning(f"autoembed returned status {response.status_code}")
                    return []

                html = response.text
                m3u8_urls = self._extract_m3u8_from_html(html)

                if not m3u8_urls:
                    source_urls = self._extract_source_urls(html)
                    for src_url in source_urls[:3]:
                        try:
                            sub_response = await client.get(
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
                    "name": f"Server HLS {i + 1}",
                    "url": stream_url,
                    "type": "hls",
                    "headers": {
                        "Referer": "https://player.autoembed.cc/",
                        "Origin": "https://player.autoembed.cc"
                    }
                })

            if servers:
                logger.info(f"autoembed: Extracted {len(servers)} direct HLS stream(s)")
            return servers

        except Exception as e:
            logger.error(f"autoembed extraction failed: {e}")
            return []

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
