from abc import ABC, abstractmethod
from typing import Optional
from models.playback import PlaybackResponse


class PlaybackProvider(ABC):

    @abstractmethod
    async def resolve_playback(self, content_id: str, media_type: str) -> Optional[PlaybackResponse]:
        pass
