from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from database import get_db
import models
import auth
import schemas
from services.ai_service import search_semantic_media, get_ai_recommendations
from services.tmdb_service import tmdb_client

router = APIRouter(prefix="/ai", tags=["ai"])

@router.get("/search")
async def semantic_search(
    query: str = Query(..., description="The natural language query, e.g. 'mind bending space movies'"),
    limit: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db)
):
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty")
        
    # Get vector hits
    hits = await search_semantic_media(db, query, limit)
    
    # Enrich hit objects with TMDB detail data (e.g. posters, ratings) for client display
    enriched_results = []
    for hit in hits:
        try:
            details = await tmdb_client.get_details(hit["media_type"], hit["media_id"])
            enriched_results.append({
                "id": hit["media_id"],
                "media_type": hit["media_type"],
                "title": details.get("title") or details.get("name"),
                "overview": details.get("overview"),
                "backdrop_path": details.get("backdrop_path"),
                "poster_path": details.get("poster_path"),
                "vote_average": details.get("vote_average"),
                "release_date": details.get("release_date") or details.get("first_air_date"),
                "score": hit["score"]
            })
        except Exception:
            # Fallback to bare details
            enriched_results.append({
                "id": hit["media_id"],
                "media_type": hit["media_type"],
                "title": hit["title"],
                "overview": hit["description"],
                "score": hit["score"]
            })
            
    return enriched_results

@router.get("/recommendations")
async def personalized_recommendations(
    limit: int = Query(12, ge=1, le=50),
    active_profile: models.Profile = Depends(auth.get_active_profile),
    db: Session = Depends(get_db)
):
    hits = await get_ai_recommendations(db, active_profile.id, limit)
    
    # Enrich recommendations
    enriched_results = []
    for hit in hits:
        try:
            details = await tmdb_client.get_details(hit["media_type"], hit["media_id"])
            enriched_results.append({
                "id": hit["media_id"],
                "media_type": hit["media_type"],
                "title": details.get("title") or details.get("name"),
                "overview": details.get("overview"),
                "backdrop_path": details.get("backdrop_path"),
                "poster_path": details.get("poster_path"),
                "vote_average": details.get("vote_average"),
                "release_date": details.get("release_date") or details.get("first_air_date"),
                "score": hit["score"]
            })
        except Exception:
            enriched_results.append({
                "id": hit["media_id"],
                "media_type": hit["media_type"],
                "title": hit["title"],
                "overview": hit["description"],
                "score": hit["score"]
            })
            
    return enriched_results
