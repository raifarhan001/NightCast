from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime

# --- Token & Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    is_admin: bool = False

class TokenData(BaseModel):
    email: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Settings Schemas ---
class SettingBase(BaseModel):
    theme: str = "dark"
    autoplay: bool = True
    subtitles_enabled: bool = True
    preferred_language: str = "en"

class SettingUpdate(BaseModel):
    theme: Optional[str] = None
    autoplay: Optional[bool] = None
    subtitles_enabled: Optional[bool] = None
    preferred_language: Optional[str] = None

class SettingResponse(SettingBase):
    id: UUID
    profile_id: UUID

    class Config:
        from_attributes = True

# --- Profile Schemas ---
class ProfileCreate(BaseModel):
    name: str
    avatar_url: Optional[str] = None

class ProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    avatar_url: Optional[str] = None
    created_at: datetime
    settings: Optional[SettingResponse] = None

    class Config:
        from_attributes = True

# --- Favorite Schemas ---
class FavoriteCreate(BaseModel):
    media_id: str
    media_type: str
    title: str
    poster_path: Optional[str] = None

class FavoriteResponse(BaseModel):
    id: UUID
    profile_id: UUID
    media_id: str
    media_type: str
    title: str
    poster_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Review Schemas ---
class ReviewCreate(BaseModel):
    media_id: str
    media_type: str
    rating: float = Field(..., ge=0.0, le=10.0)
    review_text: Optional[str] = None

class ReviewResponse(BaseModel):
    id: UUID
    profile_id: UUID
    profile_name: Optional[str] = None
    media_id: str
    media_type: str
    rating: float
    review_text: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Continue Watching & History Schemas ---
class ProgressUpdatePayload(BaseModel):
    media_type: str = Field(..., alias="mediaType")
    id: str
    current_time: float = Field(..., alias="currentTime")
    duration: float
    progress: float
    season: Optional[int] = None
    episode: Optional[int] = None
    event: str
    title: str
    poster_path: Optional[str] = Field(None, alias="posterPath")

    class Config:
        populate_by_name = True

class ContinueWatchingResponse(BaseModel):
    id: UUID
    profile_id: UUID
    media_id: str
    media_type: str
    title: str
    poster_path: Optional[str] = None
    season: Optional[int] = None
    episode: Optional[int] = None
    progress_percent: float
    timestamp_seconds: float
    duration_seconds: float
    updated_at: datetime

    class Config:
        from_attributes = True

class WatchHistoryResponse(BaseModel):
    id: UUID
    profile_id: UUID
    media_id: str
    media_type: str
    title: str
    poster_path: Optional[str] = None
    progress_percent: float
    watched_at: datetime

    class Config:
        from_attributes = True

# --- AI & Search Schemas ---
class SemanticSearchQuery(BaseModel):
    query: str
    limit: Optional[int] = 12

class AIRecommendQuery(BaseModel):
    profile_id: UUID
    limit: Optional[int] = 12
