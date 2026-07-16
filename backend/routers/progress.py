from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/progress", tags=["progress"])

@router.post("/update", status_code=status.HTTP_200_OK)
def update_progress(
    payload: schemas.ProgressUpdatePayload,
    active_profile: models.Profile = Depends(auth.get_active_profile),
    db: Session = Depends(get_db)
):
    # Upsert continue watching list - Database Agnostic ORM
    existing = db.query(models.ContinueWatching).filter(
        models.ContinueWatching.profile_id == active_profile.id,
        models.ContinueWatching.media_id == payload.id,
        models.ContinueWatching.season == payload.season,
        models.ContinueWatching.episode == payload.episode
    ).first()

    if existing:
        existing.progress_percent = payload.progress
        existing.timestamp_seconds = payload.current_time
        existing.duration_seconds = payload.duration
    else:
        new_cw = models.ContinueWatching(
            profile_id=active_profile.id,
            media_id=payload.id,
            media_type=payload.media_type,
            title=payload.title,
            poster_path=payload.poster_path,
            season=payload.season,
            episode=payload.episode,
            progress_percent=payload.progress,
            timestamp_seconds=payload.current_time,
            duration_seconds=payload.duration
        )
        db.add(new_cw)
    db.commit()


    # Log into watch history
    history_entry = models.WatchHistory(
        profile_id=active_profile.id,
        media_id=payload.id,
        media_type=payload.media_type,
        title=payload.title,
        poster_path=payload.poster_path,
        progress_percent=payload.progress
    )
    db.add(history_entry)
    db.commit()

    # Clean up continue watching list if play has ended (progress > 95%)
    if payload.progress >= 95.0 or payload.event == "ended":
        db.query(models.ContinueWatching).filter(
            models.ContinueWatching.profile_id == active_profile.id,
            models.ContinueWatching.media_id == payload.id,
            models.ContinueWatching.season == payload.season,
            models.ContinueWatching.episode == payload.episode
        ).delete()
        db.commit()

    return {"status": "success"}

@router.get("/continue", response_model=List[schemas.ContinueWatchingResponse])
def get_continue_watching(
    active_profile: models.Profile = Depends(auth.get_active_profile),
    db: Session = Depends(get_db)
):
    items = db.query(models.ContinueWatching).filter(
        models.ContinueWatching.profile_id == active_profile.id
    ).order_by(models.ContinueWatching.updated_at.desc()).all()
    return items

@router.get("/history", response_model=List[schemas.WatchHistoryResponse])
def get_history(
    active_profile: models.Profile = Depends(auth.get_active_profile),
    db: Session = Depends(get_db)
):
    items = db.query(models.WatchHistory).filter(
        models.WatchHistory.profile_id == active_profile.id
    ).order_by(models.WatchHistory.watched_at.desc()).limit(50).all()
    return items

@router.delete("/history")
def clear_history(
    active_profile: models.Profile = Depends(auth.get_active_profile),
    db: Session = Depends(get_db)
):
    db.query(models.WatchHistory).filter(models.WatchHistory.profile_id == active_profile.id).delete()
    db.commit()
    return {"message": "Watch history cleared"}
