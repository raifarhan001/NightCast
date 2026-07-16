from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from ..database import get_db
from .. import models, schemas, auth

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
