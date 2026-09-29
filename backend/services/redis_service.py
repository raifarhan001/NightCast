import json
import logging
import time
from collections import OrderedDict
from typing import Optional, Any
import redis.asyncio as aioredis
from config import settings

logger = logging.getLogger("nightcast_redis")

class BoundedTTLCache:
    """Bounded in-memory LRU cache with TTL expiration to prevent memory leaks."""
    def __init__(self, maxsize: int = 1000):
        self.maxsize = maxsize
        self._cache: OrderedDict[str, tuple[Any, float]] = OrderedDict()

    def get(self, key: str) -> Optional[Any]:
        if key not in self._cache:
            return None
        val, expire_at = self._cache[key]
        if time.time() > expire_at:
            del self._cache[key]
            return None
        # Move to end (most recently used)
        self._cache.move_to_end(key)
        return val

    def set(self, key: str, value: Any, expire_seconds: int = 3600):
        now = time.time()
        if key in self._cache:
            del self._cache[key]
        elif len(self._cache) >= self.maxsize:
            # Purge expired items first
            keys_to_delete = [k for k, (_, exp) in self._cache.items() if now > exp]
            for k in keys_to_delete:
                del self._cache[k]
            # Evict LRU if still at or exceeding maxsize
            while len(self._cache) >= self.maxsize:
                self._cache.popitem(last=False)
        self._cache[key] = (value, now + expire_seconds)

    def delete(self, key: str) -> bool:
        if key in self._cache:
            del self._cache[key]
            return True
        return False

    def clear(self):
        self._cache.clear()


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
        except Exception as e:
            self.enabled = False
            self.client = None
            logger.info("Redis not available on localhost, using bounded in-memory LRU cache with TTL.")

    async def get(self, key: str) -> Optional[Any]:
        await self._ensure_connected()
        if self.enabled and self.client:
            try:
                data = await self.client.get(key)
                if data:
                    return json.loads(data)
            except Exception as e:
                logger.error(f"Redis get error: {e}")
        
        # Fallback to bounded local cache
        return self.local_fallback.get(key)

    async def set(self, key: str, value: Any, expire_seconds: int = 3600) -> bool:
        await self._ensure_connected()
        if self.enabled and self.client:
            try:
                serialized = json.dumps(value)
                await self.client.set(key, serialized, ex=expire_seconds)
                return True
            except Exception as e:
                logger.error(f"Redis set error: {e}")
        
        # Fallback to bounded local cache
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
