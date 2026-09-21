from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from database import get_db
import models
import schemas
import auth

router = APIRouter(prefix="/user", tags=["user"])

# --- Favorites ---
@router.post("/favorites", response_model=schemas.FavoriteResponse)
def add_favorite(
    fav: schemas.FavoriteCreate,
    active_profile: models.Profile = Depends(auth.get_active_profile),
    db: Session = Depends(get_db)
):
    # Database Agnostic ORM check
    existing = db.query(models.Favorite).filter(
        models.Favorite.profile_id == active_profile.id,
        models.Favorite.media_id == fav.media_id
    ).first()
    
    if not existing:
        new_fav = models.Favorite(
            profile_id=active_profile.id,
            media_id=fav.media_id,
            media_type=fav.media_type,
            title=fav.title,
            poster_path=fav.poster_path
        )
        db.add(new_fav)
        db.commit()
        existing = new_fav
        
    return existing


@router.get("/favorites", response_model=List[schemas.FavoriteResponse])
def get_favorites(
    active_profile: models.Profile = Depends(auth.get_active_profile),
    db: Session = Depends(get_db)
):
    items = db.query(models.Favorite).filter(models.Favorite.profile_id == active_profile.id).all()
    return items

@router.delete("/favorites/{media_id}")
def remove_favorite(
    media_id: str,
    active_profile: models.Profile = Depends(auth.get_active_profile),
    db: Session = Depends(get_db)
):
    db.query(models.Favorite).filter(
        models.Favorite.profile_id == active_profile.id,
        models.Favorite.media_id == media_id
    ).delete()
    db.commit()
    return {"message": "Removed from favorites"}

# --- Bidirectional Cloud Sync ---
@router.post("/sync", response_model=schemas.UserSyncResponse)
def sync_user_data(
    payload: schemas.UserSyncPayload,
    active_profile: models.Profile = Depends(auth.get_active_profile),
    db: Session = Depends(get_db)
):
    # 1. Ingest incoming continue_watching
    if payload.continue_watching:
        for item in payload.continue_watching:
            raw_id = str(item.media_id or item.id or '').strip()
            if not raw_id:
                continue
            clean_id = raw_id.split('_s')[0].split('-s')[0].split('_')[0].strip()
            progress = float(item.progress_percent or 0)
            seconds = float(item.timestamp_seconds or 0)
            duration = float(item.duration_seconds or 0)

            # Skip completed items or empty items
            if progress >= 92.0 or (duration > 60 and seconds >= duration - 30):
                continue
            if progress < 1.0 and seconds < 5.0:
                continue

            s_num = int(item.season) if item.season is not None and str(item.season).isdigit() else None
            ep_num = int(item.episode) if item.episode is not None and str(item.episode).isdigit() else None

            existing = db.query(models.ContinueWatching).filter(
                models.ContinueWatching.profile_id == active_profile.id,
                models.ContinueWatching.media_id == clean_id,
                models.ContinueWatching.season == s_num,
                models.ContinueWatching.episode == ep_num
            ).first()

            if existing:
                if seconds > (existing.timestamp_seconds or 0) or progress > (existing.progress_percent or 0):
                    existing.progress_percent = progress
                    existing.timestamp_seconds = seconds
                    existing.duration_seconds = duration
            else:
                new_cw = models.ContinueWatching(
                    profile_id=active_profile.id,
                    media_id=clean_id,
                    media_type=item.media_type or "movie",
                    title=item.title or "Untitled",
                    poster_path=item.poster_path,
                    season=s_num,
                    episode=ep_num,
                    progress_percent=progress,
                    timestamp_seconds=seconds,
                    duration_seconds=duration
                )
                db.add(new_cw)
        db.commit()

    # 2. Ingest incoming watchlist (favorites)
    if payload.watchlist:
        for item in payload.watchlist:
            raw_id = str(item.media_id or item.id or '').strip()
            if not raw_id:
                continue
            clean_id = raw_id.split('_s')[0].split('-s')[0].split('_')[0].strip()

            existing_fav = db.query(models.Favorite).filter(
                models.Favorite.profile_id == active_profile.id,
                models.Favorite.media_id == clean_id
            ).first()

            if not existing_fav:
                new_fav = models.Favorite(
                    profile_id=active_profile.id,
                    media_id=clean_id,
                    media_type=item.media_type or "movie",
                    title=item.title or "Untitled",
                    poster_path=item.poster_path
                )
                db.add(new_fav)
        db.commit()

    # 3. Retrieve consolidated latest database state
    cw_items = db.query(models.ContinueWatching).filter(
        models.ContinueWatching.profile_id == active_profile.id
    ).order_by(models.ContinueWatching.updated_at.desc()).all()

    seen_media = set()
    consolidated_cw = []
    for cw in cw_items:
        clean_id = cw.media_id.split('_s')[0].split('-s')[0].split('_')[0].strip()
        if cw.progress_percent >= 92.0:
            continue
        if clean_id not in seen_media:
            seen_media.add(clean_id)
            cw.media_id = clean_id
            consolidated_cw.append(cw)

    fav_items = db.query(models.Favorite).filter(
        models.Favorite.profile_id == active_profile.id
    ).order_by(models.Favorite.created_at.desc()).all()

    return {
        "continue_watching": consolidated_cw,
        "watchlist": fav_items
    }

# --- Reviews ---
@router.post("/reviews", response_model=schemas.ReviewResponse)
def create_review(
    review_data: schemas.ReviewCreate,
    active_profile: models.Profile = Depends(auth.get_active_profile),
    db: Session = Depends(get_db)
):
    # Check if review already exists
    existing = db.query(models.Review).filter(
        models.Review.profile_id == active_profile.id,
        models.Review.media_id == review_data.media_id
    ).first()
    
    if existing:
        existing.rating = review_data.rating
        existing.review_text = review_data.review_text
        db.commit()
        db.refresh(existing)
        # Add profile name dynamically
        existing.profile_name = active_profile.name
        return existing

    new_review = models.Review(
        profile_id=active_profile.id,
        media_id=review_data.media_id,
        media_type=review_data.media_type,
        rating=review_data.rating,
        review_text=review_data.review_text
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    new_review.profile_name = active_profile.name
    return new_review

@router.get("/reviews/{media_id}", response_model=List[schemas.ReviewResponse])
def get_reviews_for_media(
    media_id: str,
    db: Session = Depends(get_db)
):
    reviews = db.query(models.Review).filter(models.Review.media_id == media_id).all()
    # Populate profile names
    results = []
    for r in reviews:
        prof = db.query(models.Profile).filter(models.Profile.id == r.profile_id).first()
        r.profile_name = prof.name if prof else "Anonymous"
        results.append(r)
    return results
