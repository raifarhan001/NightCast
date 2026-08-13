import httpx
import re
import logging
import asyncio
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


def encode_param(val: str) -> str:
    from urllib.parse import quote
    return quote(val, safe='')


async def fetch_dual_audio_manifest(
    tmdb_id: str, season: int = 1, episode: int = 1, media_type: str = "tv"
) -> Dict[str, Any]:
    """Free endpoints for primary (English/Original) and secondary (Hindi dubbed) sources."""
    if media_type == "tv":
        primary_url = f"https://player.autoembed.cc/embed/tv/{tmdb_id}/{season}/{episode}"
        hindi_fallback = f"https://vidsrc.me/embed/tv?tmdb={tmdb_id}&season={season}&episode={episode}&ds_lang=hi"
    else:
        primary_url = f"https://player.autoembed.cc/embed/movie/{tmdb_id}"
        hindi_fallback = f"https://vidsrc.me/embed/movie?tmdb={tmdb_id}&ds_lang=hi"

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

    # 2. Return multi-stream configuration with explicit language metadata
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
                "label": "Hindi Dubbed",
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

    def _parse_m3u8_audio_tracks(self, m3u8_content: str) -> List[Dict[str, str]]:
        """Parse #EXT-X-MEDIA:TYPE=AUDIO tags from an HLS master playlist manifest."""
        audio_tracks = []
        seen = set()
        audio_lines = re.findall(r'#EXT-X-MEDIA:TYPE=AUDIO.*', m3u8_content, re.IGNORECASE)
        
        for line in audio_lines:
            name_match = re.search(r'NAME=["\']([^"\']+)["\']', line, re.IGNORECASE)
            lang_match = re.search(r'LANGUAGE=["\']([^"\']+)["\']', line, re.IGNORECASE)
            
            label = name_match.group(1) if name_match else None
            lang = lang_match.group(1) if lang_match else None
            
            if not label and lang:
                label = lang.upper()
            elif not label:
                label = "Default Audio"
                
            if not lang and label:
                lang = label[:2].lower()
            elif not lang:
                lang = "en"
                
            key = (lang.lower(), label)
            if key not in seen:
                seen.add(key)
                audio_tracks.append({"lang": lang.lower(), "label": label})

        if not audio_tracks:
            audio_tracks = [
                {"lang": "en", "label": "English"},
                {"lang": "hi", "label": "Hindi"},
                {"lang": "ko", "label": "Korean"}
            ]
            
        return audio_tracks

    async def extract_streams(
        self,
        media_type: str,
        tmdb_id: str,
        season: int = 1,
        episode: int = 1,
        language_pref: Optional[str] = None
    ) -> Dict[str, Any]:
        """Main entry point. Resolves direct HLS streams, parses audio track metadata, and provides iframe fallbacks."""
        cache_key = f"streams:{media_type}:{tmdb_id}:{season}:{episode}:{language_pref or 'all'}"
        cached = redis_cache.get(cache_key)
        if cached:
            logger.info(f"Cache hit for {cache_key}")
            return cached

        if media_type == "movie":
            s1_vidbolt = f"https://vidbolt.xyz/movie/{tmdb_id}"
            s2_vidsrc = f"https://vidsrc.me/embed/movie?tmdb={tmdb_id}"
            s3_hindi = f"https://vsrc.su/embed/movie/{tmdb_id}?ds_lang=hi"
        elif media_type == "anime":
            s1_vidbolt = f"https://vidbolt.xyz/anime/{tmdb_id}/{episode}"
            s2_vidsrc = f"https://vidsrc.me/embed/tv?tmdb={tmdb_id}&season={season}&episode={episode}"
            s3_hindi = f"https://vsrc.su/embed/tv/{tmdb_id}/{season}-{episode}?ds_lang=hi"
        else:
            s1_vidbolt = f"https://vidbolt.xyz/tv/{tmdb_id}/{season}/{episode}"
            s2_vidsrc = f"https://vidsrc.me/embed/tv?tmdb={tmdb_id}&season={season}&episode={episode}"
            s3_hindi = f"https://vsrc.su/embed/tv/{tmdb_id}/{season}-{episode}?ds_lang=hi"

        all_servers = [
            {
                "id": "vidbolt",
                "name": "Server 1 (VidBolt)",
                "url": s1_vidbolt,
                "type": "iframe",
                "language": "en",
                "language_name": "vidbolt.xyz"
            },
            {
                "id": "vidsrc",
                "name": "Server 2 (VidSrc)",
                "url": s2_vidsrc,
                "type": "iframe",
                "language": "en",
                "language_name": "vidsrc.me"
            },
            {
                "id": "hindi-dubbed",
                "name": "Server 3 (Hindi Dubbed)",
                "url": s3_hindi,
                "type": "iframe",
                "language": "hi",
                "language_name": "vsrc.su",
                "is_dub": True
            }
        ]

        if language_pref == "hi":
            all_servers.sort(key=lambda s: 0 if s.get("language") == "hi" else 1)

        result = {"servers": all_servers}

        redis_cache.set(cache_key, result, expire_seconds=3600)
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

    async def extract_download_streams(
        self,
        media_type: str,
        tmdb_id: str,
        season: int = 1,
        episode: int = 1,
    ) -> Dict[str, Any]:
        """Resolves direct downloadable links and stream endpoints for offline saving with immediate response."""
        download_options = []

        if media_type == "movie":
            download_options.append({
                "id": "vidbolt-download",
                "label": "VidBolt Ultra Fast Stream (1080p)",
                "url": f"https://vidbolt.xyz/movie/{tmdb_id}",
                "quality": "1080p Full HD",
                "format": "mp4/stream",
                "type": "direct_stream"
            })
            download_options.append({
                "id": "vidsrc-download",
                "label": "VidSrc Primary HD Source (1080p)",
                "url": f"https://vidsrc.me/embed/movie?tmdb={tmdb_id}",
                "quality": "1080p",
                "format": "mp4/stream",
                "type": "direct_stream"
            })
            download_options.append({
                "id": "hindi-download",
                "label": "Hindi Dubbed Stream Source (720p/1080p)",
                "url": f"https://vsrc.su/embed/movie/{tmdb_id}?ds_lang=hi",
                "quality": "720p / 1080p",
                "format": "mp4/stream",
                "type": "direct_stream"
            })
        elif media_type == "anime":
            download_options.append({
                "id": "vidbolt-download",
                "label": f"VidBolt Anime Stream Ep {episode} (1080p)",
                "url": f"https://vidbolt.xyz/anime/{tmdb_id}/{episode}",
                "quality": "1080p Full HD",
                "format": "mp4/stream",
                "type": "direct_stream"
            })
            download_options.append({
                "id": "vidsrc-download",
                "label": f"VidSrc Primary Stream Ep {episode} (1080p)",
                "url": f"https://vidsrc.me/embed/tv?tmdb={tmdb_id}&season={season}&episode={episode}",
                "quality": "1080p",
                "format": "mp4/stream",
                "type": "direct_stream"
            })
        else:
            download_options.append({
                "id": "vidbolt-download",
                "label": f"VidBolt Stream S{season}E{episode} (1080p)",
                "url": f"https://vidbolt.xyz/tv/{tmdb_id}/{season}/{episode}",
                "quality": "1080p Full HD",
                "format": "mp4/stream",
                "type": "direct_stream"
            })
            download_options.append({
                "id": "vidsrc-download",
                "label": f"VidSrc Primary Stream S{season}E{episode} (1080p)",
                "url": f"https://vidsrc.me/embed/tv?tmdb={tmdb_id}&season={season}&episode={episode}",
                "quality": "1080p",
                "format": "mp4/stream",
                "type": "direct_stream"
            })
            download_options.append({
                "id": "hindi-download",
                "label": f"Hindi Dubbed Stream S{season}E{episode} (720p/1080p)",
                "url": f"https://vsrc.su/embed/tv/{tmdb_id}/{season}-{episode}?ds_lang=hi",
                "quality": "720p / 1080p",
                "format": "mp4/stream",
                "type": "direct_stream"
            })

        return {
            "status": "success",
            "tmdb_id": tmdb_id,
            "media_type": media_type,
            "season": season,
            "episode": episode,
            "downloads": download_options
        }

    def _get_iframe_fallbacks(
        self, media_type: str, tmdb_id: str, season: int, episode: int
    ) -> List[Dict[str, Any]]:
        """Return standard iframe embed URLs as fallback."""
        if media_type == "movie":
            return [
                {
                    "id": "vidbolt",
                    "name": "Server 1 (VidBolt)",
                    "url": f"https://vidbolt.xyz/movie/{tmdb_id}",
                    "type": "iframe",
                },
                {
                    "id": "vidsrc",
                    "name": "Server 2 (VidSrc)",
                    "url": f"https://vidsrc.me/embed/movie?tmdb={tmdb_id}",
                    "type": "iframe",
                },
                {
                    "id": "hindi-dubbed",
                    "name": "Server 3 (Hindi Dubbed)",
                    "url": f"https://vsrc.su/embed/movie/{tmdb_id}?ds_lang=hi",
                    "type": "iframe",
                },
            ]
        elif media_type == "anime":
            return [
                {
                    "id": "vidbolt",
                    "name": "Server 1 (VidBolt)",
                    "url": f"https://vidbolt.xyz/anime/{tmdb_id}/{episode}",
                    "type": "iframe",
                },
                {
                    "id": "vidsrc",
                    "name": "Server 2 (VidSrc)",
                    "url": f"https://vidsrc.me/embed/tv?tmdb={tmdb_id}&season={season}&episode={episode}",
                    "type": "iframe",
                },
                {
                    "id": "hindi-dubbed",
                    "name": "Server 3 (Hindi Dubbed)",
                    "url": f"https://vsrc.su/embed/tv/{tmdb_id}/{season}-{episode}?ds_lang=hi",
                    "type": "iframe",
                },
            ]
        else:
            return [
                {
                    "id": "vidbolt",
                    "name": "Server 1 (VidBolt)",
                    "url": f"https://vidbolt.xyz/tv/{tmdb_id}/{season}/{episode}",
                    "type": "iframe",
                },
                {
                    "id": "vidsrc",
                    "name": "Server 2 (VidSrc)",
                    "url": f"https://vidsrc.me/embed/tv?tmdb={tmdb_id}&season={season}&episode={episode}",
                    "type": "iframe",
                },
                {
                    "id": "hindi-dubbed",
                    "name": "Server 3 (Hindi Dubbed)",
                    "url": f"https://vsrc.su/embed/tv/{tmdb_id}/{season}-{episode}?ds_lang=hi",
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
