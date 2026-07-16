import json
import logging
import redis
from typing import Optional, Any
from ..config import settings

logger = logging.getLogger("vidking_redis")

class RedisCache:
    def __init__(self):
        self.enabled = False
        self.client = None
        self.local_fallback = {}  # In-memory dictionary fallback

        try:
            self.client = redis.from_url(settings.REDIS_URL, socket_timeout=2.0)
            # Test connection
            self.client.ping()
            self.enabled = True
            logger.info("Connected to Redis successfully.")
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}. Falling back to in-memory cache.")

    def get(self, key: str) -> Optional[Any]:
        if self.enabled:
            try:
                data = self.client.get(key)
                if data:
                    return json.loads(data)
            except Exception as e:
                logger.error(f"Redis get error: {e}")
        
        # Fallback to local
        return self.local_fallback.get(key)

    def set(self, key: str, value: Any, expire_seconds: int = 3600) -> bool:
        if self.enabled:
            try:
                serialized = json.dumps(value)
                self.client.set(key, serialized, ex=expire_seconds)
                return True
            except Exception as e:
                logger.error(f"Redis set error: {e}")
        
        # Fallback to local
        self.local_fallback[key] = value
        # Simple local expiry could be added, but this is a fallback
        return True

    def delete(self, key: str) -> bool:
        if self.enabled:
            try:
                self.client.delete(key)
                return True
            except Exception as e:
                logger.error(f"Redis delete error: {e}")
        
        if key in self.local_fallback:
            del self.local_fallback[key]
            return True
        return False

    def clear(self):
        if self.enabled:
            try:
                self.client.flushdb()
            except Exception as e:
                logger.error(f"Redis flush error: {e}")
        self.local_fallback.clear()

redis_cache = RedisCache()
