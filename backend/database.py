import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

logger = logging.getLogger("vidking_database")

DATABASE_URL = settings.DATABASE_URL
is_sqlite = False

try:
    if "postgresql" in DATABASE_URL:
        # Probe postgres connection
        probe_engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 2})
        with probe_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        engine = create_engine(
            DATABASE_URL,
            pool_size=20,
            max_overflow=10,
            pool_pre_ping=True
        )
        logger.info("Connected to PostgreSQL successfully.")
    else:
        is_sqlite = True
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
except Exception as e:
    logger.warning(f"PostgreSQL connection failed: {e}. Falling back to SQLite.")
    DATABASE_URL = "sqlite:///./vidking.db"
    is_sqlite = True
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    if not is_sqlite:
        try:
            with engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                conn.commit()
        except Exception as e:
            logger.warning(f"Could not enable pgvector: {e}")
    Base.metadata.create_all(bind=engine)

