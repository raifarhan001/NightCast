import os
from pydantic_settings import BaseSettings

# Locate the root .env file relative to this file
backend_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(backend_dir)
root_env = os.path.join(root_dir, ".env")
backend_env = os.path.join(backend_dir, ".env")

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://neondb_owner:npg_bTniarKU9Lg8@ep-steep-salad-b5tcoxee-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require"
    REDIS_URL: str = "redis://localhost:6379/0"
    TMDB_API_KEY: str = "8b36fc4dff6127d090085bcebf286978"
    JWT_SECRET: str = "supersecretjwtkey123!"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days
    OPENAI_API_KEY: str = ""

    class Config:
        env_file = (root_env, backend_env)
        extra = "ignore"

settings = Settings()
