import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgrespassword@localhost:5432/vidking")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    TMDB_API_KEY: str = os.getenv("TMDB_API_KEY", "")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecretjwtkey123!")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 1 day
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
