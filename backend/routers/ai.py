import asyncio
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

async def _enrich_hit(hit: Dict[str, Any]) -> Dict[str, Any]:
    try:
        details = await tmdb_client.get_details(hit["media_type"], hit["media_id"])
        return {
            "id": hit["media_id"],
            "media_type": hit["media_type"],
            "title": details.get("title") or details.get("name") or hit.get("title"),
            "overview": details.get("overview") or hit.get("description"),
            "backdrop_path": details.get("backdrop_path"),
            "poster_path": details.get("poster_path"),
            "vote_average": details.get("vote_average"),
            "release_date": details.get("release_date") or details.get("first_air_date"),
            "score": hit.get("score", 0.0)
        }
    except Exception:
        return {
            "id": hit["media_id"],
            "media_type": hit["media_type"],
            "title": hit.get("title", ""),
            "overview": hit.get("description", ""),
            "score": hit.get("score", 0.0)
        }

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
    
    # Enrich hit objects concurrently in parallel using asyncio.gather
    enriched_results = await asyncio.gather(*[_enrich_hit(hit) for hit in hits])
    return list(enriched_results)

@router.get("/recommendations")
async def personalized_recommendations(
    limit: int = Query(12, ge=1, le=50),
    active_profile: models.Profile = Depends(auth.get_active_profile),
    db: Session = Depends(get_db)
):
    hits = await get_ai_recommendations(db, active_profile.id, limit)
    
    # Enrich recommendations concurrently in parallel using asyncio.gather
    enriched_results = await asyncio.gather(*[_enrich_hit(hit) for hit in hits])
    return list(enriched_results)
