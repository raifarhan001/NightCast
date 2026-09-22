from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime

from database import get_db
import models
import schemas
import auth

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
        if payload.title:
            existing.title = payload.title
        if payload.poster_path:
            existing.poster_path = payload.poster_path
        if payload.backdrop_path:
            existing.backdrop_path = payload.backdrop_path
    else:
        new_cw = models.ContinueWatching(
            profile_id=active_profile.id,
            media_id=payload.id,
            media_type=payload.media_type,
            title=payload.title,
            poster_path=payload.poster_path,
            backdrop_path=payload.backdrop_path,
            season=payload.season,
            episode=payload.episode,
            progress_percent=payload.progress,
            timestamp_seconds=payload.current_time,
            duration_seconds=payload.duration
        )
        db.add(new_cw)
    db.commit()


    # Log into watch history only when content was actually engaged with (>= 1.5% or >= 25s or ended)
    if payload.progress >= 1.5 or payload.current_time >= 25.0 or payload.event == "ended":
        clean_media_id = str(payload.id).split('_s')[0].split('-s')[0].split('_')[0].strip()
        existing_history = db.query(models.WatchHistory).filter(
            models.WatchHistory.profile_id == active_profile.id,
            (models.WatchHistory.media_id == payload.id) | (models.WatchHistory.media_id == clean_media_id)
        ).first()

        if existing_history:
            existing_history.progress_percent = max(existing_history.progress_percent or 0, payload.progress)
            existing_history.watched_at = datetime.utcnow()
            if payload.title:
                existing_history.title = payload.title
            if payload.poster_path:
                existing_history.poster_path = payload.poster_path
        else:
            history_entry = models.WatchHistory(
                profile_id=active_profile.id,
                media_id=clean_media_id,
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
    
    # Consolidate by clean media_id so each TV show/movie only appears once with its latest watched episode
    seen_media = set()
    consolidated = []
    for item in items:
        clean_id = item.media_id.split('_s')[0].split('-s')[0].split('_')[0].strip()
        if item.progress_percent >= 92.0:
            continue
        is_up_next = (item.season is not None and item.episode is not None and item.progress_percent >= 1.0)
        has_watched = (item.progress_percent >= 1.5 or (item.timestamp_seconds or 0) >= 5.0)
        if not is_up_next and not has_watched:
            continue
        if clean_id not in seen_media:
            seen_media.add(clean_id)
            item.media_id = clean_id
            consolidated.append(item)
    return consolidated

@router.get("/history", response_model=List[schemas.WatchHistoryResponse])
def get_history(
    active_profile: models.Profile = Depends(auth.get_active_profile),
    db: Session = Depends(get_db)
):
    # Retrieve watch history, filter out 0% junk, and deduplicate by media_id
    items = db.query(models.WatchHistory).filter(
        models.WatchHistory.profile_id == active_profile.id,
        models.WatchHistory.progress_percent >= 1.0
    ).order_by(models.WatchHistory.watched_at.desc()).all()

    seen_media = set()
    deduped = []
    for item in items:
        clean_id = str(item.media_id).split('_s')[0].split('-s')[0].split('_')[0].strip()
        if clean_id not in seen_media:
            seen_media.add(clean_id)
            deduped.append(item)
            if len(deduped) >= 50:
                break
    return deduped

@router.delete("/continue/{media_id}")
def delete_continue_item(
    media_id: str,
    season: int = None,
    episode: int = None,
    active_profile: models.Profile = Depends(auth.get_active_profile),
    db: Session = Depends(get_db)
):
    clean_id = media_id.split('_s')[0].split('-s')[0].split('_')[0].strip()
    query = db.query(models.ContinueWatching).filter(
        models.ContinueWatching.profile_id == active_profile.id,
        (models.ContinueWatching.media_id == media_id) | (models.ContinueWatching.media_id == clean_id)
    )
    if season is not None:
        query = query.filter(models.ContinueWatching.season == season)
    if episode is not None:
        query = query.filter(models.ContinueWatching.episode == episode)
    query.delete()
    db.commit()
    return {"status": "deleted"}

@router.delete("/history")
def clear_history(
    active_profile: models.Profile = Depends(auth.get_active_profile),
    db: Session = Depends(get_db)
):
    db.query(models.WatchHistory).filter(models.WatchHistory.profile_id == active_profile.id).delete()
    db.commit()
    return {"message": "Watch history cleared"}

@router.delete("/history/{item_id}")
def delete_single_history(
    item_id: str,
    active_profile: models.Profile = Depends(auth.get_active_profile),
    db: Session = Depends(get_db)
):
    clean_id = item_id.split('_s')[0].split('-s')[0].split('_')[0].strip()
    db.query(models.WatchHistory).filter(
        models.WatchHistory.profile_id == active_profile.id,
        (models.WatchHistory.id == item_id) | (models.WatchHistory.media_id == item_id) | (models.WatchHistory.media_id == clean_id)
    ).delete()
    db.commit()
    return {"message": "Item deleted from history"}

