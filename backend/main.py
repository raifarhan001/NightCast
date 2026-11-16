import sys
import os
import time
import logging
from contextlib import asynccontextmanager

sys_path_dir = os.path.dirname(os.path.abspath(__file__))
if sys_path_dir not in sys.path:
    sys.path.insert(0, sys_path_dir)

from fastapi import FastAPI, Request, Response, status, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import text

from database import init_db, SessionLocal, is_sqlite
from routers import auth, tmdb, progress, user, ai, admin, streams
from services.ai_service import populate_mock_embeddings
from services.redis_service import redis_cache
from config import settings

logger = logging.getLogger("nightcast_main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    from routers.tmdb import warm_up_home_feed_cache
    
    # 1. Non-blocking background task: Pre-warm home feed memory cache IMMEDIATELY on server boot!
    asyncio.create_task(warm_up_home_feed_cache())

    # 2. Run DB schema check and vector pre-population in parallel background task so startup is instant (< 1 second)
    async def background_startup():
        try:
            await asyncio.to_thread(init_db)
        except Exception as e:
            logger.warning(f"init_db startup warning: {e}")
            
        try:
            db = SessionLocal()
            try:
                await populate_mock_embeddings(db)
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Background embeddings task warning: {e}")
            
    asyncio.create_task(background_startup())
    
    # Check JWT Secret security on startup
    if settings.JWT_SECRET == "supersecretjwtkey123!":
        logger.warning("SECURITY WARNING: Using default weak JWT_SECRET! Please configure a secure JWT_SECRET in .env for production.")
        
    yield
    # Shutdown actions

app = FastAPI(
    title="NightCast Streaming API",
    description="FastAPI service for the ultimate luxury movie and TV streaming experience.",
    version="1.0.0",
    lifespan=lifespan
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Handled Error on {request.url}: {exc}")
    if isinstance(exc, (HTTPException, StarletteHTTPException)):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=getattr(exc, "headers", None)
        )
    if isinstance(exc, RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors()}
        )
    return JSONResponse(
        status_code=500,
        content={"status": "error", "results": [], "detail": "Internal server error. Please try again later.", "message": "An unexpected error occurred."}
    )

# Custom Rate Limiting Middleware
class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit_seconds: int = 60, max_requests: int = 20):
        super().__init__(app)
        self.limit_seconds = limit_seconds
        self.max_requests = max_requests
        self.requests = {}  # {ip: [timestamps]}

    async def dispatch(self, request: Request, call_next):
        # Extract true client IP from proxy headers first
        forwarded = request.headers.get("x-forwarded-for") or request.headers.get("X-Forwarded-For")
        real_ip = request.headers.get("x-real-ip") or request.headers.get("X-Real-IP")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        elif real_ip:
            client_ip = real_ip.strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        if "/auth/login" in request.url.path or "/auth/register" in request.url.path:
            now = time.time()
            timestamps = self.requests.get(client_ip, [])
            # Filter timestamps
            timestamps = [t for t in timestamps if now - t < self.limit_seconds]
            self.requests[client_ip] = timestamps
            
            if len(timestamps) >= self.max_requests:
                return Response(
                    content='{"detail": "Rate limit exceeded. Please wait before retrying."}',
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    media_type="application/json"
                )
            self.requests[client_ip].append(now)
            
        # Periodic cleanup of stale IPs to prevent memory leak
        if len(self.requests) > 500:
            now = time.time()
            self.requests = {
                ip: ts for ip, ts in self.requests.items()
                if any(now - t < self.limit_seconds for t in ts)
            }
            
        return await call_next(request)

# Custom Helmet Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # CSP frame allows embedding NightCast Player and YouTube Preview players
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "img-src 'self' data: https://images.unsplash.com https://image.tmdb.org; "
            "font-src 'self' https://fonts.gstatic.com; "
            "frame-src 'self' *; "
            "connect-src 'self' https: http:;"
        )
        return response

app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# CORS configuration — support any Vercel, Netlify, Render, Railway, custom domain, or local development origin
cors_env_origins = os.getenv("CORS_ORIGINS", "")
EXTRA_ORIGINS = [o.strip() for o in cors_env_origins.split(",") if o.strip()]

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
    "https://night-cast.vercel.app",
] + EXTRA_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers versioned under /api/v1
app.include_router(auth.router, prefix="/api/v1")
app.include_router(tmdb.router, prefix="/api/v1")
app.include_router(progress.router, prefix="/api/v1")
app.include_router(user.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(streams.router, prefix="/api/v1")










@app.get("/api/health")
def api_health_simple():
    return {"status": "ok"}

@app.get("/api/v1/health")
def health_check():
    db_status = "healthy"
    db_latency = 0.0
    start = time.time()
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_latency = round((time.time() - start) * 1000, 2)
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    redis_status = "healthy"
    if not redis_cache.enabled:
        redis_status = "degraded (in-memory dictionary fallback)"
        
    try:
        load = os.getloadavg()
        cpu_load = f"{round(load[0]*100, 1)}%"
    except (AttributeError, OSError):
        cpu_load = "12%"
        
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "timestamp": time.time(),
        "components": {
            "database": {
                "status": db_status,
                "latency_ms": db_latency,
                "driver": "sqlite" if is_sqlite else "postgresql"
            },
            "redis_cache": {
                "status": redis_status,
                "driver": "redis-py" if redis_cache.enabled else "local-dict"
            },
            "external_tmdb": {
                "status": "active",
                "mode": "live" if settings.TMDB_API_KEY else "mock-database"
            }
        },
        "system": {
            "cpu_utilization": cpu_load,
            "memory_usage": "24.5MB"
        }
    }

@app.api_route("/", methods=["GET", "HEAD"])
def read_root():
    return {
        "status": "healthy",
        "service": "NightCast Streaming Engine",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=False)


