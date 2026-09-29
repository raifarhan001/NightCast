from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

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
    # 1. Purge explicitly dismissed items from cloud database so they never resurrect
    dismissed_set = set()
    if payload.dismissed_ids:
        for did in payload.dismissed_ids:
            clean_d = str(did).split('_s')[0].split('-s')[0].split('_')[0].strip()
            if clean_d:
                dismissed_set.add(clean_d)
                db.query(models.ContinueWatching).filter(
                    models.ContinueWatching.profile_id == active_profile.id,
                    (models.ContinueWatching.media_id == clean_d) |
                    (models.ContinueWatching.media_id == str(did)) |
                    (models.ContinueWatching.media_id.like(f"{clean_d}\\_%")) |
                    (models.ContinueWatching.media_id.like(f"{clean_d}-%"))
                ).delete(synchronize_session=False)
        db.commit()

    # 2. Ingest incoming continue_watching
    if payload.continue_watching:
        for item in payload.continue_watching:
            raw_id = str(item.media_id or item.id or '').strip()
            if not raw_id:
                continue
            clean_id = raw_id.split('_s')[0].split('-s')[0].split('_')[0].strip()
            if clean_id in dismissed_set:
                continue

            progress = float(item.progress_percent or 0)
            seconds = float(item.timestamp_seconds or 0)
            duration = float(item.duration_seconds or 0)

            # Clean completed items from DB so they do not resurrect
            if progress >= 90.0 or (duration > 60 and seconds >= duration - 25):
                db.query(models.ContinueWatching).filter(
                    models.ContinueWatching.profile_id == active_profile.id,
                    (models.ContinueWatching.media_id == clean_id) |
                    (models.ContinueWatching.media_id == raw_id) |
                    (models.ContinueWatching.media_id.like(f"{clean_id}\\_%")) |
                    (models.ContinueWatching.media_id.like(f"{clean_id}-%"))
                ).delete(synchronize_session=False)
                continue

            if progress < 0.5 and seconds < 3.0:
                continue

            s_num = int(item.season) if item.season is not None and str(item.season).isdigit() else None
            ep_num = int(item.episode) if item.episode is not None and str(item.episode).isdigit() else None

            incoming_time = None
            if item.updated_at:
                try:
                    incoming_time = datetime.fromisoformat(str(item.updated_at).replace("Z", "+00:00"))
                except Exception:
                    pass

            if s_num is None and ep_num is None:
                existing = db.query(models.ContinueWatching).filter(
                    models.ContinueWatching.profile_id == active_profile.id,
                    (models.ContinueWatching.media_id == clean_id) | (models.ContinueWatching.media_id == raw_id),
                    (models.ContinueWatching.season.is_(None)) | (models.ContinueWatching.season == 0)
                ).first()
            else:
                existing = db.query(models.ContinueWatching).filter(
                    models.ContinueWatching.profile_id == active_profile.id,
                    (models.ContinueWatching.media_id == clean_id) | (models.ContinueWatching.media_id == raw_id),
                    models.ContinueWatching.season == s_num,
                    models.ContinueWatching.episode == ep_num
                ).first()

            if existing:
                client_is_newer = False
                if incoming_time and existing.updated_at:
                    ex_time = existing.updated_at
                    if ex_time.tzinfo is None and incoming_time.tzinfo is not None:
                        ex_time = ex_time.replace(tzinfo=incoming_time.tzinfo)
                    client_is_newer = incoming_time >= ex_time

                if client_is_newer or seconds > (existing.timestamp_seconds or 0) or progress > (existing.progress_percent or 0):
                    existing.media_id = clean_id
                    existing.season = s_num
                    existing.episode = ep_num
                    existing.progress_percent = progress
                    existing.timestamp_seconds = seconds
                    existing.duration_seconds = duration
                if item.backdrop_path:
                    existing.backdrop_path = item.backdrop_path
                if item.poster_path:
                    existing.poster_path = item.poster_path

                if s_num is None and ep_num is None:
                    db.query(models.ContinueWatching).filter(
                        models.ContinueWatching.profile_id == active_profile.id,
                        (models.ContinueWatching.media_id == clean_id) | (models.ContinueWatching.media_id == raw_id),
                        (models.ContinueWatching.season.is_(None)) | (models.ContinueWatching.season == 0),
                        models.ContinueWatching.id != existing.id
                    ).delete(synchronize_session=False)
            else:
                new_cw = models.ContinueWatching(
                    profile_id=active_profile.id,
                    media_id=clean_id,
                    media_type=item.media_type or ("tv" if s_num is not None else "movie"),
                    title=item.title or "Untitled",
                    poster_path=item.poster_path,
                    backdrop_path=item.backdrop_path,
                    season=s_num,
                    episode=ep_num,
                    progress_percent=progress,
                    timestamp_seconds=seconds,
                    duration_seconds=duration
                )
                db.add(new_cw)
        db.commit()

    # 3. Ingest incoming watchlist (favorites)
    if payload.watchlist:
        for item in payload.watchlist:
            raw_id = str(item.media_id or item.id or '').strip()
            if not raw_id:
                continue
            clean_id = raw_id.split('_s')[0].split('-s')[0].split('_')[0].strip()

            existing_fav = db.query(models.Favorite).filter(
                models.Favorite.profile_id == active_profile.id,
                (models.Favorite.media_id == clean_id) | (models.Favorite.media_id == raw_id)
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

    # 4. Retrieve consolidated latest database state
    cw_items = db.query(models.ContinueWatching).filter(
        models.ContinueWatching.profile_id == active_profile.id
    ).order_by(models.ContinueWatching.updated_at.desc()).all()

    seen_media = set()
    consolidated_cw = []
    for cw in cw_items:
        clean_id = cw.media_id.split('_s')[0].split('-s')[0].split('_')[0].strip()
        if cw.progress_percent >= 90.0 or clean_id in dismissed_set:
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
    reviews_with_profiles = (
        db.query(models.Review, models.Profile.name)
        .outerjoin(models.Profile, models.Review.profile_id == models.Profile.id)
        .filter(models.Review.media_id == media_id)
        .order_by(models.Review.created_at.desc())
        .all()
    )
    results = []
    for r, prof_name in reviews_with_profiles:
        r.profile_name = prof_name or "Anonymous"
        results.append(r)
    return results
