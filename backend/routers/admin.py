from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from uuid import UUID

from ..database import get_db
from .. import models, auth, schemas

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats")
def get_stats(
    current_admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    user_count = db.query(models.User).count()
    profile_count = db.query(models.Profile).count()
    history_count = db.query(models.WatchHistory).count()
    review_count = db.query(models.Review).count()
    favorites_count = db.query(models.Favorite).count()
    
    return {
        "users": user_count,
        "profiles": profile_count,
        "plays": history_count,
        "reviews": review_count,
        "favorites": favorites_count
    }

@router.get("/users")
def get_users_list(
    current_admin: models.User = Depends(auth.get_current_admin),
    db: Session = Depends(get_db)
):
    users = db.query(models.User).all()
    results = []
    for u in users:
        profiles = db.query(models.Profile).filter(models.Profile.user_id == u.id).all()
        results.append({
            "id": u.id,
            "email": u.email,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "created_at": u.created_at,
            "profile_count": len(profiles),
            "profiles": [{"id": p.id, "name": p.name} for p in profiles]
        })
    return results

@router.get("/logs")
def get_system_logs(
    current_admin: models.User = Depends(auth.get_current_admin)
):
    # Simulated structure representing container/system logs
    return [
        {"timestamp": "2026-07-15T00:01:10Z", "level": "INFO", "message": "Vidking Backend listening on port 8000"},
        {"timestamp": "2026-07-15T00:01:12Z", "level": "INFO", "message": "Connected to pgvector Database successfully"},
        {"timestamp": "2026-07-15T00:01:15Z", "level": "INFO", "message": "Redis connection active (TTL 21600)"},
        {"timestamp": "2026-07-15T00:05:43Z", "level": "INFO", "message": "Pre-populating mock vector database embeddings... completed"},
        {"timestamp": "2026-07-15T00:10:22Z", "level": "WARNING", "message": "Rate limit threshold reached for sub-route /auth/login"},
        {"timestamp": "2026-07-15T00:12:05Z", "level": "INFO", "message": "Progress sync trigger completed for movie ID 1078605"}
    ]
