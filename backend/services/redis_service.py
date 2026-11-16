import os
import json
import logging
import time
import threading
from collections import OrderedDict
from typing import Optional, Any, Tuple
import redis.asyncio as aioredis
from config import settings

logger = logging.getLogger("nightcast_redis")

CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".cache_store.json")

class BoundedTTLCache:
    """Bounded in-memory LRU cache with disk persistence and Stale-While-Revalidate support."""
    def __init__(self, maxsize: int = 1000):
        self.maxsize = maxsize
        self._cache: OrderedDict[str, tuple[Any, float]] = OrderedDict()
        self._dump_lock = threading.Lock()
        self._load_from_disk()

    def _load_from_disk(self):
        try:
            if os.path.exists(CACHE_FILE):
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    now = time.time()
                    for k, item in data.items():
                        val = item.get("val")
                        exp = item.get("exp", 0)
                        # Keep entries that are less than 7 days old for instant stale serving
                        if exp > (now - 604800):
                            self._cache[k] = (val, exp)
                logger.info(f"Loaded {len(self._cache)} cached entries from disk store.")
        except Exception as e:
            logger.warning(f"Failed loading disk cache store: {e}")

    def _dump_to_disk(self):
        with self._dump_lock:
            try:
                data = {}
                for k, (val, exp) in list(self._cache.items())[-500:]:
                    data[k] = {"val": val, "exp": exp}
                tmp_file = CACHE_FILE + ".tmp"
                with open(tmp_file, "w", encoding="utf-8") as f:
                    json.dump(data, f)
                if os.path.exists(tmp_file):
                    os.replace(tmp_file, CACHE_FILE)
            except Exception:
                pass

    def get(self, key: str) -> Optional[Any]:
        if key not in self._cache:
            return None
        val, expire_at = self._cache[key]
        if time.time() > expire_at:
            return None
        self._cache.move_to_end(key)
        return val

    def get_with_stale(self, key: str) -> Tuple[Optional[Any], bool]:
        """Returns (value, is_stale). If expired, returns value with is_stale=True."""
        if key not in self._cache:
            return None, True
        val, expire_at = self._cache[key]
        is_stale = time.time() > expire_at
        self._cache.move_to_end(key)
        return val, is_stale

    def set(self, key: str, value: Any, expire_seconds: int = 3600):
        now = time.time()
        if key in self._cache:
            del self._cache[key]
        elif len(self._cache) >= self.maxsize:
            keys_to_delete = [k for k, (_, exp) in self._cache.items() if now > exp]
            for k in keys_to_delete:
                del self._cache[k]
            while len(self._cache) >= self.maxsize:
                self._cache.popitem(last=False)
        self._cache[key] = (value, now + expire_seconds)
        threading.Thread(target=self._dump_to_disk, daemon=True).start()

    def delete(self, key: str) -> bool:
        if key in self._cache:
            del self._cache[key]
            threading.Thread(target=self._dump_to_disk, daemon=True).start()
            return True
        return False

    def clear(self):
        self._cache.clear()
        if os.path.exists(CACHE_FILE):
            try:
                os.remove(CACHE_FILE)
            except Exception:
                pass


class RedisCache:
    def __init__(self):
        self.enabled = False
        self.client: Optional[aioredis.Redis] = None
        self.local_fallback = BoundedTTLCache(maxsize=1000)
        self._tested = False

    async def _ensure_connected(self):
        if self._tested:
            return
        self._tested = True
        try:
            self.client = aioredis.from_url(
                settings.REDIS_URL,
                socket_timeout=0.5,
                socket_connect_timeout=0.5,
                decode_responses=True
            )
            await self.client.ping()
            self.enabled = True
            logger.info("Connected to Redis asynchronously.")
        except Exception:
            self.enabled = False
            self.client = None
            logger.info("Redis not available on localhost, using persistent local disk LRU cache.")

    async def get(self, key: str) -> Optional[Any]:
        await self._ensure_connected()
        if self.enabled and self.client:
            try:
                data = await self.client.get(key)
                if data:
                    return json.loads(data)
            except Exception as e:
                logger.error(f"Redis get error: {e}")
        
        return self.local_fallback.get(key)

    async def get_with_stale(self, key: str) -> Tuple[Optional[Any], bool]:
        await self._ensure_connected()
        if self.enabled and self.client:
            try:
                data = await self.client.get(key)
                if data:
                    return json.loads(data), False
            except Exception:
                pass
        return self.local_fallback.get_with_stale(key)

    async def set(self, key: str, value: Any, expire_seconds: int = 3600) -> bool:
        await self._ensure_connected()
        if self.enabled and self.client:
            try:
                serialized = json.dumps(value)
                await self.client.set(key, serialized, ex=expire_seconds)
                return True
            except Exception as e:
                logger.error(f"Redis set error: {e}")
        
        self.local_fallback.set(key, value, expire_seconds=expire_seconds)
        return True

    async def delete(self, key: str) -> bool:
        await self._ensure_connected()
        if self.enabled and self.client:
            try:
                await self.client.delete(key)
                return True
            except Exception as e:
                logger.error(f"Redis delete error: {e}")
        
        return self.local_fallback.delete(key)

    async def clear(self):
        await self._ensure_connected()
        if self.enabled and self.client:
            try:
                await self.client.flushdb()
            except Exception as e:
                logger.error(f"Redis flush error: {e}")
        self.local_fallback.clear()

    async def close(self):
        if self.client:
            try:
                await self.client.aclose()
            except Exception:
                pass
            self.client = None
            self.enabled = False

redis_cache = RedisCache()
