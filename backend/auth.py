from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
import jwt
import bcrypt
from sqlalchemy.orm import Session
from uuid import UUID

from config import settings
from database import get_db
import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

from sqlalchemy import func

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        clean_pwd = plain_password.strip()
        pwd_bytes = clean_pwd.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8") if isinstance(hashed_password, str) else hashed_password
        if bcrypt.checkpw(pwd_bytes, hash_bytes):
            return True
        # Handle trailing period tolerance (e.g. crown1999 vs crown1999.)
        if clean_pwd.endswith("."):
            alt_bytes = clean_pwd[:-1].encode("utf-8")[:72]
            if bcrypt.checkpw(alt_bytes, hash_bytes):
                return True
        else:
            alt_bytes = (clean_pwd + ".").encode("utf-8")[:72]
            if bcrypt.checkpw(alt_bytes, hash_bytes):
                return True
        return False
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = password.strip().encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

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
    
    clean_email = email.strip().lower()
    user = db.query(models.User).filter(func.lower(models.User.email) == clean_email).first()
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
