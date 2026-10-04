from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
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
    clean_id = str(payload.id).split('_s')[0].split('-s')[0].split('_')[0].strip()
    s_num = int(payload.season) if payload.season is not None and str(payload.season).isdigit() else None
    ep_num = int(payload.episode) if payload.episode is not None and str(payload.episode).isdigit() else None

    # Upsert continue watching list - Database Agnostic ORM
    if s_num is None and ep_num is None:
        existing = db.query(models.ContinueWatching).filter(
            models.ContinueWatching.profile_id == active_profile.id,
            (models.ContinueWatching.media_id == clean_id) | (models.ContinueWatching.media_id == str(payload.id)),
            (models.ContinueWatching.season.is_(None)) | (models.ContinueWatching.season == 0)
        ).first()
    else:
        existing = db.query(models.ContinueWatching).filter(
            models.ContinueWatching.profile_id == active_profile.id,
            (models.ContinueWatching.media_id == clean_id) | (models.ContinueWatching.media_id == str(payload.id)),
            models.ContinueWatching.season == s_num,
            models.ContinueWatching.episode == ep_num
        ).first()

    if existing:
        existing.media_id = clean_id
        existing.season = s_num
        existing.episode = ep_num
        existing.progress_percent = payload.progress or 0.0
        existing.timestamp_seconds = payload.current_time or 0.0
        existing.duration_seconds = payload.duration or 0.0
        if payload.title:
            existing.title = payload.title
        if payload.poster_path:
            existing.poster_path = payload.poster_path
        if payload.backdrop_path:
            existing.backdrop_path = payload.backdrop_path

        # Purge any redundant duplicate rows for this movie
        if s_num is None and ep_num is None:
            db.query(models.ContinueWatching).filter(
                models.ContinueWatching.profile_id == active_profile.id,
                (models.ContinueWatching.media_id == clean_id) | (models.ContinueWatching.media_id == str(payload.id)),
                (models.ContinueWatching.season.is_(None)) | (models.ContinueWatching.season == 0),
                models.ContinueWatching.id != existing.id
            ).delete(synchronize_session=False)
    else:
        new_cw = models.ContinueWatching(
            profile_id=active_profile.id,
            media_id=clean_id,
            media_type=payload.media_type or ("tv" if s_num is not None else "movie"),
            title=payload.title or "Untitled",
            poster_path=payload.poster_path,
            backdrop_path=payload.backdrop_path,
            season=s_num,
            episode=ep_num,
            progress_percent=payload.progress,
            timestamp_seconds=payload.current_time,
            duration_seconds=payload.duration
        )
        db.add(new_cw)
    db.commit()

    # Log into watch history when content was engaged with (>= 1.5% or >= 25s) or ended/skipped
    if (payload.progress or 0.0) >= 1.5 or (payload.current_time or 0.0) >= 25.0 or payload.event in ("ended", "skipped"):
        existing_history = db.query(models.WatchHistory).filter(
            models.WatchHistory.profile_id == active_profile.id,
            (models.WatchHistory.media_id == clean_id) | (models.WatchHistory.media_id == str(payload.id))
        ).first()

        eff_progress = 100.0 if payload.event in ("ended", "skipped") else max(payload.progress or 0.0, 0.0)

        if existing_history:
            existing_history.media_id = clean_id
            existing_history.progress_percent = max(existing_history.progress_percent or 0, eff_progress)
            existing_history.watched_at = datetime.utcnow()
            if payload.title:
                existing_history.title = payload.title
            if payload.poster_path:
                existing_history.poster_path = payload.poster_path
        else:
            history_entry = models.WatchHistory(
                profile_id=active_profile.id,
                media_id=clean_id,
                media_type=payload.media_type or ("tv" if s_num is not None else "movie"),
                title=payload.title or "Untitled",
                poster_path=payload.poster_path,
                progress_percent=eff_progress
            )
            db.add(history_entry)
        db.commit()

    # Clean up continue watching list if play has ended (progress >= 90% or ended/skipped event)
    if (payload.progress or 0.0) >= 90.0 or ((payload.duration or 0.0) > 60 and (payload.current_time or 0.0) >= (payload.duration or 0.0) - 25) or payload.event in ("ended", "skipped"):
        cw_delete_query = db.query(models.ContinueWatching).filter(
            models.ContinueWatching.profile_id == active_profile.id,
            (models.ContinueWatching.media_id == clean_id) | (models.ContinueWatching.media_id == str(payload.id))
        )
        if s_num is not None or ep_num is not None:
            cw_delete_query = cw_delete_query.filter(
                models.ContinueWatching.season == s_num,
                models.ContinueWatching.episode == ep_num
            )
        else:
            cw_delete_query = cw_delete_query.filter(
                (models.ContinueWatching.season.is_(None)) | (models.ContinueWatching.season == 0)
            )
        cw_delete_query.delete(synchronize_session=False)
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
    # When a title is dismissed, purge all entries for that show/movie so older episodes don't resurrect
    query = db.query(models.ContinueWatching).filter(
        models.ContinueWatching.profile_id == active_profile.id,
        (models.ContinueWatching.media_id == media_id) | 
        (models.ContinueWatching.media_id == clean_id) |
        (models.ContinueWatching.media_id.like(f"{clean_id}\\_%")) |
        (models.ContinueWatching.media_id.like(f"{clean_id}-%"))
    )
    query.delete(synchronize_session=False)
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
    filters = [
        models.WatchHistory.media_id == item_id,
        models.WatchHistory.media_id == clean_id
    ]
    try:
        uuid_val = UUID(item_id)
        filters.append(models.WatchHistory.id == uuid_val)
    except (ValueError, TypeError, AttributeError):
        pass

    db.query(models.WatchHistory).filter(
        models.WatchHistory.profile_id == active_profile.id,
        or_(*filters)
    ).delete(synchronize_session=False)
    db.commit()
    return {"message": "Item deleted from history"}

