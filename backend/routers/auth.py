from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from ..database import get_db
from .. import models, schemas, auth

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if this is the first user, make them admin
    user_count = db.query(models.User).count()
    is_admin = user_count == 0

    hashed_password = auth.get_password_hash(user_data.password)
    new_user = models.User(
        email=user_data.email,
        hashed_password=hashed_password,
        is_admin=is_admin
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Automatically create a primary profile for the user
    primary_profile = models.Profile(
        user_id=new_user.id,
        name="Primary Profile",
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256&h=256"
    )
    db.add(primary_profile)
    db.commit()
    db.refresh(primary_profile)

    # Set up settings for the primary profile
    default_settings = models.Setting(profile_id=primary_profile.id)
    db.add(default_settings)
    db.commit()

    return new_user

@router.post("/login", response_model=schemas.Token)
def login(response: Response, login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or not auth.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": user.email})
    
    # Store token in cookie
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        max_age=86400, # 1 day
        samesite="lax",
        secure=False  # Set to True in production
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "is_admin": user.is_admin
    }

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("profile_id")
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@router.get("/profiles", response_model=List[schemas.ProfileResponse])
def get_profiles(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    profiles = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).all()
    return profiles

@router.post("/profiles", response_model=schemas.ProfileResponse)
def create_profile(
    profile_data: schemas.ProfileCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    profile_count = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).count()
    if profile_count >= 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum of 4 profiles reached"
        )
        
    new_profile = models.Profile(
        user_id=current_user.id,
        name=profile_data.name,
        avatar_url=profile_data.avatar_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256&h=256"
    )
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)

    # Set up settings for the new profile
    default_settings = models.Setting(profile_id=new_profile.id)
    db.add(default_settings)
    db.commit()

    return new_profile

@router.delete("/profiles/{profile_id}")
def delete_profile(
    profile_id: UUID,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(models.Profile).filter(
        models.Profile.id == profile_id,
        models.Profile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
        
    db.delete(profile)
    db.commit()
    return {"message": "Profile deleted successfully"}

@router.get("/settings", response_model=schemas.SettingResponse)
def get_settings(
    active_profile: models.Profile = Depends(auth.get_active_profile),
    db: Session = Depends(get_db)
):
    settings = db.query(models.Setting).filter(models.Setting.profile_id == active_profile.id).first()
    if not settings:
        settings = models.Setting(profile_id=active_profile.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("/settings", response_model=schemas.SettingResponse)
def update_settings(
    settings_data: schemas.SettingUpdate,
    active_profile: models.Profile = Depends(auth.get_active_profile),
    db: Session = Depends(get_db)
):
    settings = db.query(models.Setting).filter(models.Setting.profile_id == active_profile.id).first()
    if not settings:
        settings = models.Setting(profile_id=active_profile.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    for key, value in settings_data.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)
        
    db.commit()
    db.refresh(settings)
    return settings
