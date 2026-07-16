from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from uuid import UUID

from .config import settings
from .database import get_db
from . import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def get_current_user_from_token(token: str, db: Session) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    # 1. Try checking for Authorization header first
    # 2. Try checking for cookies if header isn't present
    actual_token = token
    if not actual_token:
        actual_token = request.cookies.get("access_token")
        if actual_token and actual_token.startswith("Bearer "):
            actual_token = actual_token.replace("Bearer ", "")
            
    if not actual_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return get_current_user_from_token(actual_token, db)

def get_current_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

def get_active_profile(
    request: Request,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> models.Profile:
    # We can retrieve profile_id from cookies or headers
    profile_id_str = request.headers.get("X-Profile-ID") or request.cookies.get("profile_id")
    
    if not profile_id_str:
        # Fallback: get the first profile of the user
        profile = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).first()
        if not profile:
            # Create a default profile if none exists
            profile = models.Profile(
                user_id=current_user.id,
                name="Primary Profile",
                avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256&h=256"
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
            
            # Setup default settings for the profile
            settings_obj = models.Setting(profile_id=profile.id)
            db.add(settings_obj)
            db.commit()
        return profile
    
    try:
        profile_uuid = UUID(profile_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Profile ID format"
        )
        
    profile = db.query(models.Profile).filter(
        models.Profile.id == profile_uuid,
        models.Profile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    return profile
