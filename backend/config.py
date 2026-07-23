import os
from pydantic_settings import BaseSettings

# Locate the root .env file relative to this file
backend_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(backend_dir)
root_env = os.path.join(root_dir, ".env")
backend_env = os.path.join(backend_dir, ".env")

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./vidking.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    TMDB_API_KEY: str = ""
    JWT_SECRET: str = "supersecretjwtkey123!"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 1 day
    OPENAI_API_KEY: str = ""

    class Config:
        env_file = (root_env, backend_env)
        extra = "ignore"

settings = Settings()
