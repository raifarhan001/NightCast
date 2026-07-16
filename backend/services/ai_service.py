import logging
import numpy as np
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any, Optional

from ..config import settings
from .. import models
from .tmdb_service import MOCK_MOVIES, MOCK_TV
from ..database import is_sqlite


logger = logging.getLogger("vidking_ai")

# 384-dimensional vocabulary mapping for local offline semantic search
VOCABULARY = [
    "space", "interstellar", "galaxy", "universe", "time", "astronaut", "nasa", "wormhole", "physics", "sci-fi",
    "science", "fiction", "mars", "alien", "star", "planet", "future", "futuristic", "apocalypse", "earth",
    "dune", "desert", "spice", "sand", "empire", "messiah", "prophecy", "war", "battle", "combat",
    "nuclear", "atomic", "bomb", "oppenheimer", "physicist", "history", "biography", "warfare", "military", "weapon",
    "creature", "monster", "vampire", "horror", "scary", "ghost", "dark", "supernatural", "mystery", "detective",
    "murder", "crime", "police", "sheriff", "school", "academy", "boarding", "magic", "gothic", "spooky",
    "family", "media", "empire", "billionaire", "corporate", "succession", "power", "money", "greed", "business",
    "sibling", "rivalry", "father", "son", "daughter", "office", "work", "job", "memory", "severance",
    "corporation", "surgical", "division", "work-life", "balance", "conspiracy", "thriller", "suspense", "mind", "bending",
    "inception", "dream", "subconscious", "heist", "maze", "reality", "illusion", " Nolan ", " Villeneuve ", " Burton ",
    "action", "adventure", "drama", "comedy", "romance", "fantasy", "superhero", "marvel", "avengers", "endgame"
]

# Ensure the vocab list has exactly 384 words (pad if needed)
while len(VOCABULARY) < 384:
    VOCABULARY.append(f"pad_keyword_{len(VOCABULARY)}")

VOCAB_MAP = {word.lower().strip(): idx for idx, word in enumerate(VOCABULARY)}

def get_local_embedding(text_content: str) -> List[float]:
    """
    Produces a 384-dimensional vector based on vocabulary term weights
    and TF-IDF like representation. Smooths and normalizes the vector.
    """
    text_lower = text_content.lower()
    vector = np.zeros(384, dtype=float)
    
    # Calculate word hits
    for word, idx in VOCAB_MAP.items():
        count = text_lower.count(word)
        if count > 0:
            # log-scale weight + higher weight for exact boundary matches
            vector[idx] = 1.0 + np.log(count)
            if f" {word} " in f" {text_lower} ":
                vector[idx] += 0.5
                
    # L2 Normalization
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector = vector / norm
        
    return vector.tolist()

async def get_openai_embedding(text_content: str) -> Optional[List[float]]:
    if not settings.OPENAI_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}
            payload = {
                "input": text_content,
                "model": "text-embedding-3-small"
            }
            res = await client.post("https://api.openai.com/v1/embeddings", json=payload, headers=headers)
            res.raise_for_status()
            emb = res.json()["data"][0]["embedding"]
            # project 1536 OpenAI embedding to 384 dimensions to match DB columns
            # using simple slicing/pooling
            projected = []
            for i in range(384):
                # average 4 components
                projected.append(sum(emb[i*4:(i+1)*4]) / 4.0)
            # Normalize projected vector
            arr = np.array(projected)
            norm = np.linalg.norm(arr)
            if norm > 0:
                arr = arr / norm
            return arr.tolist()
    except Exception as e:
        logger.error(f"OpenAI embedding retrieval failed: {e}")
        return None

async def get_embedding(text_content: str) -> List[float]:
    emb = await get_openai_embedding(text_content)
    if emb is not None:
        return emb
    return get_local_embedding(text_content)

def local_cosine_similarity(query_vector: List[float], metadata_list: List[models.SemanticMetadata], limit: int) -> List[Dict[str, Any]]:
    hits = []
    q_arr = np.array(query_vector)
    norm_q = np.linalg.norm(q_arr)
    if norm_q == 0:
        norm_q = 1.0
        
    for item in metadata_list:
        emb_val = item.embedding
        if not emb_val:
            continue
            
        if isinstance(emb_val, str):
            try:
                val_str = emb_val.strip()
                if val_str.startswith('['):
                    val_str = val_str[1:]
                if val_str.endswith(']'):
                    val_str = val_str[:-1]
                emb_list = [float(x) for x in val_str.split(',') if x.strip()]
                e_arr = np.array(emb_list)
            except Exception as e:
                logger.error(f"Failed parsing local sqlite embedding string: {e}")
                continue
        else:
            try:
                e_arr = np.array(emb_val)
            except:
                continue
                
        norm_e = np.linalg.norm(e_arr)
        if norm_e == 0:
            norm_e = 1.0
            
        dot = np.dot(q_arr, e_arr)
        similarity = dot / (norm_q * norm_e)
        distance = float(1.0 - similarity)
        
        hits.append({
            "media_id": item.media_id,
            "media_type": item.media_type,
            "title": item.title,
            "description": item.description,
            "distance": distance
        })
        
    hits = sorted(hits, key=lambda x: x["distance"])[:limit]
    return hits

async def search_semantic_media(db: Session, query: str, limit: int = 12) -> List[Dict[str, Any]]:
    query_vector = await get_embedding(query)
    
    if is_sqlite:
        all_meta = db.query(models.SemanticMetadata).all()
        results = local_cosine_similarity(query_vector, all_meta, limit)
        hits = []
        for r in results:
            hits.append({
                "media_id": r["media_id"],
                "media_type": r["media_type"],
                "title": r["title"],
                "description": r["description"],
                "score": float(1.0 - r["distance"])
            })
        return hits
    
    # Direct SQL query using pgvector distance operator <=>
    sql = text(
        """
        SELECT media_id, media_type, title, description, (embedding <=> :vector) as distance
        FROM semantic_metadata
        ORDER BY distance ASC
        LIMIT :limit
        """
    )
    # Convert query vector to string format for Postgres vector type
    vector_str = "[" + ",".join(map(str, query_vector)) + "]"
    
    results = db.execute(sql, {"vector": vector_str, "limit": limit}).fetchall()
    
    hits = []
    for r in results:
        hits.append({
            "media_id": r.media_id,
            "media_type": r.media_type,
            "title": r.title,
            "description": r.description,
            "score": float(1.0 - r.distance)  # Cosine similarity
        })
    return hits

async def ingest_media_metadata(db: Session, media_id: str, media_type: str, title: str, overview: str, genres: List[str]):
    description = f"Title: {title}. Overview: {overview}. Genres: {', '.join(genres)}."
    vector = await get_embedding(description)
    
    existing = db.query(models.SemanticMetadata).filter(
        models.SemanticMetadata.media_id == str(media_id),
        models.SemanticMetadata.media_type == media_type
    ).first()
    
    if existing:
        existing.title = title
        existing.description = description
        existing.embedding = vector
    else:
        new_meta = models.SemanticMetadata(
            media_id=str(media_id),
            media_type=media_type,
            title=title,
            description=description,
            embedding=vector
        )
        db.add(new_meta)
    db.commit()


async def populate_mock_embeddings(db: Session):
    """Pre-populates the vector index with mock catalog items so semantic search is instantly live."""
    try:
        for m_id, m in MOCK_MOVIES.items():
            genres = [g["name"] for g in m.get("genres", [])]
            await ingest_media_metadata(db, str(m["id"]), "movie", m["title"], m["overview"], genres)
        for t_id, t in MOCK_TV.items():
            genres = [g["name"] for g in t.get("genres", [])]
            await ingest_media_metadata(db, str(t["id"]), "tv", t["name"], t["overview"], genres)
        logger.info("Successfully pre-populated vector database.")
    except Exception as e:
        logger.error(f"Failed to pre-populate database: {e}")

async def get_ai_recommendations(db: Session, profile_id: str, limit: int = 12) -> List[Dict[str, Any]]:
    """
    Builds profile-oriented semantic matches.
    It compiles a user profile embedding based on their history and favorites,
    then queries pgvector for matching movies/TV.
    """
    # 1. Fetch profile favorites
    favorites = db.query(models.Favorite).filter(models.Favorite.profile_id == profile_id).all()
    # 2. Fetch profile watch history
    history = db.query(models.WatchHistory).filter(models.WatchHistory.profile_id == profile_id).limit(10).all()
    
    if not favorites and not history:
        # No preferences loaded yet - return default semantic matches for "popular space mind bending"
        return await search_semantic_media(db, "space movie Christopher Nolan Mind-Bending", limit)

    # 3. Create profile description string
    pref_texts = []
    for f in favorites:
        pref_texts.append(f"Favorite: {f.title}")
    for h in history:
        pref_texts.append(f"Watched: {h.title}")
        
    profile_summary = ". ".join(pref_texts)
    profile_vector = await get_embedding(profile_summary)
    
    # 4. Find closest titles in pgvector store
    if is_sqlite:
        all_meta = db.query(models.SemanticMetadata).all()
        results = local_cosine_similarity(profile_vector, all_meta, limit)
        recs = []
        for r in results:
            recs.append({
                "media_id": r["media_id"],
                "media_type": r["media_type"],
                "title": r["title"],
                "description": r["description"],
                "score": float(1.0 - r["distance"])
            })
        return recs

    sql = text(
        """
        SELECT media_id, media_type, title, description, (embedding <=> :vector) as distance
        FROM semantic_metadata
        ORDER BY distance ASC
        LIMIT :limit
        """
    )
    vector_str = "[" + ",".join(map(str, profile_vector)) + "]"
    results = db.execute(sql, {"vector": vector_str, "limit": limit}).fetchall()
    
    recs = []
    for r in results:
        recs.append({
            "media_id": r.media_id,
            "media_type": r.media_type,
            "title": r.title,
            "description": r.description,
            "score": float(1.0 - r.distance)
        })
    return recs

