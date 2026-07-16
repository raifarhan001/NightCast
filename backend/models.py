import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Float, Integer, ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    profiles = relationship("Profile", back_populates="user", cascade="all, delete-orphan")

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="profiles")
    continue_watching = relationship("ContinueWatching", back_populates="profile", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="profile", cascade="all, delete-orphan")
    history = relationship("WatchHistory", back_populates="profile", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="profile", cascade="all, delete-orphan")
    settings = relationship("Setting", back_populates="profile", uselist=False, cascade="all, delete-orphan")

class ContinueWatching(Base):
    __tablename__ = "continue_watching"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    media_id = Column(String, nullable=False)  # tmdbId
    media_type = Column(String, nullable=False)  # 'movie' or 'tv'
    title = Column(String, nullable=False)
    poster_path = Column(String, nullable=True)
    season = Column(Integer, nullable=True)      # TV only
    episode = Column(Integer, nullable=True)     # TV only
    progress_percent = Column(Float, default=0.0)
    timestamp_seconds = Column(Float, default=0.0)
    duration_seconds = Column(Float, default=0.0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    profile = relationship("Profile", back_populates="continue_watching")

    __table_args__ = (
        UniqueConstraint('profile_id', 'media_id', 'season', 'episode', name='uq_profile_media_episode'),
    )

class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    media_id = Column(String, nullable=False)
    media_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    poster_path = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    profile = relationship("Profile", back_populates="favorites")

    __table_args__ = (
        UniqueConstraint('profile_id', 'media_id', name='uq_profile_favorite'),
    )

class WatchHistory(Base):
    __tablename__ = "watch_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    media_id = Column(String, nullable=False)
    media_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    poster_path = Column(String, nullable=True)
    progress_percent = Column(Float, default=0.0)
    watched_at = Column(DateTime(timezone=True), server_default=func.now())

    profile = relationship("Profile", back_populates="history")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    media_id = Column(String, nullable=False)
    media_type = Column(String, nullable=False)
    rating = Column(Float, nullable=False)  # 0.0 to 10.0 or 1.0 to 5.0
    review_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    profile = relationship("Profile", back_populates="reviews")

class Setting(Base):
    __tablename__ = "settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, unique=True)
    theme = Column(String, default="dark")
    autoplay = Column(Boolean, default=True)
    subtitles_enabled = Column(Boolean, default=True)
    preferred_language = Column(String, default="en")

    profile = relationship("Profile", back_populates="settings")

class SemanticMetadata(Base):
    __tablename__ = "semantic_metadata"

    media_id = Column(String, primary_key=True)
    media_type = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    embedding = Column(Vector(384), nullable=False)  # matches sentence-transformers MiniLM embedding output size
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
